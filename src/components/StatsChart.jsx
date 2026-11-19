import { useMemo, useState } from 'react';

// Breedte voor de klasnamen naast de balken (geen afgebroken namen)
const labelWidth = (data) => Math.min(170, Math.max(60, ...data.map((c) => String(c.name).length * 8 + 10)));
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function ChartTooltip({ active, payload, isDark, hoveredId }) {
  if (!active || !payload?.length) return null;
  const item = hoveredId ? payload.find((p) => p.dataKey === hoveredId) : payload[0];
  if (!item) return null;
  const name = item.payload?.name && item.dataKey === 'laps' ? item.payload.name : item.name;
  const color = item.payload?.color && item.dataKey === 'laps' ? item.payload.color : item.color || item.fill;
  return (
    <div className={`px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-800'}`}>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
        {name}
      </div>
      <div className="text-2xl font-black mt-1 tabular-nums">{item.value} <span className="text-xs font-bold text-slate-400">rondes</span></div>
    </div>
  );
}

/** Statistieken: 'bar' = balken per klas, 'stack' = één gestapelde balk */
export default function StatsChart({ data, isDark, mode = 'bar' }) {
  const [hovered, setHovered] = useState(null);
  const stackRow = useMemo(
    () => (mode === 'stack' ? [{ name: 'Totaal', ...Object.fromEntries(data.map((c) => [c.id, c.laps])) }] : []),
    [data, mode],
  );
  const stackOrder = useMemo(() => (mode === 'stack' ? [...data].reverse() : []), [data, mode]);

  if (data.length === 0) {
    return <div className={`text-center py-10 italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nog geen data beschikbaar.</div>;
  }

  if (mode === 'stack') {
    return (
      <div className="rounded-[2rem] overflow-hidden shadow-inner border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="horizontal" data={stackRow} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap={0} onMouseLeave={() => setHovered(null)}>
            <XAxis type="category" dataKey="name" hide />
            <YAxis type="number" hide domain={[0, 'dataMax']} />
            <Tooltip content={<ChartTooltip isDark={isDark} hoveredId={hovered} />} cursor={{ fill: 'transparent' }} />
            {stackOrder.map((c) => (
              <Bar key={c.id} dataKey={c.id} stackId="a" fill={c.color} name={c.name} animationDuration={800}
                onMouseEnter={() => setHovered(c.id)} onMouseLeave={() => setHovered(null)}>
                <LabelList dataKey={c.id} content={({ x, y, width, height, value }) => (width < 60 || height < 16 || !value ? null : (
                  <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize: 12, fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,.4)', pointerEvents: 'none' }}>
                    {c.name}: {value}
                  </text>
                ))} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ height: Math.max(250, data.length * 50), transition: 'height .3s ease' }}>
      <ResponsiveContainer width="100%" height="100%" debounce={100}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 44, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={labelWidth(data)} interval={0} axisLine={false} tickLine={false}
            tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, fontFamily: 'Inter' }} />
          <Tooltip content={<ChartTooltip isDark={isDark} />} cursor={{ fill: isDark ? '#334155' : '#f1f5f9', opacity: 0.6 }} />
          <Bar dataKey="laps" radius={[0, 8, 8, 0]} barSize={28} animationDuration={800} animationBegin={0}>
            {data.map((c) => <Cell key={c.id} fill={c.color} />)}
            <LabelList dataKey="laps" position="right" offset={8}
              style={{ fontSize: 13, fontWeight: 800, fill: isDark ? '#e2e8f0' : '#334155', fontFamily: 'Inter' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
