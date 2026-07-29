export type Target = {
  univ: string;
  dept: string;
};

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
  if (!saved) {
    return [...defaultTargets];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    return [...defaultTargets];
  }

  if (!Array.isArray(parsed) || !parsed.every(isTarget)) {
    return [...defaultTargets];
  }

  const seen = new Set<string>();
  return parsed.filter((target) => {
    const key = getTargetKey(target);
    if (!validTargetKeys.has(key) || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
