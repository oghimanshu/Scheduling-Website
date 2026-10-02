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
  deltaY: number
): HTMLElement | null {
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

      // Vertical scroll room check
      if (isScrollableY && Math.abs(deltaY) > 0) {
        const canScrollDown = deltaY > 0 && curr.scrollTop < curr.scrollHeight - curr.clientHeight - 1;
        const canScrollUp = deltaY < 0 && curr.scrollTop > 1;
        if (canScrollDown || canScrollUp) {
          return curr;
        }
      }

      // Horizontal scroll room check
      if (isScrollableX && Math.abs(deltaX) > 0) {
        const canScrollRight = deltaX > 0 && curr.scrollLeft < curr.scrollWidth - curr.clientWidth - 1;
        const canScrollLeft = deltaX < 0 && curr.scrollLeft > 1;
        if (canScrollRight || canScrollLeft) {
          return curr;
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

    // Universal Pointer-Aware Wheel Dispatcher with Smart Boundary Chaining
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

      // 1. Locate innermost scrollable container with room under cursor
      const container = findScrollableContainer(e.target, deltaX, deltaY);

      if (container) {
        // Direct scroll to the hovered container
        if (Math.abs(deltaY) > 0) {
          container.scrollTop += deltaY;
        }
        if (Math.abs(deltaX) > 0) {
          container.scrollLeft += deltaX;
        }

        // Isolate this wheel event: prevent Lenis and window from hijacking
        e.preventDefault();
        e.stopPropagation();
      } else {
        // 2. No inner scrollable room in this direction (either general page or reached boundary)
        const isInsideModal = (e.target as Element)?.closest?.('.fixed.inset-0, [role="dialog"], [data-modal]');
        if (isInsideModal) {
          // If inside an open modal that has reached its bounds, prevent background page scroll
          e.preventDefault();
        }
        // Otherwise, allow event to propagate to Lenis for smooth global page scrolling (smart boundary chaining)
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
