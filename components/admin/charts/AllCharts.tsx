"use client";

import { 
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

const COLORS = ["#f97316", "#fb923c", "#fdba74", "#ffedd5", "#ea580c", "#c2410c", "#9a3412"];

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.8)",
  boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(8px)",
};

export function CustomAreaChart({ data, dataKey, xKey }: { data: any[], dataKey: string, xKey: string }) {
  if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-sm text-neutral-400">No data</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#a3a3a3" }} dy={10} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#a3a3a3" }} />
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#f97316", fontWeight: 600 }} />
        <Area type="monotone" dataKey={dataKey} stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CustomPieChart({ data }: { data: { name: string, value: number }[] }) {
  if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-sm text-neutral-400">No data</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CustomBarChart({ data, dataKey, yKey }: { data: any[], dataKey: string, yKey: string }) {
  if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-sm text-neutral-400">No data</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#a3a3a3" }} />
        <YAxis dataKey={yKey} type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#525252" }} width={90} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(249,115,22,0.05)' }} />
        <Bar dataKey={dataKey} fill="#f97316" radius={[0, 6, 6, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}