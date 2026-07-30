export const STORAGE_KEYS = {
  toeic: "t27_toeic",
  gpaType: "t27_gpa_type",
  gpaRaw: "t27_gpa_raw",
  gpa100: "t27_gpa_100",
  targets: "t27_targets",
  theme: "t27_theme",
} as const;

export type SimulatorStorageKey =
  typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export type SimulatorStorageSnapshot = {
  available: boolean;
  values: Record<SimulatorStorageKey, string | null>;
};

function createEmptyValues(): Record<SimulatorStorageKey, null> {
  return {
    [STORAGE_KEYS.toeic]: null,
    [STORAGE_KEYS.gpaType]: null,
    [STORAGE_KEYS.gpaRaw]: null,
    [STORAGE_KEYS.gpa100]: null,
    [STORAGE_KEYS.targets]: null,
    [STORAGE_KEYS.theme]: null,
  };
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSimulatorStorageSnapshot(
  storage: StorageLike | null = getBrowserStorage(),
): SimulatorStorageSnapshot {
  if (storage === null) {
    return {
      available: false,
      values: createEmptyValues(),
    };
  }

  try {
    return {
      available: true,
      values: {
        [STORAGE_KEYS.toeic]: storage.getItem(STORAGE_KEYS.toeic),
        [STORAGE_KEYS.gpaType]: storage.getItem(STORAGE_KEYS.gpaType),
        [STORAGE_KEYS.gpaRaw]: storage.getItem(STORAGE_KEYS.gpaRaw),
        [STORAGE_KEYS.gpa100]: storage.getItem(STORAGE_KEYS.gpa100),
        [STORAGE_KEYS.targets]: storage.getItem(STORAGE_KEYS.targets),
        [STORAGE_KEYS.theme]: storage.getItem(STORAGE_KEYS.theme),
      },
    };
  } catch {
    return {
      available: false,
      values: createEmptyValues(),
    };
  }
}

export function writeSimulatorStorageValue(
  key: SimulatorStorageKey,
  value: string,
  storage: StorageLike | null = getBrowserStorage(),
): boolean {
  if (storage === null) {
    return false;
  }

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
