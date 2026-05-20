"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface OrdersStatusChartProps {
  data: Array<{
    status: string;
    _count: { status: number };
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  PAID: "#10b981",
  PROCESSING: "#3b82f6",
  SHIPPED: "#8b5cf6",
  DELIVERED: "#22c55e",
  CANCELLED: "#ef4444",
  REFUNDED: "#f97316",
};

export default function OrdersStatusChart({ data }: OrdersStatusChartProps) {
  const chartData = data.map((item) => ({
    status: getStatusLabel(item.status),
    ordenes: item._count.status,
    rawStatus: item.status,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} barCategoryGap="20%">
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          strokeOpacity={0.5}
          vertical={false}
        />
        <XAxis
          dataKey="status"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          dy={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          dx={-4}
          width={30}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.3, radius: 4 }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload;
              return (
                <div className="rounded-xl border border-border/50 bg-popover p-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          STATUS_COLORS[item.rawStatus] || "#64748b",
                      }}
                    />
                    <p className="text-sm font-semibold">{item.status}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {payload[0].value}{" "}
                    {payload[0].value === 1 ? "orden" : "ordenes"}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="ordenes" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={STATUS_COLORS[entry.rawStatus] || "#64748b"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Pendiente",
    PAID: "Pagado",
    PROCESSING: "Procesando",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
    REFUNDED: "Reembolsado",
  };
  return labels[status] || status;
}
