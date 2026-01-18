"use client";

import {
  LineChart,
  Line,
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
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-3 shadow-sm">
                  <p className="text-sm font-medium">{payload[0].payload.date}</p>
                  <p className="text-sm text-muted-foreground">
                    Ventas: S/ {payload[0].value?.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Órdenes: {payload[0].payload.ordenes}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Line
          type="monotone"
          dataKey="ventas"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: "hsl(var(--primary))" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}