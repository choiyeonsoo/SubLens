import { type RefObject, useEffect } from "react";

/**
 * ref 영역 바깥을 클릭하면 onClose를 호출합니다.
 * enabled가 false이면 리스너를 등록하지 않습니다. (기본값: true)
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose, enabled]);
}
