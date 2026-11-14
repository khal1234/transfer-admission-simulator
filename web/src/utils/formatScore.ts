/**
 * 화면에 내는 환산점수의 자릿수를 하나로 맞춘다 — 소수 둘째 자리까지.
 * 부경대만 계산을 넷째 자리까지 해서 「267.7171」처럼 혼자 길게 나왔다
 * (2026-11-14 검토 21번). 계산값은 그대로 두고 표시만 줄인다.
 */
export function formatScore(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function formatSignedScore(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded >= 0 ? `+${rounded}` : String(rounded);
}
