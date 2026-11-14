/**
 * 나눠 받는 조각 파일(차트 등)을 못 받아서 난 오류인지 가린다.
 *
 * 무엇을 재나: 오류 글이 브라우저가 «모듈을 못 받았다»고 할 때 쓰는 문구인가(크롬·엣지, 파이어폭스, 사파리, Vite).
 * 문턱과 근거: 새로 배포하면 조각 파일 이름이 바뀐다. 그 전에 열어 둔 탭은 옛 이름을 찾다 404 를 받고,
 *   새로 고치면 풀린다(2026-11-15 미리보기에서 재현). 연결이 끊겼을 때도 같은 문구가 나온다.
 * 못 보는 것: 문구가 다른 브라우저. 그때는 일반 오류 안내가 나온다.
 */
const CHUNK_LOAD_ERROR = /dynamically imported module|Importing a module script failed|Unable to preload/i;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return CHUNK_LOAD_ERROR.test(message);
}
