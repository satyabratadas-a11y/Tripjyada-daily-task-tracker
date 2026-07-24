'use client';

import { useId, useMemo, useState } from 'react';

export interface TrendPoint {
  year: number;
  month: number;
  progressPct: number;
  assignedDays: number;
  completed: number;
  onProgress: number;
  incomplete: number;
  flags: number;
}

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 34;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

/** A single-series line chart of monthly progress % — no legend needed (the title names the
 * one series), brand-orange line matching the rest of the app's primary accent, with a hover
 * crosshair/tooltip and an always-present accessible table underneath. */
export default function TrendChart({ points }: { points: TrendPoint[] }) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xFor = (i: number) => PAD_LEFT + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const yFor = (pct: number) => PAD_TOP + plotHeight - (Math.min(Math.max(pct, 0), 100) / 100) * plotHeight;

  const linePath = useMemo(
    () => points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.progressPct)}`).join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points]
  );
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const first = xFor(0);
    const last = xFor(points.length - 1);
    const baseline = PAD_TOP + plotHeight;
    return `${linePath} L ${last} ${baseline} L ${first} ${baseline} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linePath, points]);

  const gridLines = [0, 25, 50, 75, 100];

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((_, i) => {
      const dist = Math.abs(xFor(i) - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  if (points.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No data yet for this range.</p>;
  }

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="Monthly progress percentage trend"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F2701C" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#F2701C" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Recessive gridlines + axis labels */}
          {gridLines.map((pct) => (
            <g key={pct}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yFor(pct)}
                y2={yFor(pct)}
                className="stroke-gray-200 dark:stroke-white/10"
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 8} y={yFor(pct) + 3} textAnchor="end" className="fill-gray-400 dark:fill-gray-500" fontSize={10}>
                {pct}
              </text>
            </g>
          ))}

          {points.map((p, i) => (
            <text
              key={`${p.year}-${p.month}`}
              x={xFor(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-gray-400 dark:fill-gray-500"
              fontSize={10}
            >
              {monthLabel(p.year, p.month)}
            </text>
          ))}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke="#F2701C" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {hoverIndex !== null && (
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={PAD_TOP}
              y2={PAD_TOP + plotHeight}
              className="stroke-gray-300 dark:stroke-white/20"
              strokeWidth={1}
            />
          )}

          {points.map((p, i) => (
            <circle
              key={`${p.year}-${p.month}-dot`}
              cx={xFor(i)}
              cy={yFor(p.progressPct)}
              r={hoverIndex === i ? 5 : 3}
              fill="#F2701C"
              className="stroke-white dark:stroke-ink"
              strokeWidth={1.5}
            />
          ))}
        </svg>

        {hovered && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-white/10 dark:bg-ink-light"
            style={{
              left: `${(xFor(hoverIndex) / WIDTH) * 100}%`,
              transform: `translateX(${hoverIndex < points.length / 2 ? '8px' : 'calc(-100% - 8px)'})`,
            }}
          >
            <p className="font-medium text-gray-900 dark:text-gray-100">{monthLabel(hovered.year, hovered.month)}</p>
            <p className="text-gray-600 dark:text-gray-300">Progress: {hovered.progressPct}%</p>
            <p className="text-gray-500 dark:text-gray-400">
              Completed {hovered.completed} · Flagged {hovered.flags} · Assigned {hovered.assignedDays}
            </p>
          </div>
        )}
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-gray-500 hover:text-brand dark:text-gray-400">
          Show as table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="tracker w-full">
            <thead>
              <tr>
                <th>Month</th>
                <th>Assigned</th>
                <th>Completed</th>
                <th>On progress</th>
                <th>Incomplete</th>
                <th>Flagged</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={`${p.year}-${p.month}-row`}>
                  <td data-label="Month">{monthLabel(p.year, p.month)}</td>
                  <td data-label="Assigned">{p.assignedDays}</td>
                  <td data-label="Completed">{p.completed}</td>
                  <td data-label="On progress">{p.onProgress}</td>
                  <td data-label="Incomplete">{p.incomplete}</td>
                  <td data-label="Flagged">{p.flags}</td>
                  <td data-label="Progress">{p.progressPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
