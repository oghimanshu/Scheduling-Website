import { RefObject, useEffect } from 'react';

/**
 * useScrollIsolation
 *
 * Toggles `data-lenis-prevent` on a scrollable container based on pointer hover.
 * When the pointer enters the element, Lenis yields scroll control to the element
 * so native wheel events work. When the pointer leaves, Lenis resumes.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useScrollIsolation(ref);
 *   return <div ref={ref} className="overflow-y-auto">...</div>;
 */
export function useScrollIsolation(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.setAttribute('data-scroll-isolated', 'true');

    return () => {
      el.removeAttribute('data-scroll-isolated');
    };
  }, [ref]);
}
