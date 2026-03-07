import React, { useEffect, useState } from 'react';

interface AbandonedOrder {
  abandoned_id: number;
  uuid: string;
  product_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  form_data: any;
  cart_total: number;
  recovery_status: string;
  recovery_channel: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  recovered:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  contacted:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  recovered: 'Recuperado',
  failed: 'Fallido',
  contacted: 'Contactado'
};

export default function CodAbandonedOrders() {
  const [orders, setOrders] = useState<AbandonedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cod/abandoned-orders`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        setOrders(json.data || []);
      } else {
        setError(json.message || 'Error al cargar pedidos abandonados');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Estadisticas rapidas
  const totalAbandoned = orders.length;
  const totalPending = orders.filter(
    (o) => o.recovery_status === 'pending'
  ).length;
  const totalRecovered = orders.filter(
    (o) => o.recovery_status === 'recovered'
  ).length;
  const totalRevenueLost = orders
    .filter((o) => o.recovery_status !== 'recovered')
    .reduce((sum, o) => sum + (Number(o.cart_total) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Pedidos Abandonados
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pedidos que no fueron completados en el formulario COD
        </p>
      </div>

      {/* Estadisticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">
            Total Abandonados
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {totalAbandoned}
          </p>
        </div>
        <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">
            Pendientes
          </p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {totalPending}
          </p>
        </div>
        <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">
            Recuperados
          </p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {totalRecovered}
          </p>
        </div>
        <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">
            Ingreso Perdido
          </p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(totalRevenueLost)}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 underline text-xs"
          >
            Cerrar
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-background border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            Cargando pedidos abandonados...
          </p>
        </div>
      )}

      {!loading && orders.length === 0 && !error && (
        <div className="bg-background border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No hay pedidos abandonados registrados.
          </p>
        </div>
      )}

      {/* Tabla */}
      {!loading && orders.length > 0 && (
        <div className="bg-background border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Ultimos 100 pedidos abandonados
            </h2>
            <button
              type="button"
              onClick={fetchOrders}
              className="px-4 py-1.5 text-xs font-medium border border-border rounded-lg text-foreground hover:bg-muted/50 transition-colors"
            >
              Actualizar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Telefono
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Producto
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Estado Recuperacion
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Canal
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    UTM Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.abandoned_id}
                    className="border-b border-border hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {o.customer_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs">
                      {o.customer_phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs">
                      {o.customer_email || '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {o.product_id ? `#${o.product_id}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground font-semibold whitespace-nowrap">
                      {formatCurrency(Number(o.cart_total) || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          STATUS_COLORS[o.recovery_status] ||
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}
                      >
                        {STATUS_LABELS[o.recovery_status] ||
                          o.recovery_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs">
                      {o.recovery_channel || '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs">
                      {o.utm_source || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = '';
