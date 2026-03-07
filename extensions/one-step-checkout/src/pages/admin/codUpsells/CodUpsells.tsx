import React, { useEffect, useState, useCallback } from 'react';

interface Upsell {
  upsell_id: number;
  uuid: string;
  trigger_product_id: number;
  offer_product_id: number;
  upsell_type: string;
  title: string | null;
  description: string | null;
  discount_type: string;
  discount_value: number;
  show_timer: boolean;
  timer_seconds: number;
  sort_order: number;
  enabled: boolean;
  ab_variant: string | null;
  created_at: string;
}

interface UpsellEvent {
  upsell_id: number;
  event_type: string;
  count: number;
}

interface UpsellForm {
  upsell_type: string;
  offer_product_id: string;
  title: string;
  description: string;
  discount_type: string;
  discount_value: string;
  show_timer: boolean;
  timer_seconds: string;
  sort_order: string;
  enabled: boolean;
}

const defaultForm: UpsellForm = {
  upsell_type: 'one_tick',
  offer_product_id: '',
  title: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '0',
  show_timer: false,
  timer_seconds: '60',
  sort_order: '0',
  enabled: true
};

export default function CodUpsells() {
  const [productId, setProductId] = useState('');
  const [upsells, setUpsells] = useState<Upsell[]>([]);
  const [analytics, setAnalytics] = useState<UpsellEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UpsellForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchUpsells = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/cod/upsells/${encodeURIComponent(productId)}`,
        { credentials: 'same-origin', headers: { Accept: 'application/json' } }
      );
      const json = await res.json();
      if (json.success) {
        setUpsells(json.data || []);
      } else {
        setError(json.message || 'Error al cargar upsells');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const fetchAnalytics = useCallback(async () => {
    if (!productId) return;
    try {
      const res = await fetch(
        `/api/admin/cod/upsells/${encodeURIComponent(productId)}/analytics`,
        { credentials: 'same-origin', headers: { Accept: 'application/json' } }
      );
      const json = await res.json();
      if (json.success) {
        setAnalytics(json.data || []);
      }
    } catch {
      // Analytics are optional, don't block the page
    }
  }, [productId]);

  const handleSearch = () => {
    if (productId.trim()) {
      fetchUpsells();
      fetchAnalytics();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/cod/upsells/${encodeURIComponent(productId)}`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upsell_type: form.upsell_type,
            offer_product_id: parseInt(form.offer_product_id, 10),
            title: form.title || null,
            description: form.description || null,
            discount_type: form.discount_type,
            discount_value: parseFloat(form.discount_value),
            show_timer: form.show_timer,
            timer_seconds: parseInt(form.timer_seconds, 10),
            sort_order: parseInt(form.sort_order, 10),
            enabled: form.enabled
          })
        }
      );
      const json = await res.json();
      if (json.success) {
        setForm(defaultForm);
        setShowForm(false);
        fetchUpsells();
      } else {
        setError(json.message || 'Error al crear upsell');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (upsellId: number) => {
    if (!confirm('Seguro que deseas eliminar este upsell?')) return;
    try {
      const res = await fetch(
        `/api/admin/cod/upsells/${encodeURIComponent(productId)}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upsell_id: upsellId })
        }
      );
      const json = await res.json();
      if (json.success) {
        fetchUpsells();
      } else {
        setError(json.message || 'Error al eliminar');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const getAcceptanceRate = (upsellId: number): string => {
    const impressions = analytics.find(
      (a) => a.upsell_id === upsellId && a.event_type === 'impression'
    );
    const accepts = analytics.find(
      (a) => a.upsell_id === upsellId && a.event_type === 'accept'
    );
    if (!impressions || impressions.count === 0) return 'Sin datos';
    const rate = ((accepts?.count || 0) / impressions.count) * 100;
    return `${rate.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Gestion de Upsells
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra las ofertas de upsell por producto
          </p>
        </div>
      </div>

      {/* Buscador por producto */}
      <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
        <label className="block text-sm font-medium text-foreground mb-2">
          ID del Producto
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ingresa el ID del producto"
            className="flex-1 border border-border rounded-lg px-4 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={!productId.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Buscar
          </button>
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
          <p className="text-muted-foreground">Cargando upsells...</p>
        </div>
      )}

      {!loading && productId && upsells.length === 0 && !error && (
        <div className="bg-background border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No se encontraron upsells para este producto.
          </p>
        </div>
      )}

      {/* Tabla de upsells */}
      {!loading && upsells.length > 0 && (
        <div className="bg-background border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Upsells del Producto #{productId}
            </h2>
            <span className="text-sm text-muted-foreground">
              {upsells.length} upsell(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Titulo
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Producto Oferta
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Descuento
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Posicion
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Timer
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Activo
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Tasa Aceptacion
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {upsells.map((u) => (
                  <tr
                    key={u.upsell_id}
                    className="border-b border-border hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          u.upsell_type === 'one_tick'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}
                      >
                        {u.upsell_type === 'one_tick'
                          ? 'Pre-compra'
                          : 'Post-compra'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {u.title || '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      #{u.offer_product_id}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {u.discount_value}
                      {u.discount_type === 'percentage' ? '%' : ' fijo'}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {u.sort_order}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {u.show_timer ? `${u.timer_seconds}s` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          u.enabled ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="ml-2 text-foreground">
                        {u.enabled ? 'Si' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {getAcceptanceRate(u.upsell_id)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(u.upsell_id)}
                        className="text-destructive hover:underline text-xs font-medium"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Boton nuevo upsell */}
      {productId && (
        <div>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + Nuevo Upsell
            </button>
          ) : (
            <div className="bg-background border border-border rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Nuevo Upsell
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Tipo de Upsell
                    </label>
                    <select
                      value={form.upsell_type}
                      onChange={(e) =>
                        setForm({ ...form, upsell_type: e.target.value })
                      }
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="one_tick">Pre-compra (One Tick)</option>
                      <option value="one_click">Post-compra (One Click)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      ID Producto Oferta
                    </label>
                    <input
                      type="number"
                      value={form.offer_product_id}
                      onChange={(e) =>
                        setForm({ ...form, offer_product_id: e.target.value })
                      }
                      required
                      placeholder="ID del producto a ofrecer"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Titulo
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      placeholder="Titulo del upsell"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Tipo Descuento
                    </label>
                    <select
                      value={form.discount_type}
                      onChange={(e) =>
                        setForm({ ...form, discount_type: e.target.value })
                      }
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="percentage">Porcentaje</option>
                      <option value="fixed">Valor Fijo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Valor Descuento
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.discount_value}
                      onChange={(e) =>
                        setForm({ ...form, discount_value: e.target.value })
                      }
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Posicion
                    </label>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) =>
                        setForm({ ...form, sort_order: e.target.value })
                      }
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {form.upsell_type === 'one_click' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Segundos del Timer
                      </label>
                      <input
                        type="number"
                        value={form.timer_seconds}
                        onChange={(e) =>
                          setForm({ ...form, timer_seconds: e.target.value })
                        }
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Descripcion
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      rows={2}
                      placeholder="Descripcion del upsell (opcional)"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.show_timer}
                        onChange={(e) =>
                          setForm({ ...form, show_timer: e.target.checked })
                        }
                        className="rounded border-border"
                      />
                      Mostrar Timer
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.enabled}
                        onChange={(e) =>
                          setForm({ ...form, enabled: e.target.checked })
                        }
                        className="rounded border-border"
                      />
                      Activo
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {saving ? 'Guardando...' : 'Crear Upsell'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setForm(defaultForm);
                    }}
                    className="px-6 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Seccion de analiticas */}
      {!loading && upsells.length > 0 && analytics.length > 0 && (
        <div className="bg-background border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Analiticas de Upsells
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Upsell ID
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Impresiones
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Aceptaciones
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Rechazos
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Tasa de Aceptacion
                  </th>
                </tr>
              </thead>
              <tbody>
                {upsells.map((u) => {
                  const impressions =
                    analytics.find(
                      (a) =>
                        a.upsell_id === u.upsell_id &&
                        a.event_type === 'impression'
                    )?.count || 0;
                  const accepts =
                    analytics.find(
                      (a) =>
                        a.upsell_id === u.upsell_id &&
                        a.event_type === 'accept'
                    )?.count || 0;
                  const declines =
                    analytics.find(
                      (a) =>
                        a.upsell_id === u.upsell_id &&
                        a.event_type === 'decline'
                    )?.count || 0;
                  const rate =
                    impressions > 0
                      ? ((accepts / impressions) * 100).toFixed(1)
                      : '0';
                  return (
                    <tr
                      key={u.upsell_id}
                      className="border-b border-border hover:bg-muted/10"
                    >
                      <td className="px-4 py-3 text-foreground">
                        #{u.upsell_id} - {u.title || u.upsell_type}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {impressions}
                      </td>
                      <td className="px-4 py-3 text-green-600">{accepts}</td>
                      <td className="px-4 py-3 text-red-600">{declines}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {rate}%
                      </td>
                    </tr>
                  );
                })}
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
