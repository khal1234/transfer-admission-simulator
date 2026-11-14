/**
 * 열어 둔 화면이 지금 올라가 있는 판보다 옛 판인지 가린다.
 *
 * 재는 것: 이 화면을 만든 빌드 시각(__BUILD_ID__)과 서버의 /version.json 에 적힌 빌드 시각.
 * 문턱: 서버 쪽이 더 나중이면 옛 판. 같거나 서버가 더 앞이면(배포가 퍼지는 몇 초) 그대로 둔다.
 * 못 보는 것: version.json 이 없던 때의 판(이 기능이 들어가기 전에 열어 둔 화면)은 스스로 알아채지 못한다.
 */
export type StaleAction = "none" | "reload" | "notify";

export function parseBuildId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;

  const buildId = (payload as { buildId?: unknown }).buildId;
  return typeof buildId === "string" && !Number.isNaN(Date.parse(buildId)) ? buildId : null;
}

/**
 * 막 들어온 화면이 옛 판이면 한 번만 스스로 새로 고친다(아직 아무것도 하지 않았으니 잃을 것이 없다).
 * 같은 판을 두고 이미 한 번 새로 고쳤는데도 옛 판이면 되풀이하지 않고 알림만 띄운다.
 * 쓰던 중에 새 판이 올라온 경우도 알림만 띄운다 — 보던 자리와 펼쳐 둔 것을 말없이 날리지 않는다.
 */
export function decideStaleAction({
  currentBuildId,
  latestBuildId,
  isFirstCheck,
  reloadedForBuildId,
}: {
  currentBuildId: string;
  latestBuildId: string | null;
  isFirstCheck: boolean;
  reloadedForBuildId: string | null;
}): StaleAction {
  if (latestBuildId === null || Date.parse(latestBuildId) <= Date.parse(currentBuildId)) {
    return "none";
  }

  return isFirstCheck && reloadedForBuildId !== latestBuildId ? "reload" : "notify";
}
