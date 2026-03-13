import { useState, useMemo } from 'react';
import { getMockPriceHistory } from '../services/api';

// Use the deterministic price history generator
const DATA = getMockPriceHistory('AAPL', 90).map((d) => ({ date: d.date, value: d.close }));

export default function AnalyticsChart() {
  const [hover, setHover] = useState(null);
  const W = 600, H = 160;
  const PAD = { top: 10, right: 16, bottom: 28, left: 64 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const values = DATA.map((d) => d.value);
  const minV   = Math.min(...values);
  const maxV   = Math.max(...values);
  const range  = maxV - minV || 1;

  const pts = useMemo(() => DATA.map((d, i) => ({
    x: PAD.left + (i / (DATA.length - 1)) * chartW,
    y: PAD.top  + (1 - (d.value - minV) / range) * chartH,
    ...d,
  })), []);

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${PAD.top + chartH} L${PAD.left},${PAD.top + chartH} Z`;

  const isProfit   = pts[pts.length - 1].value > pts[0].value;
  const color      = isProfit ? '#34d399' : '#f87171';
  const totalReturn = ((pts[pts.length - 1].value - pts[0].value) / pts[0].value * 100);

  const yTicks   = [0, 0.25, 0.5, 0.75, 1];
  const xTickIdx = [0, Math.floor(DATA.length * 0.25), Math.floor(DATA.length * 0.5), Math.floor(DATA.length * 0.75), DATA.length - 1];

  const hoverPt   = hover != null ? pts[hover] : null;
  const tooltipX  = hoverPt ? Math.min(hoverPt.x - 40, W - PAD.right - 110) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">Equity Curve</div>
          <div className="text-xs font-mono text-zinc-500 mt-0.5">90-day performance</div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-light tabular-nums font-mono ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            {isProfit ? '+' : ''}{totalReturn.toFixed(2)}%
          </div>
          <div className="text-xs text-zinc-500 font-mono">${pts[pts.length - 1].value.toLocaleString()}</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => {
          const y = PAD.top + t * chartH;
          const v = maxV - t * range;
          return (
            <g key={t}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#27272a" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fill="#52525b" fontSize="9" fontFamily="monospace">
                ${(v / 1000).toFixed(0)}k
              </text>
            </g>
          );
        })}

        {xTickIdx.map((idx) => (
          <text key={idx} x={pts[idx].x} y={H - 6} textAnchor="middle" fill="#52525b" fontSize="9" fontFamily="monospace">
            {pts[idx].date}
          </text>
        ))}

        <path d={areaPath} fill="url(#eqGrad)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Hover targets */}
        {pts.map((p, i) => (
          <rect key={i}
            x={p.x - chartW / DATA.length / 2} y={PAD.top}
            width={chartW / DATA.length} height={chartH}
            fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}

        {hoverPt && (
          <>
            <line x1={hoverPt.x} y1={PAD.top} x2={hoverPt.x} y2={PAD.top + chartH} stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />
            <circle cx={hoverPt.x} cy={hoverPt.y} r="3" fill={color} />
            <rect x={tooltipX} y={PAD.top} width={104} height={30} rx="3" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
            <text x={tooltipX + 52} y={PAD.top + 11} textAnchor="middle" fill="#a1a1aa" fontSize="8" fontFamily="monospace">
              {hoverPt.date}
            </text>
            <text x={tooltipX + 52} y={PAD.top + 23} textAnchor="middle" fill={color} fontSize="9" fontFamily="monospace" fontWeight="600">
              ${hoverPt.value.toLocaleString()}
            </text>
          </>
        )}
      </svg>

      <div className="grid grid-cols-4 gap-3 pt-2 border-t border-zinc-800">
        {[
          { label: 'Start',   value: `$${(pts[0].value / 1000).toFixed(1)}k` },
          { label: 'Current', value: `$${(pts[pts.length - 1].value / 1000).toFixed(1)}k` },
          { label: 'Peak',    value: `$${(Math.max(...values) / 1000).toFixed(1)}k` },
          { label: 'Return',  value: `${isProfit ? '+' : ''}${totalReturn.toFixed(2)}%`, color: isProfit ? 'text-emerald-400' : 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-mono">{s.label}</span>
            <span className={`text-sm font-light tabular-nums font-mono ${s.color ?? 'text-zinc-300'}`}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
