import React, { createContext, useContext, useEffect, useState } from 'react';
import Lenis from 'lenis';

interface LenisContextType {
  lenis: Lenis | null;
  scrollTo: (target: string | number | HTMLElement, options?: Parameters<Lenis['scrollTo']>[1]) => void;
  scrollY: number;
  isScrolled: boolean;
}

const LenisContext = createContext<LenisContextType>({
  lenis: null,
  scrollTo: () => {},
  scrollY: 0,
  isScrolled: false,
});

/**
 * Universal Pointer-Aware Scroll Manager
 *
 * Traverses from the hovered element under the cursor up through its ancestors.
 * Detects if any ancestor container is scrollable and has remaining room in the
 * direction of the wheel event.
 */
function findScrollableContainer(
  target: EventTarget | null,
  deltaX: number,
  deltaY: number,
  isShiftKey: boolean = false
): { element: HTMLElement; axis: 'horizontal' | 'vertical' } | null {
  if (!target || !(target instanceof Element)) return null;

  let curr: Element | null = target;

  while (curr && curr !== document.body && curr !== document.documentElement) {
    if (curr instanceof HTMLElement) {
      const style = window.getComputedStyle(curr);
      const overflowY = style.overflowY;
      const overflowX = style.overflowX;

      const isScrollableY =
        (overflowY === 'auto' || overflowY === 'scroll') &&
        curr.scrollHeight > curr.clientHeight;

      const isScrollableX =
        (overflowX === 'auto' || overflowX === 'scroll') &&
        curr.scrollWidth > curr.clientWidth;

      // 1. If Shift is pressed, search for horizontal scroll room
      if (isShiftKey && isScrollableX && Math.abs(deltaX) > 0) {
        const canScrollRight = deltaX > 0 && curr.scrollLeft < curr.scrollWidth - curr.clientWidth - 1;
        const canScrollLeft = deltaX < 0 && curr.scrollLeft > 1;
        if (canScrollRight || canScrollLeft) {
          return { element: curr, axis: 'horizontal' };
        }
      }

      // 2. Standard horizontal check (native deltaX from trackpad or Shift+wheel)
      if (!isShiftKey && isScrollableX && Math.abs(deltaX) > 0) {
        const canScrollRight = deltaX > 0 && curr.scrollLeft < curr.scrollWidth - curr.clientWidth - 1;
        const canScrollLeft = deltaX < 0 && curr.scrollLeft > 1;
        if (canScrollRight || canScrollLeft) {
          return { element: curr, axis: 'horizontal' };
        }
      }

      // 3. Cursor-Aware Horizontal Scroll:
      // When hovering over an element that has horizontal overflow but NO vertical overflow
      // (e.g. date selector ribbon, session switcher, tab bar, wide preview table without vertical scroll),
      // directly scroll it horizontally with normal mouse wheel rolls without requiring Shift.
      if (!isShiftKey && !isScrollableY && isScrollableX && Math.abs(deltaY) > 0) {
        const canScrollRight = deltaY > 0 && curr.scrollLeft < curr.scrollWidth - curr.clientWidth - 1;
        const canScrollLeft = deltaY < 0 && curr.scrollLeft > 1;
        if (canScrollRight || canScrollLeft) {
          return { element: curr, axis: 'horizontal' };
        }
      }

      // 4. Vertical scroll room check (normal wheel in 2D container or vertical list)
      if (!isShiftKey && isScrollableY && Math.abs(deltaY) > 0) {
        const canScrollDown = deltaY > 0 && curr.scrollTop < curr.scrollHeight - curr.clientHeight - 1;
        const canScrollUp = deltaY < 0 && curr.scrollTop > 1;
        if (canScrollDown || canScrollUp) {
          return { element: curr, axis: 'vertical' };
        }
      }
    }
    curr = curr.parentElement;
  }

  return null;
}

export const LenisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      syncTouch: true,
      touchMultiplier: 1.15,
      allowNestedScroll: true,
    });

    setLenisInstance(lenis);

    lenis.on('scroll', (e: { scroll: number }) => {
      setScrollY(e.scroll);
      setIsScrolled(e.scroll > 20);
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Universal Pointer-Aware Wheel Dispatcher with Cursor-Aware auto-horizontal and Excel-mode Shift support
    const handlePointerAwareWheel = (e: WheelEvent) => {
      // Normalize wheel delta across line and page modes
      let deltaX = e.deltaX;
      let deltaY = e.deltaY;

      if (e.deltaMode === 1) {
        deltaX *= 24;
        deltaY *= 24;
      } else if (e.deltaMode === 2) {
        deltaX *= window.innerWidth;
        deltaY *= window.innerHeight;
      }

      // Excel-like Bidirectional Scroll: If Shift is held, map vertical wheel roll to horizontal scroll
      const isShift = e.shiftKey;
      if (isShift) {
        if (deltaY !== 0 && deltaX === 0) {
          deltaX = deltaY;
          deltaY = 0;
        } else if (deltaY !== 0 && deltaX !== 0) {
          deltaX = deltaX || deltaY;
          deltaY = 0;
        }
      }

      // 1. Locate innermost scrollable container with room under cursor
      const scrollTarget = findScrollableContainer(e.target, deltaX, deltaY, isShift);

      if (scrollTarget) {
        const { element: container, axis } = scrollTarget;

        if (axis === 'horizontal') {
          // In cursor-aware auto-horizontal mode, map deltaY to horizontal scroll if deltaX is 0
          const moveX = Math.abs(deltaX) > 0 ? deltaX : deltaY;
          container.scrollLeft += moveX;
        } else {
          container.scrollTop += deltaY;
        }

        // Isolate this wheel event: prevent Lenis and window from hijacking
        e.preventDefault();
        e.stopPropagation();
      } else {
        // 2. No inner scrollable room in this direction
        if (isShift) {
          // If Shift is pressed while hovering over a table or content, prevent accidental vertical jumps
          e.preventDefault();
        } else {
          const isInsideModal = (e.target as Element)?.closest?.('.fixed.inset-0, [role="dialog"], [data-modal]');
          if (isInsideModal) {
            // If inside an open modal that has reached its bounds, prevent background page scroll
            e.preventDefault();
          }
          // Otherwise, allow event to propagate to Lenis for smooth global page scrolling (smart boundary chaining)
        }
      }
    };

    window.addEventListener('wheel', handlePointerAwareWheel, { passive: false, capture: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', handlePointerAwareWheel, { capture: true });
      lenis.destroy();
      setLenisInstance(null);
    };
  }, []);

  const scrollTo = (
    target: string | number | HTMLElement,
    options?: Parameters<Lenis['scrollTo']>[1]
  ) => {
    if (lenisInstance) {
      lenisInstance.scrollTo(target, {
        duration: 0.9,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        ...options,
      });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' });
    } else if (typeof target === 'string') {
      const el = document.querySelector(target);
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <LenisContext.Provider value={{ lenis: lenisInstance, scrollTo, scrollY, isScrolled }}>
      {children}
    </LenisContext.Provider>
  );
};

export const useLenis = () => useContext(LenisContext);
