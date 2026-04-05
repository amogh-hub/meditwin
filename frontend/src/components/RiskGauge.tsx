/**
 * MediTwin Lite — Holographic 3D Risk Gauge
 * Pure canvas: animated arc sweep, glow rings, rotating halo, floating score
 */
import React, { useEffect, useRef } from 'react';

interface RiskGaugeProps { score: number; level: string }

const COLORS: Record<string, { main: string; glow: string; track: string }> = {
  High:   { main: '#ef4444', glow: '#ef444480', track: '#1a0505' },
  Medium: { main: '#f59e0b', glow: '#f59e0b80', track: '#1a1205' },
  Low:    { main: '#22c55e', glow: '#22c55e80', track: '#051a0a' },
};

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width  = canvas.offsetWidth  * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    const cx = w / 2, cy = h * 0.62;
    const R = Math.min(w, h) * 0.36;
    const isDark = document.documentElement.classList.contains('dark');
    const pal = COLORS[level] || COLORS.Low;

    const START = Math.PI * 0.85;
    const END   = Math.PI * 2.15;
    const TARGET_FRAC = Math.min(score / 30, 1);

    let frac = 0;
    let rot  = 0;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      rot += 0.006;
      frame++;

      /* ── Background glow disk ── */
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
      glow.addColorStop(0, pal.glow.replace('80', '25'));
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2); ctx.fill();

      /* ── Rotating particle halo ── */
      for (let i = 0; i < 18; i++) {
        const angle = rot + (i / 18) * Math.PI * 2;
        const pr    = R * 1.18 + Math.sin(frame * 0.04 + i) * 4;
        const px    = cx + Math.cos(angle) * pr;
        const py    = cy + Math.sin(angle) * pr * 0.55;
        const alpha = 0.15 + 0.3 * Math.abs(Math.sin(frame * 0.05 + i * 0.7));
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = pal.main + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      /* ── Track arc ── */
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, R, START, END);
      ctx.strokeStyle = isDark ? '#ffffff08' : '#00000010';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      /* ── Score arc with gradient + glow ── */
      const arcEnd = START + (END - START) * frac;
      if (frac > 0.01) {
        // Gradient along arc direction
        const x1 = cx + Math.cos(START) * R, y1 = cy + Math.sin(START) * R;
        const x2 = cx + Math.cos(arcEnd) * R, y2 = cy + Math.sin(arcEnd) * R;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, pal.main + '88');
        grad.addColorStop(1, pal.main);

        ctx.save();
        ctx.shadowColor = pal.main;
        ctx.shadowBlur  = 28;
        ctx.beginPath();
        ctx.arc(cx, cy, R, START, arcEnd);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        /* ── Bright tip dot ── */
        const tipX = cx + Math.cos(arcEnd) * R;
        const tipY = cy + Math.sin(arcEnd) * R;
        const dot = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 14);
        dot.addColorStop(0, '#ffffff');
        dot.addColorStop(0.3, pal.main);
        dot.addColorStop(1, 'transparent');
        ctx.save();
        ctx.shadowColor = pal.main;
        ctx.shadowBlur  = 30;
        ctx.beginPath(); ctx.arc(tipX, tipY, 9, 0, Math.PI * 2);
        ctx.fillStyle = dot; ctx.fill();
        ctx.restore();
      }

      /* ── Inner concentric rings ── */
      [0.7, 0.5, 0.3].forEach((rf, i) => {
        const alpha = (0.06 - i * 0.015);
        ctx.beginPath();
        ctx.arc(cx, cy, R * rf, 0, Math.PI * 2);
        ctx.strokeStyle = pal.main + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      /* ── Tick marks ── */
      for (let i = 0; i <= 10; i++) {
        const a = START + (END - START) * (i / 10);
        const len = i % 5 === 0 ? 10 : 5;
        const x1 = cx + Math.cos(a) * (R - 24), y1 = cy + Math.sin(a) * (R - 24);
        const x2 = cx + Math.cos(a) * (R - 24 - len), y2 = cy + Math.sin(a) * (R - 24 - len);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = isDark ? '#ffffff20' : '#00000020';
        ctx.lineWidth = i % 5 === 0 ? 2 : 1;
        ctx.stroke();
      }

      /* ── Score label ── */
      const displayScore = Math.round(frac * score / TARGET_FRAC) || 0;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      // Shadow glow
      ctx.save();
      ctx.shadowColor = pal.main;
      ctx.shadowBlur  = 20;
      ctx.font        = `bold ${Math.round(R * 0.7)}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle   = pal.main;
      ctx.fillText(String(displayScore), cx, cy - R * 0.04);
      ctx.restore();

      ctx.font      = `600 13px Inter, sans-serif`;
      ctx.fillStyle = isDark ? '#8a8780' : '#6b6860';
      ctx.fillText(`${level.toUpperCase()} RISK`, cx, cy + R * 0.35);

      // Animate frac toward target
      if (frac < TARGET_FRAC) frac = Math.min(frac + 0.018, TARGET_FRAC);

      if (frac < TARGET_FRAC + 0.001) {
        requestAnimationFrame(draw);
      } else {
        // Keep halo animating
        const loop = () => {
          rot += 0.006;
          frame++;
          ctx.clearRect(0, 0, w, h);

          const glow2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
          glow2.addColorStop(0, pal.glow.replace('80', '18'));
          glow2.addColorStop(1, 'transparent');
          ctx.fillStyle = glow2;
          ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2); ctx.fill();

          for (let i = 0; i < 18; i++) {
            const angle = rot + (i / 18) * Math.PI * 2;
            const pr    = R * 1.18 + Math.sin(frame * 0.04 + i) * 4;
            const px    = cx + Math.cos(angle) * pr;
            const py    = cy + Math.sin(angle) * pr * 0.55;
            const alpha = 0.1 + 0.2 * Math.abs(Math.sin(frame * 0.05 + i * 0.7));
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fillStyle = pal.main + Math.round(alpha * 255).toString(16).padStart(2, '0');
            ctx.fill();
          }

          // Static arc
          ctx.save(); ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.arc(cx, cy, R, START, END);
          ctx.strokeStyle = isDark ? '#ffffff08' : '#00000010';
          ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();

          const x1 = cx + Math.cos(START) * R, y1 = cy + Math.sin(START) * R;
          const x2 = cx + Math.cos(END) * R, y2 = cy + Math.sin(END) * R;
          const grad2 = ctx.createLinearGradient(x1, y1, x2, y2);
          grad2.addColorStop(0, pal.main + '88'); grad2.addColorStop(1, pal.main);

          ctx.save(); ctx.shadowColor = pal.main; ctx.shadowBlur = 28;
          ctx.beginPath(); ctx.arc(cx, cy, R, START, START + (END - START) * TARGET_FRAC);
          ctx.strokeStyle = grad2; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();

          const tipX = cx + Math.cos(START + (END - START) * TARGET_FRAC) * R;
          const tipY = cy + Math.sin(START + (END - START) * TARGET_FRAC) * R;
          const pulse = 0.7 + 0.3 * Math.sin(frame * 0.08);
          const dot2 = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 14 * pulse);
          dot2.addColorStop(0, '#ffffff'); dot2.addColorStop(0.3, pal.main); dot2.addColorStop(1, 'transparent');
          ctx.save(); ctx.shadowColor = pal.main; ctx.shadowBlur = 30 * pulse;
          ctx.beginPath(); ctx.arc(tipX, tipY, 9 * pulse, 0, Math.PI * 2);
          ctx.fillStyle = dot2; ctx.fill(); ctx.restore();

          [0.7, 0.5, 0.3].forEach((rf, i) => {
            ctx.beginPath(); ctx.arc(cx, cy, R * rf, 0, Math.PI * 2);
            ctx.strokeStyle = pal.main + Math.round((0.06 - i * 0.015) * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = 1; ctx.stroke();
          });

          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.save(); ctx.shadowColor = pal.main; ctx.shadowBlur = 20;
          ctx.font = `bold ${Math.round(R * 0.7)}px 'Space Grotesk', sans-serif`;
          ctx.fillStyle = pal.main; ctx.fillText(String(score), cx, cy - R * 0.04); ctx.restore();
          ctx.font = `600 13px Inter, sans-serif`;
          ctx.fillStyle = isDark ? '#8a8780' : '#6b6860';
          ctx.fillText(`${level.toUpperCase()} RISK`, cx, cy + R * 0.35);

          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }
    };

    requestAnimationFrame(draw);
  }, [score, level]);

  return <canvas ref={canvasRef} className="w-full h-[260px]" style={{ display: 'block' }} />;
};
