/**
 * MediTwin Lite — Interaction Network (Apple-style)
 * Force-directed layout, clean minimal canvas render
 * No glow, no particles — just clear geometry and typography
 */
import React, { useEffect, useRef, useCallback } from 'react';
import type { Interaction } from '../types';

interface NetworkGraphProps {
  interactions: Interaction[];
  medications: string[];
}

interface Node {
  id: string;
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  fillColor: string;
  strokeColor: string;
  labelColor: string;
  connections: number;
}

interface Edge {
  a: number; b: number;
  severity: string;
  strokeColor: string;
  width: number;
}

const REPULSION  = 3500;
const SPRING_LEN = 160;
const SPRING_K   = 0.035;
const DAMPING    = 0.80;
const BASE_R     = 12;

const norm = (s: string) => s.trim().toLowerCase();

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ interactions, medications }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<{
    nodes:   Node[];
    edges:   Edge[];
    drag:    { active: boolean; idx: number } | null;
    hover:   number | null;
    animId:  number;
    w: number; h: number;
    tick: number;
  }>({ nodes: [], edges: [], drag: null, hover: null, animId: 0, w: 0, h: 0, tick: 0 });

  const build = useCallback(() => {
    const s   = stateRef.current;
    const n   = medications.length;
    if (n === 0) { s.nodes = []; s.edges = []; return; }

    const idxMap: Record<string, number> = {};
    medications.forEach((m, i) => { idxMap[norm(m)] = i; });

    const worstSev: Record<number, string> = {};
    const connCount: Record<number, number> = {};
    interactions.forEach(ix => {
      const a = idxMap[norm(ix.drug_a)];
      const b = idxMap[norm(ix.drug_b)];
      if (a === undefined || b === undefined) return;
      [a, b].forEach(idx => {
        connCount[idx] = (connCount[idx] || 0) + 1;
        if (!worstSev[idx] || ix.severity === 'severe') worstSev[idx] = ix.severity;
      });
    });

    const cx = s.w / 2, cy = s.h / 2;
    const lr = Math.min(s.w, s.h) * 0.28;
    const isDark = document.documentElement.classList.contains('dark');

    s.nodes = medications.map((med, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const sev   = worstSev[i];
      const conn  = connCount[i] || 0;

      // Apple SF Colors
      const fillColor =
        sev === 'severe'   ? (isDark ? '#FF453A' : '#FF3B30') :
        sev === 'moderate' ? (isDark ? '#FF9F0A' : '#FF9500') :
        (isDark ? '#0A84FF' : '#007AFF');

      return {
        id: med,
        x: cx + Math.cos(angle) * lr + (Math.random() - 0.5) * 20,
        y: cy + Math.sin(angle) * lr + (Math.random() - 0.5) * 20,
        vx: 0, vy: 0,
        r: BASE_R + Math.min(conn * 2, 8),
        fillColor,
        strokeColor: fillColor,
        labelColor: isDark ? '#EBEBF5' : '#3C3C43',
        connections: conn,
      };
    });

    s.edges = interactions
      .map(ix => {
        const a = idxMap[norm(ix.drug_a)];
        const b = idxMap[norm(ix.drug_b)];
        if (a === undefined || b === undefined) return null;
        const isDarkNow = document.documentElement.classList.contains('dark');
        return {
          a, b,
          severity: ix.severity,
          strokeColor: ix.severity === 'severe'
            ? (isDarkNow ? '#FF453A' : '#FF3B30')
            : (isDarkNow ? '#FF9F0A' : '#FF9500'),
          width: ix.severity === 'severe' ? 2 : 1.5,
        };
      })
      .filter(Boolean) as Edge[];
  }, [interactions, medications]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const s   = stateRef.current;
    const { w, h } = s;
    const isDark = document.documentElement.classList.contains('dark');
    s.tick++;

    /* ── Physics ── */
    const fixed = s.drag?.active ? s.drag.idx : -1;
    s.nodes.forEach((n, i) => {
      if (i === fixed) return;
      // Repulsion between all nodes
      s.nodes.forEach((m, j) => {
        if (i === j) return;
        const dx = n.x - m.x, dy = n.y - m.y;
        const d  = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const f  = REPULSION / (d * d);
        n.vx += (dx / d) * f * 0.5;
        n.vy += (dy / d) * f * 0.5;
      });
      n.vx += (w / 2 - n.x) * 0.004;
      n.vy += (h / 2 - n.y) * 0.004;
      n.vx *= DAMPING; n.vy *= DAMPING;
      n.x  += n.vx;   n.y  += n.vy;
      const pad = n.r + 20;
      n.x = Math.max(pad, Math.min(w - pad, n.x));
      n.y = Math.max(pad, Math.min(h - pad, n.y));
    });
    s.edges.forEach(e => {
      const na = s.nodes[e.a], nb = s.nodes[e.b];
      if (!na || !nb) return;
      const dx = nb.x - na.x, dy = nb.y - na.y;
      const d  = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const f  = (d - SPRING_LEN) * SPRING_K;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      if (e.a !== fixed) { na.vx += fx; na.vy += fy; }
      if (e.b !== fixed) { nb.vx -= fx; nb.vy -= fy; }
    });

    /* ── Background ── */
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = isDark ? '#1C1C1E' : '#F2F2F7';
    ctx.fillRect(0, 0, w, h);

    /* ── Edges ── */
    s.edges.forEach(e => {
      const na = s.nodes[e.a], nb = s.nodes[e.b];
      if (!na || !nb) return;

      // Edge line — clean, no glow
      ctx.save();
      ctx.globalAlpha  = 0.6;
      ctx.strokeStyle  = e.strokeColor;
      ctx.lineWidth    = e.width;
      ctx.lineCap      = 'round';
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.stroke();
      ctx.restore();

      // Tiny midpoint dot for severity indicator
      const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(mx, my, e.severity === 'severe' ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = e.strokeColor;
      ctx.fill();
      ctx.restore();
    });

    /* ── Nodes ── */
    s.nodes.forEach((n, i) => {
      const isHov = s.hover === i;
      const r     = n.r + (isHov ? 3 : 0);

      // Drop shadow (Apple-style, no glow — offset shadow)
      ctx.save();
      ctx.shadowColor  = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur   = 10;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? '#2C2C2E' : '#FFFFFF';
      ctx.fill();
      ctx.restore();

      // Colored border ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = n.strokeColor;
      ctx.lineWidth   = isHov ? 2.5 : 2;
      ctx.stroke();
      ctx.restore();

      // Colored fill dot in center (small, purposeful)
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = n.fillColor;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.restore();

      // Label — clean SF-style
      const fontSize = 11;
      ctx.font        = `${isHov ? 600 : 500} ${fontSize}px -apple-system, "SF Pro Text", Inter, sans-serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'top';
      const label = n.id;
      const lx = n.x, ly = n.y + r + 6;

      ctx.fillStyle   = isDark ? 'rgba(235,235,245,0.85)' : 'rgba(60,60,67,0.85)';
      ctx.fillText(label, lx, ly);
    });

    /* ── Hover pill tooltip ── */
    if (s.hover !== null) {
      const n = s.nodes[s.hover];
      if (n) {
        const sevE = s.edges.filter(e => (e.a === s.hover || e.b === s.hover) && e.severity === 'severe').length;
        const modE = s.edges.filter(e => (e.a === s.hover || e.b === s.hover) && e.severity !== 'severe').length;

        const lines  = [n.id, `${sevE} severe · ${modE} moderate`];
        const pad    = 12;
        const lh     = 16;
        const bw     = 170, bh = lh * lines.length + pad * 2;
        const tx     = Math.min(n.x + n.r + 10, w - bw - 8);
        const ty     = Math.max(n.y - bh / 2, 8);

        ctx.save();
        ctx.shadowColor  = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur   = 20;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle    = isDark ? '#3A3A3C' : '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(tx, ty, bw, bh, 10);
        ctx.fill();
        ctx.restore();

        // Hairline border
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
        ctx.lineWidth   = 0.5;
        ctx.beginPath(); ctx.roundRect(tx, ty, bw, bh, 10); ctx.stroke();

        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.font = `600 12px -apple-system, "SF Pro Text", Inter, sans-serif`;
        ctx.fillStyle = isDark ? '#EBEBF5' : '#1C1C1E';
        ctx.fillText(lines[0], tx + pad, ty + pad);

        ctx.font = `400 11px -apple-system, "SF Pro Text", Inter, sans-serif`;
        ctx.fillStyle = isDark ? 'rgba(235,235,245,0.5)' : 'rgba(60,60,67,0.5)';
        ctx.fillText(lines[1], tx + pad, ty + pad + lh);
      }
    }

    s.animId = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const parent = canvas.parentElement!;

    const resize = () => {
      s.w = canvas.width  = parent.clientWidth;
      s.h = canvas.height = 380;
      build();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    s.animId = requestAnimationFrame(draw);

    const onDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const hit = s.nodes.findIndex(n => Math.hypot(n.x - mx, n.y - my) < n.r + 8);
      if (hit !== -1) s.drag = { active: true, idx: hit };
    };
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      if (s.drag?.active) {
        s.nodes[s.drag.idx].x  = mx;
        s.nodes[s.drag.idx].y  = my;
        s.nodes[s.drag.idx].vx = 0;
        s.nodes[s.drag.idx].vy = 0;
      }
      const hit = s.nodes.findIndex(n => Math.hypot(n.x - mx, n.y - my) < n.r + 8);
      s.hover = hit === -1 ? null : hit;
      canvas.style.cursor = s.hover !== null ? 'pointer' : (s.drag?.active ? 'grabbing' : 'default');
    };
    const onUp = () => { s.drag = null; };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      cancelAnimationFrame(s.animId);
      ro.disconnect();
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [build, draw]);

  useEffect(() => { build(); }, [build]);

  if (medications.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] rounded-2xl border border-line bg-card
        text-fg3 text-[13px] font-medium">
        Add multiple medications to view interactions
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-line">
      {/* Legend — Apple-style chips */}
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        {[
          { color: '#FF3B30', label: 'Severe'   },
          { color: '#FF9500', label: 'Moderate' },
          { color: '#007AFF', label: 'No interaction' },
        ].map(({ color, label }) => (
          <span key={label}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{
              background: 'rgba(242,242,247,0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '0.5px solid rgba(0,0,0,0.08)',
              color: '#3C3C43',
            }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: color, display: 'inline-block', flexShrink: 0,
            }} />
            {label}
          </span>
        ))}
      </div>

      {/* Drag hint */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 text-[10px] font-medium
        tracking-wide pointer-events-none select-none"
        style={{ color: 'rgba(60,60,67,0.35)' }}>
        Drag to rearrange · Hover for details
      </div>

      <canvas ref={canvasRef} className="w-full block" />
    </div>
  );
};
