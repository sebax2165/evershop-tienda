import React, { useState, useEffect } from 'react';

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

export default function CodSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/cod/settings', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setSettings(result.data || {});
        }
      })
      .catch((e) => {
        setMessage({ type: 'error', text: e.message });
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/cod/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(settings)
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: 'Configuracion guardada correctamente' });
      } else {
        setMessage({ type: 'error', text: result.message || 'Error al guardar' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">Cargando configuracion...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Configuracion COD</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
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

      {/* Seccion: Prevencion de Fraude */}
      <div className="bg-popover border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Prevencion de Fraude</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Limites de ordenes por periodo de 24 horas para prevenir abuso.
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Max ordenes por IP (24h)
            </label>
            <input
              type="number"
              min="1"
              value={settings.fraud_max_orders_per_ip_24h || '5'}
              onChange={(e) => update('fraud_max_orders_per_ip_24h', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Max ordenes por telefono (24h)
            </label>
            <input
              type="number"
              min="1"
              value={settings.fraud_max_orders_per_phone_24h || '3'}
              onChange={(e) => update('fraud_max_orders_per_phone_24h', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Max ordenes por email (24h)
            </label>
            <input
              type="number"
              min="1"
              value={settings.fraud_max_orders_per_email_24h || '3'}
              onChange={(e) => update('fraud_max_orders_per_email_24h', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Seccion: Verificacion OTP */}
      <div className="bg-popover border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Verificacion OTP</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configuracion de verificacion por codigo OTP via SMS o WhatsApp.
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Toggle
            label="OTP habilitado"
            checked={settings.otp_enabled === 'true'}
            onChange={(v) => update('otp_enabled', v ? 'true' : 'false')}
          />

          {settings.otp_enabled === 'true' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Proveedor
                </label>
                <select
                  value={settings.otp_provider || 'telesign'}
                  onChange={(e) => update('otp_provider', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="telesign">TeleSign</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Canal de envio
                </label>
                <select
                  value={settings.otp_channel || 'whatsapp'}
                  onChange={(e) => update('otp_channel', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Momento de verificacion
                </label>
                <select
                  value={settings.otp_timing || 'before'}
                  onChange={(e) => update('otp_timing', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="before">Antes del pedido</option>
                  <option value="after">Despues del pedido</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Expiracion del codigo (minutos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.otp_expiry_minutes || '5'}
                    onChange={(e) => update('otp_expiry_minutes', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Max intentos
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.otp_max_attempts || '3'}
                    onChange={(e) => update('otp_max_attempts', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  TeleSign Customer ID
                </label>
                <input
                  type="text"
                  value={settings.telesign_customer_id || ''}
                  onChange={(e) => update('telesign_customer_id', e.target.value)}
                  placeholder="Ingrese su Customer ID de TeleSign"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  TeleSign API Key
                </label>
                <input
                  type="password"
                  value={settings.telesign_api_key || ''}
                  onChange={(e) => update('telesign_api_key', e.target.value)}
                  placeholder="Ingrese su API Key de TeleSign"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Seccion: Pago Parcial */}
      <div className="bg-popover border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Pago Parcial</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Permite cobrar un deposito parcial al momento de la orden.
          </p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <Toggle
            label="Pago parcial habilitado"
            checked={settings.partial_payment_enabled === 'true'}
            onChange={(v) => update('partial_payment_enabled', v ? 'true' : 'false')}
          />

          {settings.partial_payment_enabled === 'true' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tipo de deposito
                </label>
                <select
                  value={settings.partial_payment_deposit_type || 'percentage'}
                  onChange={(e) => update('partial_payment_deposit_type', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Valor del deposito{' '}
                  {settings.partial_payment_deposit_type === 'percentage' ? '(%)' : '($)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.partial_payment_deposit_value || '50'}
                  onChange={(e) => update('partial_payment_deposit_value', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Boton guardar inferior */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = '';
