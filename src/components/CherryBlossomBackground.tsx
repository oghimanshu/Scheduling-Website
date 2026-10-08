import React, { useMemo } from 'react';
import { useScheduler } from '../context/SchedulerContext';

interface PetalConfig {
  id: number;
  left: number; // percentage 0-100
  size: number; // px 10-22
  duration: number; // seconds 9-18
  delay: number; // seconds 0-8
  swayDuration: number; // seconds 3-6
  opacity: number; // 0.25 - 0.55
  rotateStart: number;
}

export const CherryBlossomBackground: React.FC = () => {
  const { isDarkMode } = useScheduler();

  // Generate deterministic-looking random petals once
  const petals: PetalConfig[] = useMemo(() => {
    return Array.from({ length: 32 }).map((_, i) => ({
      id: i,
      left: Math.round(((i * 37 + 13) % 100)),
      size: 10 + ((i * 7) % 12), // 10px to 22px
      duration: 10 + ((i * 3) % 9), // 10s to 19s
      delay: (i * 0.4) % 7, // 0s to 7s
      swayDuration: 3 + ((i * 2) % 4), // 3s to 7s
      opacity: 0.2 + ((i * 9) % 35) / 100, // 0.20 to 0.55
      rotateStart: (i * 45) % 360,
    }));
  }, []);

  if (!isDarkMode) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-[1] select-none no-print print:hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes sakura-fall {
          0% {
            transform: translate3d(0, -10vh, 0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: var(--petal-opacity, 0.4);
          }
          90% {
            opacity: var(--petal-opacity, 0.4);
          }
          100% {
            transform: translate3d(120px, 110vh, 0) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes sakura-sway {
          0%, 100% {
            margin-left: 0px;
          }
          50% {
            margin-left: 45px;
          }
        }

        .sakura-petal {
          position: absolute;
          top: -20px;
          will-change: transform, opacity;
          animation-name: sakura-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .sakura-petal-inner {
          animation-name: sakura-sway;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
      `}</style>

      {petals.map((p) => (
        <div
          key={p.id}
          className="sakura-petal"
          style={
            {
              left: `${p.left}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              '--petal-opacity': p.opacity,
            } as React.CSSProperties
          }
        >
          <div
            className="sakura-petal-inner"
            style={{
              animationDuration: `${p.swayDuration}s`,
              animationDelay: `${p.delay * 0.5}s`,
            }}
          >
            {/* Elegant SVG Cherry Blossom Petal with characteristic notched tip */}
            <svg
              width={p.size}
              height={p.size * 1.3}
              viewBox="0 0 24 30"
              fill="none"
              style={{
                transform: `rotate(${p.rotateStart}deg)`,
                opacity: p.opacity,
                filter: 'drop-shadow(0 2px 4px rgba(244, 114, 182, 0.25))',
              }}
            >
              <defs>
                <linearGradient id={`sakuraGrad-${p.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbcfe8" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#f472b6" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#fda4af" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              <path
                d="M12 2C8 2 4 7 4 14C4 20 8 26 12 28C16 26 20 20 20 14C20 7 16 2 12 2ZM12 5C12.8 4 13.5 3.2 14.5 3.2C13.8 4.5 13.2 5.5 12 6.5C10.8 5.5 10.2 4.5 9.5 3.2C10.5 3.2 11.2 4 12 5Z"
                fill={`url(#sakuraGrad-${p.id})`}
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
};
