import React, { useState, useEffect, useCallback } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
}

export const LiquidClickRipple: React.FC = () => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    // Check if target is an interactive or clickable element
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Optional subtle hue variation (sky/cyan or indigo)
    const isPrimaryAction = !!target.closest('button, [role="button"], a, input[type="checkbox"], tr, td, .apple-glass-card');
    if (!isPrimaryAction) return;

    const newRipple: Ripple = {
      id: Date.now() + Math.random(),
      x: e.clientX,
      y: e.clientY,
      color: 'from-sky-400/40 via-blue-500/25 to-indigo-500/10 dark:from-sky-400/30 dark:via-cyan-400/20 dark:to-transparent',
    };

    setRipples((prev) => [...prev.slice(-6), newRipple]);

    // Automatically remove ripple after animation finishes
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 550);
  }, []);

  useEffect(() => {
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [handlePointerDown]);

  if (ripples.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="liquid-click-ripple no-print print:hidden fixed inset-0 pointer-events-none z-50 overflow-hidden"
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          style={{
            left: `${r.x}px`,
            top: `${r.y}px`,
          }}
          className={`absolute w-14 h-14 rounded-full bg-gradient-to-tr ${r.color} border border-sky-400/40 dark:border-sky-300/40 shadow-[0_0_20px_rgba(56,189,248,0.4)] animate-liquid-ripple`}
        />
      ))}
    </div>
  );
};
