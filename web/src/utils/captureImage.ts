/** 화면의 한 덩어리(지망 장바구니)를 PNG 사진으로 만든다. */

/** 찍는 동안 대상에 붙는 표시. index.css 가 이 표시로 단추를 숨기고 사진용 한 줄을 보인다. */
export const CAPTURING_CLASS = "is-capturing";

/**
 * 사진 한 장의 넓이 상한(픽셀).
 * 문턱과 근거: 아이폰 사파리는 캔버스 넓이가 약 1,677만 픽셀을 넘으면 빈 그림을 낸다. 여유를 두고 1,200만으로 잡는다.
 * 못 보는 것: 기기마다 다른 실제 상한. 넘으면 사진이 비어 나오므로 선명도를 낮춰서라도 아래에 둔다.
 */
const MAX_CANVAS_AREA = 12_000_000;

/** 사진 선명도 배율. 보통 2배로 찍고, 지망이 많아 사진이 길면 상한 안에 들도록 낮춘다. */
export function capturePixelRatio(width: number, height: number, devicePixelRatio: number): number {
  const wanted = Math.min(Math.max(devicePixelRatio, 2), 3);
  const area = width * height;

  if (!(area > 0)) {
    return wanted;
  }

  return Math.max(0.5, Math.min(wanted, Math.sqrt(MAX_CANVAS_AREA / area)));
}

const pad = (value: number) => String(value).padStart(2, "0");

export function captureFileName(date: Date): string {
  return `편입-지망-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.png`;
}

export function formatCaptureDate(date: Date): string {
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
}

const nextFrame = () => new Promise<void>((resolve) => {
  window.requestAnimationFrame(() => resolve());
});

/** 대상이 투명하면 바깥으로 올라가며 실제로 보이는 배경색을 찾는다. */
function resolveBackground(node: HTMLElement): string {
  let current: HTMLElement | null = node;

  while (current !== null) {
    const color = window.getComputedStyle(current).backgroundColor;

    if (color !== "" && color !== "transparent" && color !== "rgba(0, 0, 0, 0)") {
      return color;
    }
    current = current.parentElement;
  }

  return "#ffffff";
}

const isSafari = () => /^((?!chrome|android|crios|fxios).)*safari/i.test(window.navigator.userAgent);

/**
 * 대상 요소를 PNG 로 만든다. 화면에 보이는 모양 그대로 찍되, 찍는 동안만 CAPTURING_CLASS 를 붙인다.
 * 못 보는 것: 다른 출처에서 온 그림은 브라우저가 막아 빈칸으로 찍힌다(이 사이트의 대학 로고는 같은 출처다).
 */
export async function captureElement(node: HTMLElement): Promise<Blob> {
  // 화면을 그림으로 바꾸는 코드는 누를 때만 받는다 — 첫 화면을 무겁게 하지 않는다.
  const { toBlob } = await import("html-to-image");

  node.classList.add(CAPTURING_CLASS);
  try {
    // 표시가 붙은 모양으로 다시 그려진 뒤에 찍는다.
    await nextFrame();
    await nextFrame();

    const rect = node.getBoundingClientRect();
    const options = {
      pixelRatio: capturePixelRatio(rect.width, rect.height, window.devicePixelRatio),
      backgroundColor: resolveBackground(node),
      skipFonts: true,
      style: { margin: "0" },
    };

    // 사파리는 첫 번째로 만든 그림에 로고가 빠지는 일이 알려져 있어, 한 번 만들어 버리고 다시 만든다.
    if (isSafari()) {
      await toBlob(node, options);
    }

    const blob = await toBlob(node, options);

    if (blob === null) {
      throw new Error("사진을 만들지 못했습니다.");
    }

    return blob;
  } finally {
    node.classList.remove(CAPTURING_CLASS);
  }
}

/**
 * 폰에서 «공유» 창으로 사진을 넘길 수 있나. 넘길 수 있으면 사진 저장 창에 «공유» 단추를 보인다.
 * PC 도 파일 공유를 지원하지만 거기서는 내려받기가 익숙하므로, 손가락으로 쓰는 기기에서만 켠다.
 */
export function canShareImageFile(file: File): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
    return false;
  }
  if (typeof window === "undefined" || !window.matchMedia("(pointer: coarse)").matches) {
    return false;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}
