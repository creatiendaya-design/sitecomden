"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface OrdersStatusChartProps {
  data: Array<{
    status: string;
    _count: { status: number };
  }>;
}

export default function OrdersStatusChart({ data }: OrdersStatusChartProps) {
  // Transformar datos y agregar nombres en español
  const chartData = data.map((item) => ({
    status: getStatusLabel(item.status),
    ordenes: item._count.status,
    color: getStatusColor(item.status),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="status" />
        <YAxis />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-3 shadow-sm">
                  <p className="text-sm font-medium">{payload[0].payload.status}</p>
                  <p className="text-sm text-muted-foreground">
                    {payload[0].value} {payload[0].value === 1 ? "orden" : "órdenes"}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="ordenes" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
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

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "#f59e0b",
    PAID: "#10b981",
    PROCESSING: "#3b82f6",
    SHIPPED: "#8b5cf6",
    DELIVERED: "#22c55e",
    CANCELLED: "#ef4444",
    REFUNDED: "#f97316",
  };
  return colors[status] || "#64748b";
}