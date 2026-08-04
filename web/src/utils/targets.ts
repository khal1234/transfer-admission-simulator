export type Target = {
  univ: string;
  dept: string;
};

/** 합격/불합 판정을 최근 3개년 중 어느 해에 걸지. */
const COMPARISON_BASES = ["latest", "lowest", "highest"] as const;
export type ComparisonBasis = typeof COMPARISON_BASES[number];

export function isComparisonBasis(
  value: string | null,
): value is ComparisonBasis {
  return value !== null
    && (COMPARISON_BASES as readonly string[]).includes(value);
}

export function getRecordKey(univ: string, dept: string): string {
  return `${univ}:::${dept}`;
}

export function getTargetKey(target: Target): string {
  return getRecordKey(target.univ, target.dept);
}

function isTarget(value: unknown): value is Target {
  return (
    typeof value === "object" &&
    value !== null &&
    "univ" in value &&
    "dept" in value &&
    typeof value.univ === "string" &&
    typeof value.dept === "string"
  );
}

export function parseSavedTargets(
  saved: string | null,
  validTargetKeys: ReadonlySet<string>,
  defaultTargets: readonly Target[]
): Target[] {
  const sanitizeTargets = (targets: readonly Target[]): Target[] => {
    const seen = new Set<string>();

    return targets.filter((target) => {
      const key = getTargetKey(target);
      if (!validTargetKeys.has(key) || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  };

  if (!saved) {
    return sanitizeTargets(defaultTargets);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    return sanitizeTargets(defaultTargets);
  }

  if (!Array.isArray(parsed) || !parsed.every(isTarget)) {
    return sanitizeTargets(defaultTargets);
  }

  return sanitizeTargets(parsed);
}
