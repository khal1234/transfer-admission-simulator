import json
import re
import threading
import time
import pandas as pd
import pdfplumber
from openai import OpenAI

API_KEY = "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"
client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=API_KEY)

# Llama-3.1-8b 모델 맞춤형 초정밀 가이드라인 프롬프트
# extract.py 파일 상단의 프롬프트 부분 수정

# 💡 8B 모델의 흐려진 초점을 딱 잡아줄 초정밀 컬럼 순서 자물쇠 프롬프트
SCHEMA_PROMPT_HEAD = """
다음은 대학 편입 성적 데이터의 일부 페이지 원본이야. 지시사항을 철저히 지켜서 순수 JSON 배열만 출력해줘.
텍스트 빽틱(```json)이나 불필요한 설명은 절대로 붙이지 마.

컬럼 매핑 규칙 (왼쪽에서 오른쪽 순서대로 매칭해):
1. 학과: '모집단위' 컬럼에 적힌 학과명을 정확히 추출해. (예: 국어국문학과)
2. 모집인원: '모집단위' 바로 오른쪽에 나오는 첫 번째 숫자 (모집인원)를 정확히 적어줘. (예: 국어국문학과는 5)
3. 지원인원: '모집인원' 오른쪽에 나오는 두 번째 숫자 (지원인원)를 적어줘. 모집인원 숫자와 절대 혼동하지 마. (예: 국어국문학과는 16)
4. 합격인원: '지원인원' 오른쪽에 나오는 세 번째 숫자이자 '입학인원' 컬럼의 숫자를 적어줘. (예: 국어국문학과는 5)
5. 최종합격_토익환산점수: '공인영어' 컬럼에 적힌 점수(70~100 사이의 소수점 값)를 매핑해. 절대로 맨 끝에 있는 200점대 '총점'을 여기 넣으면 안 돼! (예: 국어국문학과는 90.3)
6. 최종합격_학점환산점수: '전적대학성적' 컬럼에 적힌 점수(30~50 사이의 소수점 값)를 정확히 매핑해. (예: 국어국문학과는 48.82)

반드시 아래 스키마 구조로만 응답해:
[
  {
    "대학명": "경북대학교",
    "연도": "2024",
    "학과": string,
    "모집인원": number,
    "지원인원": number,
    "합격인원": number,
    "최종합격_토익환산점수": number,
    "최종합격_학점환산점수": number
  }
]

주의사항:
- '일반편입' 데이터만 추출하고, '학사편입'은 무조건 제외해.
- 각 객체와 객체 사이에는 쉼표(,)를 절대 빼먹지 말고 올바른 JSON 문법을 유지해.
원본 데이터:
"""


def extract_page_data(page_text, page_num):
    prompt = SCHEMA_PROMPT_HEAD + page_text

    full_result = ""
    start_time = time.time()
    status = {"chars": 0, "done": False, "started": False}

    def progress_timer():
        while not status["done"]:
            elapsed = int(time.time() - start_time)
            if not status["started"]:
                print(
                    f"\r📄 {page_num}페이지 연결 중... (경과: {elapsed}초 | 🌐 NVIDIA 서버 응답 대기 중)",
                    end="",
                    flush=True,
                )
            else:
                print(
                    f"\r📄 {page_num}페이지 분석 중... (경과: {elapsed}초 | 🔤 수신: {status['chars']:,}자)",
                    end="",
                    flush=True,
                )
            time.sleep(0.5)

    timer_thread = threading.Thread(target=progress_timer)
    timer_thread.start()

    try:
        response = client.chat.completions.create(
            model="meta/llama-3.1-8b-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=4000,  # 💡 페이지당 토큰을 4000으로 늘려서 대용량 페이지 끊김 방지
            timeout=90,
            stream=True,
        )

        status["started"] = True

        for chunk in response:
            if chunk.choices:
                delta = chunk.choices[0].delta.content
                if delta:
                    full_result += delta
                    status["chars"] = len(full_result)
    finally:
        status["done"] = True
        timer_thread.join()

    full_result = re.sub(r"```[a-zA-Z]*", "", full_result).strip()
    return full_result


if __name__ == "__main__":
    print("1. PDF 파일 열기 및 페이지 분할 시작...")
    all_extracted_data = []

    with pdfplumber.open("data/24_경북대_성적.pdf") as pdf:
        total_pages = len(pdf.pages)
        print(f"2. PDF 로드 완료. 총 {total_pages}개의 페이지를 감지했습니다.")

        print("\n3. 페이지별 데이터 추출 파이썬 루프 가동...")
        for idx, page in enumerate(pdf.pages):
            page_num = idx + 1
            page_text = page.extract_text() or ""

            if not page_text.strip():
                continue

            page_json_str = extract_page_data(page_text, page_num)

            try:
                page_data = json.loads(page_json_str)
                if isinstance(page_data, list):
                    all_extracted_data.extend(page_data)
                    print(
                        f" -> ✅ {page_num}페이지 파싱 성공! (+{len(page_data)}개 학과 추가)"
                    )
                else:
                    print(f" -> ⚠️ {page_num}페이지 결과가 배열 형식이 아닙니다.")
            except Exception as e:
                print(
                    f" -> ❌ {page_num}페이지 파싱 실패 (JSON 오타 가능성): {e}"
                )

    print(
        f"\n4. 모든 페이지 추출 완료! 총 {len(all_extracted_data)}개 학과 데이터 수집됨."
    )

    with open("results/24_경북대.json", "w", encoding="utf-8") as f:
        json.dump(all_extracted_data, f, ensure_ascii=False, indent=2)
    print("5. 최종 JSON 파일 마감 완료: results/24_경북대.json")

    try:
        df = pd.DataFrame(all_extracted_data)
        df.to_excel("results/24_경북대_검증용.xlsx", index=False)
        print("6. 검증용 통합 엑셀 파일 생성 성공: results/24_경북대_검증용.xlsx")

        print("\n📊 [최종 데이터 프리뷰]")
        print(df.head(5).to_string(index=False))
    except Exception as e:
        print(f"\n⚠️ 최종 엑셀 변환 실패: {e}")