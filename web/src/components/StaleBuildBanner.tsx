import { useEffect, useState } from "react";
import { decideStaleAction, parseBuildId } from "../utils/staleBuild";

const RELOAD_MARK_KEY = "t27_reloaded_for_build";
// 탭으로 돌아올 때마다 묻되, 1분 안에 다시 묻지는 않는다.
const MIN_CHECK_GAP_MS = 60_000;

async function fetchLatestBuildId(): Promise<string | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    return response.ok ? parseBuildId(await response.json()) : null;
  } catch {
    // 경계: 네트워크가 끊겼거나 version.json 이 없는 판 — 알 수 없으면 그대로 둔다.
    return null;
  }
}

function readReloadMark(): string | null {
  try {
    return window.sessionStorage.getItem(RELOAD_MARK_KEY);
  } catch {
    return null;
  }
}

function writeReloadMark(buildId: string) {
  try {
    window.sessionStorage.setItem(RELOAD_MARK_KEY, buildId);
  } catch {
    // 경계: 저장소를 못 쓰는 브라우저 — 표시를 못 남기면 아래에서 새로 고치지 않는다.
  }
}

/**
 * 열어 둔 화면이 옛 판이면 알린다(2026-11-15 사용자 지적 — 배포해도 열어 둔 탭은 옛 판 그대로였다).
 * 막 들어온 화면이면 한 번 스스로 새로 고치고, 쓰던 중이면 위쪽에 «새로 고침» 띠를 띄운다.
 */
export default function StaleBuildBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (typeof __BUILD_ID__ !== "string") return;

    let isFirstCheck = true;
    let lastCheckedAt = 0;
    let disposed = false;

    const check = async () => {
      const now = Date.now();
      if (!isFirstCheck && now - lastCheckedAt < MIN_CHECK_GAP_MS) return;

      lastCheckedAt = now;
      const wasFirstCheck = isFirstCheck;
      isFirstCheck = false;

      const latestBuildId = await fetchLatestBuildId();
      if (disposed) return;

      const action = decideStaleAction({
        currentBuildId: __BUILD_ID__,
        latestBuildId,
        isFirstCheck: wasFirstCheck,
        reloadedForBuildId: readReloadMark(),
      });

      if (action === "reload" && latestBuildId !== null) {
        writeReloadMark(latestBuildId);
        // 표시가 남지 않았으면 새로 고침이 되풀이될 수 있으니 알림으로 돌린다.
        if (readReloadMark() === latestBuildId) {
          window.location.reload();
          return;
        }
      }
      if (action !== "none") setStale(true);
    };

    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    void check();
    document.addEventListener("visibilitychange", checkWhenVisible);
    window.addEventListener("pageshow", checkWhenVisible);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", checkWhenVisible);
      window.removeEventListener("pageshow", checkWhenVisible);
    };
  }, []);

  if (!stale) return null;

  return (
    <div className="stale-build-banner" role="status">
      <span>새 버전이 올라왔습니다. 지금 화면은 이전 판입니다.</span>
      <button type="button" onClick={() => window.location.reload()}>
        새로 고침
      </button>
    </div>
  );
}
