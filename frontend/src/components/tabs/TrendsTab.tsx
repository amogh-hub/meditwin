import React from 'react';
import type { TimelinePoint } from '../../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

interface TrendsTabProps {
  timeline: TimelinePoint[];
}

export const TrendsTab: React.FC<TrendsTabProps> = ({ timeline }) => {
  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold font-grotesk tracking-tight text-fg">Historical Trends</h2>
        <p className="text-[13px] text-fg2 leading-relaxed">
          Track how your cumulative risk score evolves as medications are added. High scores indicate
          increased potential for adverse events.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-line bg-card animate-slide-up stagger-2">
        {timeline.length > 0 ? (
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--accent-raw)" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="var(--accent-raw)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-raw)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="medication"
                  stroke="var(--fg3-raw)" fontSize={11} tickMargin={10}
                  tick={{ fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false}
                />
                <YAxis
                  stroke="var(--fg3-raw)" fontSize={11} domain={[0, 'dataMax + 10']}
                  tick={{ fill: 'var(--fg3-raw)' }} tickLine={false} axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-raw)',
                    border: '1px solid var(--line-raw)',
                    borderRadius: '10px',
                    color: 'var(--fg-raw)',
                    fontSize: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  }}
                />
                <Area
                  type="stepAfter" dataKey="score"
                  stroke="var(--accent-raw)" strokeWidth={2.5}
                  fill="url(#trendGrad)"
                  dot={{ fill: 'var(--accent-raw)', r: 5, stroke: 'var(--card-raw)', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: 'var(--accent-raw)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-fg3 text-[13px]">
            Run an analysis to view the risk timeline.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {timeline.map((point, i) => (
          <div key={i}
            className={`p-4 rounded-2xl border transition-colors card-hover animate-slide-up
              ${point.level === 'High'
                ? 'border-risk-hi-muted bg-risk-hi-muted'
                : point.level === 'Medium'
                ? 'border-risk-md-muted bg-risk-md-muted'
                : 'border-risk-lo-muted bg-risk-lo-muted'}`}
            style={{ animationDelay: `${i * 50}ms` }}>
            <span className="text-[10px] uppercase tracking-widest text-fg3 block mb-2">Step {i + 1}</span>
            <div className="font-semibold text-fg text-[14px] mb-3">{point.medication}</div>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-fg3 block mb-1">Score</span>
                <span className="text-2xl font-bold font-grotesk text-fg">{point.score}</span>
              </div>
              <span className={`text-[11px] font-mono tracking-widest uppercase font-semibold
                ${point.level === 'High' ? 'text-risk-hi' : point.level === 'Medium' ? 'text-risk-md' : 'text-risk-lo'}`}>
                {point.level}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
