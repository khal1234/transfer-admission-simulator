export function focusElement(element: Pick<HTMLElement, "focus" | "isConnected"> | null): boolean {
  if (element === null || !element.isConnected) {
    return false;
  }

  element.focus();
  return true;
}
