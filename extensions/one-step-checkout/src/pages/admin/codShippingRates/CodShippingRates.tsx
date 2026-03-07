import React, { useState, useEffect } from 'react';

const COUNTRY_OPTIONS = [
  { value: 'CO', label: 'Colombia' },
  { value: 'MX', label: 'Mexico' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Peru' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'BR', label: 'Brasil' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'PA', label: 'Panama' },
  { value: 'CR', label: 'Costa Rica' },
  { value: 'DO', label: 'Republica Dominicana' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'HN', label: 'Honduras' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'NI', label: 'Nicaragua' }
];

const emptyForm = {
  name: '',
  country: 'CO',
  province: '',
  min_order_value: '0',
  max_order_value: '',
  min_weight: '0',
  max_weight: '',
  rate_amount: '0',
  free_shipping_threshold: '',
  enabled: true
};

export default function CodShippingRates() {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const fetchRates = async () => {
    try {
      const res = await fetch('/api/admin/cod/shipping-rates', { credentials: 'same-origin' });
      const result = await res.json();
      if (result.success) {
        setRates(result.data || []);
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const updateForm = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, any> = {
        name: form.name || `${form.country} - ${form.province || 'Todos'}`,
        country: form.country,
        province: form.province || null,
        min_order_value: parseFloat(form.min_order_value) || 0,
        max_order_value: form.max_order_value ? parseFloat(form.max_order_value) : null,
        min_weight: parseFloat(form.min_weight) || 0,
        max_weight: form.max_weight ? parseFloat(form.max_weight) : null,
        rate_amount: parseFloat(form.rate_amount) || 0,
        free_shipping_threshold: form.free_shipping_threshold
          ? parseFloat(form.free_shipping_threshold)
          : null,
        enabled: form.enabled
      };

      const res = await fetch('/api/admin/cod/shipping-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: 'Tarifa creada correctamente' });
        setForm({ ...emptyForm });
        setShowForm(false);
        await fetchRates();
      } else {
        setMessage({ type: 'error', text: result.message || 'Error al crear tarifa' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rateId: number) => {
    if (!window.confirm('Estas seguro de que deseas eliminar esta tarifa?')) {
      return;
    }
    setDeleting(rateId);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/cod/shipping-rates/${rateId}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: 'Tarifa eliminada' });
        setRates((prev) => prev.filter((r) => r.rate_id !== rateId));
      } else {
        setMessage({ type: 'error', text: result.message || 'Error al eliminar' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setDeleting(null);
    }
  };

  const getCountryLabel = (code: string) => {
    const found = COUNTRY_OPTIONS.find((c) => c.value === code);
    return found ? found.label : code;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">Cargando tarifas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tarifas de Envio</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Cancelar' : 'Nueva Tarifa'}
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Formulario de nueva tarifa */}
      {showForm && (
        <div className="bg-popover border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Nueva Tarifa de Envio</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="Ej: Envio nacional Colombia"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Pais</label>
                <select
                  value={form.country}
                  onChange={(e) => updateForm('country', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Provincia / Departamento
                </label>
                <input
                  type="text"
                  value={form.province}
                  onChange={(e) => updateForm('province', e.target.value)}
                  placeholder="Dejar vacio para todo el pais"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tarifa ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rate_amount}
                  onChange={(e) => updateForm('rate_amount', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Monto minimo de orden ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_order_value}
                  onChange={(e) => updateForm('min_order_value', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Monto maximo de orden ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_order_value}
                  onChange={(e) => updateForm('max_order_value', e.target.value)}
                  placeholder="Sin limite"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Peso minimo (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_weight}
                  onChange={(e) => updateForm('min_weight', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Peso maximo (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_weight}
                  onChange={(e) => updateForm('max_weight', e.target.value)}
                  placeholder="Sin limite"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Envio gratis desde ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.free_shipping_threshold}
                  onChange={(e) => updateForm('free_shipping_threshold', e.target.value)}
                  placeholder="Dejar vacio para no ofrecer"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => updateForm('enabled', e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-foreground">Activa</span>
                </label>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Guardando...' : 'Crear Tarifa'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla de tarifas */}
      <div className="bg-popover border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-foreground">Pais</th>
                <th className="text-left px-4 py-3 font-medium text-foreground">Provincia</th>
                <th className="text-right px-4 py-3 font-medium text-foreground">Monto Min</th>
                <th className="text-right px-4 py-3 font-medium text-foreground">Monto Max</th>
                <th className="text-right px-4 py-3 font-medium text-foreground">Peso Min</th>
                <th className="text-right px-4 py-3 font-medium text-foreground">Peso Max</th>
                <th className="text-right px-4 py-3 font-medium text-foreground">Tarifa</th>
                <th className="text-right px-4 py-3 font-medium text-foreground">
                  Envio Gratis desde
                </th>
                <th className="text-center px-4 py-3 font-medium text-foreground">Estado</th>
                <th className="text-center px-4 py-3 font-medium text-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No hay tarifas de envio configuradas. Haz clic en "Nueva Tarifa" para crear
                    una.
                  </td>
                </tr>
              ) : (
                rates.map((rate) => (
                  <tr
                    key={rate.rate_id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground">
                      {getCountryLabel(rate.country)}
                    </td>
                    <td className="px-4 py-3 text-foreground">{rate.province || '-'}</td>
                    <td className="px-4 py-3 text-right text-foreground">
                      ${parseFloat(rate.min_order_value || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {rate.max_order_value
                        ? `$${parseFloat(rate.max_order_value).toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {parseFloat(rate.min_weight || 0).toFixed(2)} kg
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {rate.max_weight
                        ? `${parseFloat(rate.max_weight).toFixed(2)} kg`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      ${parseFloat(rate.rate_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {rate.free_shipping_threshold
                        ? `$${parseFloat(rate.free_shipping_threshold).toFixed(2)}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          rate.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rate.enabled ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(rate.rate_id)}
                        disabled={deleting === rate.rate_id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50 transition-colors"
                      >
                        {deleting === rate.rate_id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = '';
