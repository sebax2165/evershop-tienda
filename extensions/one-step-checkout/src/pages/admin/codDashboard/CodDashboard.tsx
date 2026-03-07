import React, { useEffect, useState } from 'react';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  abandonedOrders: number;
  conversionRate: number;
  upsellAcceptRate: number;
  recentOrders: Array<{
    order_id: number;
    order_number: string;
    grand_total: number;
    created_at: string;
    payment_status: string;
  }>;
  topProducts: Array<{
    product_name: string;
    total_orders: number;
    total_revenue: number;
  }>;
  last7DaysOrders: number;
  last30DaysOrders: number;
  last7DaysRevenue: number;
  last30DaysRevenue: number;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export default function CodDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/cod/dashboard-stats?period=${period}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setStats(json.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando estadisticas:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">
            Cargando estadisticas...
          </p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center bg-background border border-destructive/20 rounded-lg p-8 max-w-md">
          <svg
            className="h-12 w-12 text-destructive mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Error al cargar datos
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const data = stats || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    abandonedOrders: 0,
    conversionRate: 0,
    upsellAcceptRate: 0,
    recentOrders: [],
    topProducts: [],
    last7DaysOrders: 0,
    last30DaysOrders: 0,
    last7DaysRevenue: 0,
    last30DaysRevenue: 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Panel de Control COD
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resumen de rendimiento del formulario de pago contra entrega
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | 'all')}
            className="border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="all">Todo el tiempo</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pedidos"
          value={data.totalOrders.toLocaleString('es-CO')}
          subtitle={
            period === '30d'
              ? `${data.last7DaysOrders} en los ultimos 7 dias`
              : undefined
          }
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          }
        />
        <StatCard
          title="Ingresos Totales"
          value={formatCurrency(data.totalRevenue)}
          subtitle={
            period === '30d'
              ? `${formatCurrency(data.last7DaysRevenue)} ultimos 7 dias`
              : undefined
          }
          color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          title="Valor Promedio (AOV)"
          value={formatCurrency(data.averageOrderValue)}
          color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          title="Tasa de Conversion"
          value={`${data.conversionRate}%`}
          subtitle={`${data.abandonedOrders} pedidos abandonados`}
          color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
      </div>

      {/* Upsell Performance & Chart Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upsell Performance */}
        <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Rendimiento de Upsells
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Tasa de aceptacion
              </span>
              <span className="text-sm font-semibold text-foreground">
                {data.upsellAcceptRate}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary rounded-full h-3 transition-all duration-500"
                style={{ width: `${Math.min(data.upsellAcceptRate, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground">
              Porcentaje de clientes que aceptaron al menos un upsell durante el
              checkout
            </p>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Tendencia de Pedidos
          </h2>
          <div className="flex items-center justify-center h-48 border border-dashed border-border rounded-lg bg-muted/30">
            <div className="text-center">
              <svg
                className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-sm text-muted-foreground">
                Grafica de tendencias
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Proximamente
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-background border border-border rounded-lg shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              Pedidos Recientes
            </h2>
          </div>
          <div className="overflow-x-auto">
            {data.recentOrders.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      # Pedido
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.recentOrders.map((order, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-6 py-3 text-sm font-medium text-foreground">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-3 text-sm text-foreground">
                        {formatCurrency(order.grand_total)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {order.payment_status === 'paid'
                            ? 'Pagado'
                            : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No hay pedidos recientes
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-background border border-border rounded-lg shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              Productos Mas Vendidos
            </h2>
          </div>
          <div className="overflow-x-auto">
            {data.topProducts && data.topProducts.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Pedidos
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.topProducts.map((product, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-6 py-3 text-sm font-medium text-foreground truncate max-w-[200px]">
                        {product.product_name}
                      </td>
                      <td className="px-6 py-3 text-sm text-foreground text-right">
                        {product.total_orders}
                      </td>
                      <td className="px-6 py-3 text-sm text-foreground text-right">
                        {formatCurrency(product.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No hay datos de productos disponibles
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};
