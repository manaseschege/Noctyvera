import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Single-series area + line chart.
 *
 * Design rules applied: one series so no legend (the title names it);
 * 2px line, 10% area wash, hairline gridlines, endpoint direct label only,
 * crosshair that snaps to the nearest x, and a table view so every value is
 * reachable without hovering.
 */

const INK = {
  series: '#D9B46A',
  surface: '#16151D',
  grid: '#2C2B34',
  baseline: '#383540',
  muted: '#8F8A80',
  text: '#F4F1EA',
};

const PAD = { top: 16, right: 16, bottom: 26, left: 46 };

function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) * mag;
  const ticks = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

const compact = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : String(Math.round(n));

export default function TrendChart({
  data = [],
  height = 240,
  valueKey = 'value',
  labelKey = 'date',
  formatValue = (v) => `$${compact(v)}`,
  formatLabel = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  seriesName = 'Revenue',
}) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(680);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const innerW = Math.max(1, width - PAD.left - PAD.right);
    const innerH = Math.max(1, height - PAD.top - PAD.bottom);
    const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
    const ticks = niceTicks(max);
    const domainMax = ticks[ticks.length - 1] || 1;

    const x = (i) => PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v) => PAD.top + innerH - (Math.max(0, v) / domainMax) * innerH;

    const points = data.map((d, i) => ({ ...d, cx: x(i), cy: y(Number(d[valueKey]) || 0), i }));
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' ');
    const area = points.length
      ? `${line} L${points[points.length - 1].cx.toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${points[0].cx.toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`
      : '';

    return { innerW, innerH, ticks, domainMax, points, line, area, baseY: PAD.top + innerH };
  }, [data, width, height, valueKey]);

  const onMove = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      if (!geo.points.length) return;
      let nearest = geo.points[0];
      geo.points.forEach((p) => {
        if (Math.abs(p.cx - px) < Math.abs(nearest.cx - px)) nearest = p;
      });
      setHover(nearest);
    },
    [geo.points],
  );

  const last = geo.points[geo.points.length - 1];

  return (
    <div ref={wrapRef} style={{ width: '100%', position: 'relative' }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${seriesName} over the last ${data.length} days`}
        style={{ display: 'block', overflow: 'visible', touchAction: 'none' }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="trendWash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INK.series} stopOpacity="0.18" />
            <stop offset="100%" stopColor={INK.series} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* gridlines — hairline, solid, recessive */}
        {geo.ticks.map((t) => {
          const gy = geo.baseY - (t / geo.domainMax) * geo.innerH;
          return (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={gy} y2={gy} stroke={INK.grid} strokeWidth="1" />
              <text
                x={PAD.left - 10}
                y={gy + 4}
                textAnchor="end"
                fontSize="11"
                fill={INK.muted}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatValue(t)}
              </text>
            </g>
          );
        })}

        <line x1={PAD.left} x2={width - PAD.right} y1={geo.baseY} y2={geo.baseY} stroke={INK.baseline} strokeWidth="1" />

        {geo.area && <path d={geo.area} fill="url(#trendWash)" />}
        <path d={geo.line} fill="none" stroke={INK.series} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* x ticks — first, middle, last only */}
        {[0, Math.floor(geo.points.length / 2), geo.points.length - 1]
          .filter((i, idx, arr) => i >= 0 && arr.indexOf(i) === idx)
          .map((i) => {
            const p = geo.points[i];
            if (!p) return null;
            return (
              <text
                key={i}
                x={p.cx}
                y={height - 6}
                textAnchor={i === 0 ? 'start' : i === geo.points.length - 1 ? 'end' : 'middle'}
                fontSize="11"
                fill={INK.muted}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatLabel(p[labelKey])}
              </text>
            );
          })}

        {/* endpoint marker + the one direct label */}
        {last && (
          <>
            <circle cx={last.cx} cy={last.cy} r="4.5" fill={INK.series} stroke={INK.surface} strokeWidth="2" />
            <text
              x={last.cx - 8}
              y={last.cy - 12}
              textAnchor="end"
              fontSize="12"
              fontWeight="600"
              fill={INK.text}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatValue(Number(last[valueKey]) || 0)}
            </text>
          </>
        )}

        {/* crosshair */}
        {hover && (
          <>
            <line x1={hover.cx} x2={hover.cx} y1={PAD.top} y2={geo.baseY} stroke={INK.baseline} strokeWidth="1" />
            <circle cx={hover.cx} cy={hover.cy} r="5" fill={INK.series} stroke={INK.surface} strokeWidth="2" />
          </>
        )}
      </svg>

      {hover && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(Math.max(hover.cx - 62, 0), Math.max(0, width - 128)),
            top: Math.max(0, hover.cy - 62),
            pointerEvents: 'none',
            background: 'rgba(17,16,23,0.96)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '8px 11px',
            minWidth: 118,
            boxShadow: '0 12px 34px rgba(0,0,0,0.55)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {formatValue(Number(hover[valueKey]) || 0)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ width: 10, height: 2, background: INK.series, borderRadius: 2 }} />
            <span style={{ fontSize: 11.5, color: INK.muted }}>{formatLabel(hover[labelKey])}</span>
          </div>
        </div>
      )}
    </div>
  );
}
