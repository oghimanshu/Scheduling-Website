import { useState, useEffect, useRef, useCallback } from 'react';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuState<T> {
  isOpen: boolean;
  position: ContextMenuPosition;
  data: T | null;
}

export function useContextMenu<T>() {
  const [menuState, setMenuState] = useState<ContextMenuState<T>>({
    isOpen: false,
    position: { x: 0, y: 0 },
    data: null,
  });

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const openMenu = useCallback((position: ContextMenuPosition, data: T) => {
    // Viewport clamping
    const padding = 16;
    const estimatedWidth = 240;
    const estimatedHeight = 280;

    const clampedX = Math.min(position.x, window.innerWidth - estimatedWidth - padding);
    const clampedY = Math.min(position.y, window.innerHeight - estimatedHeight - padding);

    setMenuState({
      isOpen: true,
      position: {
        x: Math.max(padding, clampedX),
        y: Math.max(padding, clampedY),
      },
      data,
    });
  }, []);

  const closeMenu = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setMenuState((prev) => (prev.isOpen ? { ...prev, isOpen: false, data: null } : prev));
  }, []);

  // Global listeners to auto-close menu
  useEffect(() => {
    if (!menuState.isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      closeMenu();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    const handleScroll = () => {
      closeMenu();
    };

    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('contextmenu', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('contextmenu', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [menuState.isOpen, closeMenu]);

  // Bind right-click and mobile touch long-press to any item
  const bindItem = useCallback((data: T) => {
    return {
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        openMenu({ x: e.clientX, y: e.clientY }, data);
      },
      onTouchStart: (e: React.TouchEvent) => {
        const touch = e.touches[0];
        if (!touch) return;
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }

        longPressTimerRef.current = setTimeout(() => {
          if (navigator.vibrate) {
            try {
              navigator.vibrate(40);
            } catch (_) {}
          }
          openMenu({ x: touch.clientX, y: touch.clientY }, data);
          longPressTimerRef.current = null;
        }, 500);
      },
      onTouchMove: (e: React.TouchEvent) => {
        // Cancel long press if finger moved more than 10px (user is scrolling)
        const touch = e.touches[0];
        if (touch && touchStartPosRef.current) {
          const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
          const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
          if (dx > 10 || dy > 10) {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }
        }
      },
      onTouchEnd: () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      },
    };
  }, [openMenu]);

  return {
    isOpen: menuState.isOpen,
    position: menuState.position,
    data: menuState.data,
    openMenu,
    closeMenu,
    bindItem,
  };
}
