import { SettingMenu } from '@components/admin/SettingMenu.js';
import Area from '@components/common/Area.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { Button } from '@components/common/ui/Button.js';
import { Badge } from '@components/common/ui/Badge.js';
import React, { useState, useEffect, useCallback } from 'react';

/* ──────────────────── Types ──────────────────── */

interface ProductMapping {
  mapId: number;
  evershopProductId: number;
  dropiProductId: number;
  dropiVariationId: number | null;
  dropiProductName: string | null;
  productName: string;
}

interface DropiSettingProps {
  saveDropiSettingApi: string;
  setting: {
    dropiApiKey: string | null;
    dropiEnvironment: string | null;
    dropiAutoSync: string | null;
  };
  productMappings: ProductMapping[];
}

/* ──────────────────── Toggle Switch ──────────────────── */

function ToggleSwitch({
  name,
  label,
  defaultValue
}: {
  name: string;
  label: string;
  defaultValue: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultValue);

  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium">{label}</label>
      <input type="hidden" name={name} value={enabled ? '1' : '0'} />
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

/* ──────────────────── Test Connection Section ──────────────────── */

function TestConnectionButton() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const resp = await fetch('/api/dropi/admin/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await resp.json();
      setResult({
        success: data.success,
        message: data.message
      });
    } catch (e) {
      setResult({
        success: false,
        message: `Error de conexion: ${(e as Error).message}`
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleTest}
        disabled={testing}
      >
        {testing ? 'Probando...' : 'Probar Conexion'}
      </Button>
      {result && (
        <div
          className={`p-3 rounded text-sm ${
            result.success
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {result.success ? '+ ' : '- '}
          {result.message}
        </div>
      )}
    </div>
  );
}

/* ──────────────────── Product Mapping Section ──────────────────── */

function ProductMappingSection({
  initialMappings
}: {
  initialMappings: ProductMapping[];
}) {
  const [mappings, setMappings] = useState<ProductMapping[]>(
    initialMappings || []
  );
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form fields
  const [evershopProductId, setEvershopProductId] = useState('');
  const [dropiProductId, setDropiProductId] = useState('');
  const [dropiVariationId, setDropiVariationId] = useState('');
  const [dropiProductName, setDropiProductName] = useState('');

  const resetForm = () => {
    setEvershopProductId('');
    setDropiProductId('');
    setDropiVariationId('');
    setDropiProductName('');
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSave = async () => {
    setFormError(null);
    setFormSuccess(null);

    if (!evershopProductId || !dropiProductId) {
      setFormError('Se requiere el ID del producto EverShop y el ID del producto Dropi');
      return;
    }

    setSaving(true);
    try {
      const resp = await fetch('/api/dropi/admin/product-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evershop_product_id: parseInt(evershopProductId, 10),
          dropi_product_id: parseInt(dropiProductId, 10),
          dropi_variation_id: dropiVariationId
            ? parseInt(dropiVariationId, 10)
            : null,
          dropi_product_name: dropiProductName || null
        })
      });
      const data = await resp.json();

      if (data.success) {
        setFormSuccess('Mapeo guardado correctamente');
        // Refresh mappings
        await refreshMappings();
        resetForm();
        setShowForm(false);
      } else {
        setFormError(data.message || 'Error al guardar');
      }
    } catch (e) {
      setFormError(`Error: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mapId: number) => {
    if (!confirm('Eliminar este mapeo de producto?')) return;

    setDeletingId(mapId);
    try {
      const resp = await fetch(
        `/api/dropi/admin/product-mapping/${mapId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const data = await resp.json();

      if (data.success) {
        setMappings((prev) => prev.filter((m) => m.mapId !== mapId));
      } else {
        alert(data.message || 'Error al eliminar');
      }
    } catch (e) {
      alert(`Error: ${(e as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const refreshMappings = async () => {
    try {
      const resp = await fetch('/api/dropi/admin/product-mapping');
      const data = await resp.json();
      if (data.success && data.data) {
        setMappings(
          data.data.map((m: any) => ({
            mapId: m.map_id,
            evershopProductId: m.evershop_product_id,
            dropiProductId: m.dropi_product_id,
            dropiVariationId: m.dropi_variation_id,
            dropiProductName: m.dropi_product_name,
            productName: m.product_name
          }))
        );
      }
    } catch {
      // Silently fail refresh
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing mappings table */}
      {mappings.length > 0 ? (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-2 font-semibold">Producto EverShop</th>
                <th className="text-left p-2 font-semibold">ID Dropi</th>
                <th className="text-left p-2 font-semibold">Variacion</th>
                <th className="text-left p-2 font-semibold">Nombre Dropi</th>
                <th className="text-center p-2 font-semibold w-20">Accion</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr
                  key={m.mapId}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="p-2">
                    {m.productName}
                    <span className="text-muted-foreground ml-1">
                      (#{m.evershopProductId})
                    </span>
                  </td>
                  <td className="p-2">{m.dropiProductId}</td>
                  <td className="p-2">
                    {m.dropiVariationId || '-'}
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {m.dropiProductName || '-'}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(m.mapId)}
                      disabled={deletingId === m.mapId}
                      className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                    >
                      {deletingId === m.mapId ? '...' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay productos mapeados todavia.
        </p>
      )}

      {/* Add mapping form */}
      {showForm ? (
        <div className="border border-border rounded p-4 space-y-3 bg-muted/30">
          <h4 className="text-sm font-semibold">Nuevo mapeo de producto</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                ID Producto EverShop *
              </label>
              <input
                type="number"
                value={evershopProductId}
                onChange={(e) => setEvershopProductId(e.target.value)}
                placeholder="Ej: 42"
                className="w-full px-3 py-2 border border-border rounded text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                ID Producto Dropi *
              </label>
              <input
                type="number"
                value={dropiProductId}
                onChange={(e) => setDropiProductId(e.target.value)}
                placeholder="Ej: 12345"
                className="w-full px-3 py-2 border border-border rounded text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                ID Variacion Dropi (opcional)
              </label>
              <input
                type="number"
                value={dropiVariationId}
                onChange={(e) => setDropiVariationId(e.target.value)}
                placeholder="Ej: 678"
                className="w-full px-3 py-2 border border-border rounded text-sm bg-background"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Nombre en Dropi (opcional)
              </label>
              <input
                type="text"
                value={dropiProductName}
                onChange={(e) => setDropiProductName(e.target.value)}
                placeholder="Ej: Camiseta Negra Talla M"
                className="w-full px-3 py-2 border border-border rounded text-sm bg-background"
              />
            </div>
          </div>

          {formError && (
            <div className="p-2 bg-red-50 text-red-800 border border-red-200 rounded text-sm">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-2 bg-green-50 text-green-800 border border-green-200 rounded text-sm">
              {formSuccess}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar Mapeo'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
        >
          + Agregar Mapeo
        </Button>
      )}
    </div>
  );
}

/* ──────────────────── Sync Log Section ──────────────────── */

interface SyncRecord {
  sync_id: number;
  evershop_order_id: number;
  order_number: string | null;
  grand_total: string | null;
  dropi_order_id: string | null;
  dropi_guide_number: string | null;
  status: string;
  dropi_status: string | null;
  error_message: string | null;
  synced_at: string | null;
  created_at: string;
}

interface SyncSummary {
  total: number;
  synced: number;
  failed: number;
  pending: number;
  cancelled: number;
  last_sync: string | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'synced':
      return <Badge variant="success">Sincronizado</Badge>;
    case 'pending':
      return <Badge variant="warning">Pendiente</Badge>;
    case 'failed':
      return <Badge variant="destructive">Error</Badge>;
    case 'cancelled':
      return <Badge variant="secondary">Cancelado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function SyncLogSection() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [records, setRecords] = useState<SyncRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSyncLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/dropi/admin/sync-log');
      const data = await resp.json();
      if (data.success && data.data) {
        setSummary(data.data.summary);
        setRecords(data.data.records.slice(0, 10)); // Mostrar solo los ultimos 10
      } else {
        setError(data.message || 'Error al cargar log');
      }
    } catch (e) {
      setError(`Error de conexion: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSyncLog();
  }, [fetchSyncLog]);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Cargando log de sincronizacion...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-border rounded p-3 text-center">
            <div className="text-2xl font-bold">{summary.synced}</div>
            <div className="text-xs text-muted-foreground">Sincronizados</div>
          </div>
          <div className="border border-border rounded p-3 text-center">
            <div className="text-2xl font-bold text-red-600">
              {summary.failed}
            </div>
            <div className="text-xs text-muted-foreground">Fallidos</div>
          </div>
          <div className="border border-border rounded p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {summary.pending}
            </div>
            <div className="text-xs text-muted-foreground">Pendientes</div>
          </div>
          <div className="border border-border rounded p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">
              Ultima sincronizacion
            </div>
            <div className="text-xs font-medium">
              {summary.last_sync
                ? new Date(summary.last_sync).toLocaleString('es-CO')
                : 'Nunca'}
            </div>
          </div>
        </div>
      )}

      {/* Recent sync records */}
      {records.length > 0 ? (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-2 font-semibold">Pedido</th>
                <th className="text-left p-2 font-semibold">Total</th>
                <th className="text-left p-2 font-semibold">Estado</th>
                <th className="text-left p-2 font-semibold">ID Dropi</th>
                <th className="text-left p-2 font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr
                  key={r.sync_id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="p-2">
                    {r.order_number
                      ? `#${r.order_number}`
                      : `ID: ${r.evershop_order_id}`}
                  </td>
                  <td className="p-2">
                    {r.grand_total
                      ? `$${parseFloat(r.grand_total).toLocaleString('es-CO')}`
                      : '-'}
                  </td>
                  <td className="p-2">{getStatusBadge(r.status)}</td>
                  <td className="p-2">
                    {r.dropi_order_id || '-'}
                    {r.dropi_guide_number && (
                      <div className="text-xs text-muted-foreground">
                        Guia: {r.dropi_guide_number}
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString('es-CO')}
                    {r.error_message && (
                      <div
                        className="text-red-600 mt-1 truncate max-w-[200px]"
                        title={r.error_message}
                      >
                        {r.error_message}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay registros de sincronizacion.
        </p>
      )}

      <Button type="button" variant="outline" size="sm" onClick={fetchSyncLog}>
        Actualizar Log
      </Button>
    </div>
  );
}

/* ──────────────────── Main Component ──────────────────── */

export default function DropiSetting({
  saveDropiSettingApi,
  setting: { dropiApiKey, dropiEnvironment, dropiAutoSync },
  productMappings
}: DropiSettingProps) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4 space-y-6">
          {/* ── Card 1: Configuracion General ── */}
          <Form method="POST" id="dropiSetting" action={saveDropiSettingApi}>
            <Card>
              <CardHeader>
                <CardTitle>Integracion Dropi</CardTitle>
                <CardDescription>
                  Configura la conexion con la plataforma de dropshipping Dropi
                  para sincronizar pedidos automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Area
                  id="dropiSettingGeneral"
                  className="space-y-4"
                  coreComponents={[
                    {
                      component: {
                        default: (
                          <InputField
                            name="dropiApiKey"
                            label="Token de integracion Dropi"
                            placeholder="Ingresa tu token de integracion de Dropi"
                            defaultValue={dropiApiKey || ''}
                            type="password"
                          />
                        )
                      },
                      sortOrder: 10
                    },
                    {
                      component: {
                        default: (
                          <SelectField
                            name="dropiEnvironment"
                            label="Ambiente"
                            defaultValue={dropiEnvironment || 'test'}
                            options={[
                              { value: 'test', label: 'Test (Pruebas)' },
                              {
                                value: 'production',
                                label: 'Produccion (En vivo)'
                              }
                            ]}
                          />
                        )
                      },
                      sortOrder: 20
                    },
                    {
                      component: {
                        default: (
                          <ToggleSwitch
                            name="dropiAutoSync"
                            label="Sincronizacion automatica"
                            defaultValue={dropiAutoSync === '1'}
                          />
                        )
                      },
                      sortOrder: 30
                    },
                    {
                      component: {
                        default: <TestConnectionButton />
                      },
                      sortOrder: 40
                    }
                  ]}
                />
              </CardContent>
            </Card>
          </Form>

          {/* ── Card 2: Mapeo de Productos ── */}
          <Card>
            <CardHeader>
              <CardTitle>Mapeo de Productos</CardTitle>
              <CardDescription>
                Vincula tus productos de EverShop con los productos de Dropi.
                Cada producto de tu tienda debe estar mapeado a su equivalente
                en el catalogo de Dropi para que los pedidos se sincronicen
                correctamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductMappingSection initialMappings={productMappings || []} />
            </CardContent>
          </Card>

          {/* ── Card 3: Log de Sincronizacion ── */}
          <Card>
            <CardHeader>
              <CardTitle>Log de Sincronizacion</CardTitle>
              <CardDescription>
                Resumen y registro de los ultimos pedidos sincronizados con
                Dropi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SyncLogSection />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    saveDropiSettingApi: url(routeId: "saveSetting")
    setting {
      dropiApiKey
      dropiEnvironment
      dropiAutoSync
    }
    productMappings: dropiProductMappings {
      mapId
      evershopProductId
      dropiProductId
      dropiVariationId
      dropiProductName
      productName
    }
  }
`;
