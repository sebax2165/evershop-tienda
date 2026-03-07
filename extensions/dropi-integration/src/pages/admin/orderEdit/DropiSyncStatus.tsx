import { Badge } from '@components/common/ui/Badge.js';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import { Button } from '@components/common/ui/Button.js';
import React, { useState } from 'react';

interface DropiSyncInfo {
  syncId: number;
  dropiOrderId: string | null;
  dropiGuideNumber: string | null;
  status: string;
  dropiStatus: string | null;
  errorMessage: string | null;
  syncedAt: string | null;
  createdAt: string;
}

interface DropiSyncStatusProps {
  order: {
    uuid: string;
    orderId: number;
  };
  dropiSync: DropiSyncInfo | null;
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

export default function DropiSyncStatus({
  order,
  dropiSync
}: DropiSyncStatusProps) {
  const [syncing, setSyncing] = useState(false);
  const [generatingGuide, setGeneratingGuide] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'success' | 'error'>('success');

  const handleResync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const resp = await fetch(
        `/api/admin/dropi/sync/${order.uuid}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const data = await resp.json();
      if (data.success) {
        setResultType('success');
        setSyncResult('Sincronizacion exitosa. Recarga la pagina para ver el estado actualizado.');
      } else {
        setResultType('error');
        setSyncResult(`Error: ${data.message || 'Error desconocido'}`);
      }
    } catch (e) {
      setResultType('error');
      setSyncResult(`Error de conexion: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateGuide = async () => {
    setGeneratingGuide(true);
    setSyncResult(null);
    try {
      const resp = await fetch(
        `/api/admin/dropi/generate-guide/${order.uuid}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const data = await resp.json();
      if (data.success) {
        setResultType('success');
        setSyncResult(data.message || 'Guia generada. Recarga la pagina para ver el numero.');
      } else {
        setResultType('error');
        setSyncResult(`Error: ${data.message || 'Error desconocido'}`);
      }
    } catch (e) {
      setResultType('error');
      setSyncResult(`Error de conexion: ${(e as Error).message}`);
    } finally {
      setGeneratingGuide(false);
    }
  };

  const canGenerateGuide =
    dropiSync &&
    dropiSync.status === 'synced' &&
    dropiSync.dropiOrderId &&
    !dropiSync.dropiGuideNumber;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dropi Dropshipping</CardTitle>
      </CardHeader>
      <CardContent>
        {dropiSync ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado:</span>
              {getStatusBadge(dropiSync.status)}
            </div>

            {dropiSync.dropiOrderId && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">ID Dropi:</span>
                <span className="text-sm">{dropiSync.dropiOrderId}</span>
              </div>
            )}

            {dropiSync.dropiGuideNumber && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Numero de guia:</span>
                <span className="text-sm font-mono font-semibold text-primary">
                  {dropiSync.dropiGuideNumber}
                </span>
              </div>
            )}

            {dropiSync.dropiStatus && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estado Dropi:</span>
                <span className="text-sm">{dropiSync.dropiStatus}</span>
              </div>
            )}

            {dropiSync.syncedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Ultima sincronizacion:
                </span>
                <span className="text-sm">
                  {new Date(dropiSync.syncedAt).toLocaleString('es-CO')}
                </span>
              </div>
            )}

            {dropiSync.errorMessage && (
              <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                {dropiSync.errorMessage}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Este pedido no ha sido sincronizado con Dropi.
          </p>
        )}

        {syncResult && (
          <div
            className={`mt-3 p-2 rounded text-sm ${
              resultType === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {syncResult}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResync}
            disabled={syncing || generatingGuide}
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar con Dropi'}
          </Button>

          {canGenerateGuide && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateGuide}
              disabled={syncing || generatingGuide}
            >
              {generatingGuide ? 'Generando...' : 'Generar Guia'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 25
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      uuid
      orderId
    }
    dropiSync: dropiOrderSync(orderUuid: getContextValue("orderId")) {
      syncId
      dropiOrderId
      dropiGuideNumber
      status
      dropiStatus
      errorMessage
      syncedAt
      createdAt
    }
  }
`;
