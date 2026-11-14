import type { SyntheticEvent } from "react";

/**
 * 좁은 화면의 지망 카드에서는 «근거 보기»와 «상세 분석»이 한 줄에 나란히 있고, 펼친 내용이
 * 그 아래에서 카드 폭 전체를 쓴다. 둘을 같이 펴 두면 단추 줄이 두 줄로 갈라지므로
 * 하나를 펴면 옆의 것을 접는다. 넓은 화면(900px 이상)은 각자 제 줄을 쓰므로 건드리지 않는다.
 */
export function closeSiblingDisclosureOnNarrow(event: SyntheticEvent<HTMLDetailsElement>) {
  const opened = event.currentTarget;
  if (!opened.open || !window.matchMedia("(max-width: 899px)").matches) return;

  for (const sibling of Array.from(opened.parentElement?.children ?? [])) {
    if (
      sibling !== opened
      && sibling instanceof HTMLDetailsElement
      && sibling.open
      && sibling.matches(".score-basis, .target-details")
    ) {
      sibling.open = false;
    }
  }
}
