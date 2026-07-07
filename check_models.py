from openai import OpenAI

# 🔑 네 진짜 NVIDIA API 키를 넣어줘
API_KEY = "YOUR_NVIDIA_API_KEY"

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=API_KEY
)

print("🔍 NVIDIA 서버에서 현재 주문 가능한 메뉴판(모델 목록)을 가져오는 중...")

try:
    # NVIDIA가 내 키에 허용해준 모든 모델 리스트 조회
    models = client.models.list()
    
    print("\n📋 [사용 가능한 전체 모델 리스트]")
    print("-" * 50)
    
    # 가져온 모델 목록을 하나씩 출력
    for model in models.data:
        # 우리가 찾는 중간 체급(12B ~ 50B)이거나 코더 모델 위주로 쉽게 찾기 위한 가이드
        print(f"🔹 {model.id}")
        
    print("-" * 50)
    print("💡 팁: 위 목록에서 12b, 27b, 32b, 49b 등이 적힌 모델 이름이 바로 중간계 에이스들이야!")

except Exception as e:
    print(f"❌ 메뉴판을 가져오는데 실패했어: {e}")