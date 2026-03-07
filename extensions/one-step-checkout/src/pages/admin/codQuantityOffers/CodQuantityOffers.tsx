import React, { useEffect, useState, useCallback } from 'react';

interface QuantityOffer {
  offer_id: number;
  uuid: string;
  product_id: number;
  qty: number;
  discount_type: string;
  discount_value: number;
  label: string | null;
  badge_text: string | null;
  is_preselected: boolean;
  sort_order: number;
  enabled: boolean;
  created_at: string;
}

interface OfferForm {
  qty: string;
  discount_type: string;
  discount_value: string;
  label: string;
  badge_text: string;
  is_preselected: boolean;
  sort_order: string;
  enabled: boolean;
}

const defaultForm: OfferForm = {
  qty: '2',
  discount_type: 'percentage',
  discount_value: '10',
  label: '',
  badge_text: '',
  is_preselected: false,
  sort_order: '0',
  enabled: true
};

export default function CodQuantityOffers() {
  const [productId, setProductId] = useState('');
  const [offers, setOffers] = useState<QuantityOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OfferForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchOffers = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/cod/quantity-offers/${encodeURIComponent(productId)}`,
        { credentials: 'same-origin', headers: { Accept: 'application/json' } }
      );
      const json = await res.json();
      if (json.success) {
        setOffers(json.data || []);
      } else {
        setError(json.message || 'Error al cargar ofertas');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const handleSearch = () => {
    if (productId.trim()) {
      fetchOffers();
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
        `/api/admin/cod/quantity-offers/${encodeURIComponent(productId)}`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qty: parseInt(form.qty, 10),
            discount_type: form.discount_type,
            discount_value: parseFloat(form.discount_value),
            label: form.label || null,
            badge_text: form.badge_text || null,
            is_preselected: form.is_preselected,
            sort_order: parseInt(form.sort_order, 10),
            enabled: form.enabled
          })
        }
      );
      const json = await res.json();
      if (json.success) {
        setForm(defaultForm);
        setShowForm(false);
        fetchOffers();
      } else {
        setError(json.message || 'Error al crear oferta');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (offerId: number) => {
    if (!confirm('Seguro que deseas eliminar esta oferta?')) return;
    try {
      const res = await fetch(
        `/api/admin/cod/quantity-offers/${encodeURIComponent(offerId)}`,
        {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const json = await res.json();
      if (json.success) {
        fetchOffers();
      } else {
        setError(json.message || 'Error al eliminar');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Ofertas por Cantidad
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura descuentos por cantidad para cada producto
        </p>
      </div>

      {/* Buscador */}
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
          <p className="text-muted-foreground">Cargando ofertas...</p>
        </div>
      )}

      {!loading && productId && offers.length === 0 && !error && (
        <div className="bg-background border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No se encontraron ofertas para este producto.
          </p>
        </div>
      )}

      {/* Tabla de ofertas */}
      {!loading && offers.length > 0 && (
        <div className="bg-background border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Ofertas del Producto #{productId}
            </h2>
            <span className="text-sm text-muted-foreground">
              {offers.length} oferta(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Cantidad
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Tipo Descuento
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Valor Descuento
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Etiqueta
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Badge
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Por Defecto
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Posicion
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Activo
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr
                    key={o.offer_id}
                    className="border-b border-border hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {o.qty} unidades
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          o.discount_type === 'percentage'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}
                      >
                        {o.discount_type === 'percentage'
                          ? 'Porcentaje'
                          : 'Fijo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {o.discount_value}
                      {o.discount_type === 'percentage' ? '%' : ''}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {o.label || '-'}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {o.badge_text || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          o.is_preselected ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      <span className="ml-2 text-foreground">
                        {o.is_preselected ? 'Si' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {o.sort_order}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          o.enabled ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="ml-2 text-foreground">
                        {o.enabled ? 'Si' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleDelete(o.offer_id)}
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

      {/* Boton y formulario nueva oferta */}
      {productId && (
        <div>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + Nueva Oferta
            </button>
          ) : (
            <div className="bg-background border border-border rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Nueva Oferta por Cantidad
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.qty}
                      onChange={(e) =>
                        setForm({ ...form, qty: e.target.value })
                      }
                      required
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
                      min="0"
                      value={form.discount_value}
                      onChange={(e) =>
                        setForm({ ...form, discount_value: e.target.value })
                      }
                      required
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Etiqueta
                    </label>
                    <input
                      type="text"
                      value={form.label}
                      onChange={(e) =>
                        setForm({ ...form, label: e.target.value })
                      }
                      placeholder="Ej: Mas Popular"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Badge
                    </label>
                    <input
                      type="text"
                      value={form.badge_text}
                      onChange={(e) =>
                        setForm({ ...form, badge_text: e.target.value })
                      }
                      placeholder="Ej: -20% OFF"
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
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_preselected}
                      onChange={(e) =>
                        setForm({ ...form, is_preselected: e.target.checked })
                      }
                      className="rounded border-border"
                    />
                    Preseleccionado
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
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {saving ? 'Guardando...' : 'Crear Oferta'}
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
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = '';
