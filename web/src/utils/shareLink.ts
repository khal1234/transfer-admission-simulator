import { isGpaType, type GpaType } from "./scoreInput";
import type { Target } from "./targets";

/**
 * 지망과 점수를 주소 끝(# 뒤)에 실어 남에게 보낸다.
 * # 뒤는 서버로 가지 않는다. 받은 쪽은 「이 구성으로 보기」를 눌러야 적용된다.
 */
export type SharedSetup = {
  toeic: string;
  gpaRaw: string;
  gpaType: GpaType;
  targets: Target[];
};

const PREFIX = "#s=";
const MAX_TARGETS = 30;

export function buildShareHash(setup: SharedSetup): string {
  const payload = {
    v: 1,
    t: setup.toeic,
    g: setup.gpaRaw,
    k: setup.gpaType,
    d: setup.targets.slice(0, MAX_TARGETS).map((target) => [target.univ, target.dept]),
  };
  return PREFIX + encodeURIComponent(JSON.stringify(payload));
}

export function parseShareHash(hash: string): SharedSetup | null {
  if (!hash.startsWith(PREFIX)) return null;

  try {
    const payload: unknown = JSON.parse(decodeURIComponent(hash.slice(PREFIX.length)));
    if (typeof payload !== "object" || payload === null) return null;
    const { v, t, g, k, d } = payload as Record<string, unknown>;
    if (v !== 1 || typeof t !== "string" || typeof g !== "string") return null;
    if (typeof k !== "string" || !isGpaType(k) || !Array.isArray(d)) return null;

    const targets = d.flatMap((entry): Target[] => (
      Array.isArray(entry)
        && typeof entry[0] === "string"
        && typeof entry[1] === "string"
        ? [{ univ: entry[0], dept: entry[1] }]
        : []
    )).slice(0, MAX_TARGETS);

    return { toeic: t.slice(0, 8), gpaRaw: g.slice(0, 8), gpaType: k, targets };
  } catch {
    return null;
  }
}
