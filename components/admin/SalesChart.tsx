"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SalesChartProps {
  data: Array<{
    date: string;
    ventas: number;
    ordenes: number;
  }>;
}

export default function SalesChart({ data }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          strokeOpacity={0.5}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          dy={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          dx={-4}
          width={45}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-xl border border-border/50 bg-popover p-3 shadow-lg">
                  <p className="text-sm font-semibold">{payload[0].payload.date}</p>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-sm text-muted-foreground">
                      Ventas:{" "}
                      <span className="font-medium text-foreground">
                        S/ {Number(payload[0].value).toFixed(2)}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ordenes:{" "}
                      <span className="font-medium text-foreground">
                        {payload[0].payload.ordenes}
                      </span>
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="ventas"
          stroke="hsl(var(--primary))"
          strokeWidth={2.5}
          fill="url(#salesGradient)"
          dot={{
            fill: "hsl(var(--primary))",
            stroke: "hsl(var(--background))",
            strokeWidth: 2,
            r: 4,
          }}
          activeDot={{
            fill: "hsl(var(--primary))",
            stroke: "hsl(var(--background))",
            strokeWidth: 2,
            r: 6,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
