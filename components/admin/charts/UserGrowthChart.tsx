"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { UsersData } from "@/hooks/useAdminAnalytics";

export function UserGrowthChart({ data }: { data: UsersData["growthChart"] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-neutral-400">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
        <XAxis 
          dataKey="date" 
          tickLine={false} 
          axisLine={false} 
          tick={{ fontSize: 12, fill: "#a3a3a3" }} 
          dy={10}
        />
        <YAxis 
          tickLine={false} 
          axisLine={false} 
          tick={{ fontSize: 12, fill: "#a3a3a3" }} 
        />
        <Tooltip 
          contentStyle={{ borderRadius: "8px", border: "1px solid #fed7aa", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
          itemStyle={{ color: "#f97316", fontWeight: 600 }}
        />
        <Area 
          type="monotone" 
          dataKey="count" 
          stroke="#f97316" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorCount)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}