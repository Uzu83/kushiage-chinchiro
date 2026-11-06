import { useEffect, useRef } from 'react';
import type { OutcomeId } from '../lib/chinchiro';

const COLORS = ['#c93625', '#f3b923', '#fff6d8', '#f77f38', '#238373'];

export function Effects({ outcome, sequence, reduced }: { outcome: OutcomeId | null; sequence: number; reduced: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!outcome || reduced || sequence === 0) return;
    const element = canvas.current!;
    const ctx = element.getContext('2d')!;
    const fixedDpr = Math.min(window.devicePixelRatio, 1.5);
    const width = element.width = window.innerWidth * fixedDpr;
    const height = element.height = window.innerHeight * fixedDpr;

    const count = outcome === 'yamada' ? 170 : outcome === 'free' ? 85 : 38;
    const particles = Array.from({ length: count }, () => ({
      x: width * (0.15 + Math.random() * 0.7),
      y: outcome === 'double' ? -20 : height * 0.40,
      vx: (Math.random() - 0.5) * (outcome === 'yamada' ? 18 : 12),
      vy: outcome === 'double' ? Math.random() * 3 + 2 : -(Math.random() * 13 + 8),
      gravity: outcome === 'double' ? 0.22 : 0.3,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.2,
      size: (Math.random() * 8 + 5) * fixedDpr,
      color: outcome === 'double' ? '#68879f' : COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let raf = 0;
    const started = performance.now();
    const tick = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.vx *= 0.995; p.rotation += p.spin;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillStyle = p.color;
        if (outcome === 'double') {
          ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.bezierCurveTo(p.size * 0.85, 0, p.size * 0.6, p.size, 0, p.size);
          ctx.bezierCurveTo(-p.size * 0.6, p.size, -p.size * 0.85, 0, 0, -p.size); ctx.fill();
        } else ctx.fillRect(-p.size * 0.55, -p.size * 0.3, p.size * 1.1, p.size * 0.7);
        ctx.restore();
      });
      if (now - started < (outcome === 'yamada' ? 4200 : 2600)) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, width, height);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, width, height); };
  }, [outcome, sequence, reduced]);
  return <canvas ref={canvas} className="effect-canvas" aria-hidden="true" />;
}

export function MegaJockey({ large = false, empty = false }: { large?: boolean; empty?: boolean }) {
  return (
    <div className={`mega-jockey ${large ? 'is-large' : ''} ${empty ? 'is-empty' : ''}`} aria-hidden="true">
      <div className="beer-foam"><i /><i /><i /><i /></div>
      <div className="beer-glass"><div className="beer-liquid" /><span className="beer-bubble b1" /><span className="beer-bubble b2" /><span className="beer-bubble b3" /><div className="glass-glint" /></div>
      <div className="beer-handle" />
    </div>
  );
}

export function DieIcon({ dies = true }: { dies?: boolean }) {
  return <span className={`die-icon ${dies ? '' : 'single'}`} aria-hidden="true"><i className="mini-die mountain">山</i><i className="mini-die field">田</i></span>;
}
