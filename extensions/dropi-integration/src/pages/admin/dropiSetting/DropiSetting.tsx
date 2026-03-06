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
import React, { useState } from 'react';

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

function ProductMappingRow({ mapping }: { mapping: ProductMapping }) {
  return (
    <div className="grid grid-cols-4 gap-3 items-center py-2 border-b border-border last:border-b-0">
      <div className="text-sm">{mapping.productName}</div>
      <div className="text-sm text-muted-foreground">
        ID: {mapping.evershopProductId}
      </div>
      <div className="text-sm">
        Dropi ID: {mapping.dropiProductId}
        {mapping.dropiVariationId && ` (Var: ${mapping.dropiVariationId})`}
      </div>
      <div className="text-sm text-muted-foreground">
        {mapping.dropiProductName || '-'}
      </div>
    </div>
  );
}

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
        <div className="col-span-4">
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
                    }
                  ]}
                />
              </CardContent>
              <CardContent className="pt-3 border-t border-border">
                <CardTitle>Mapeo de productos</CardTitle>
                <CardDescription>
                  Vincula tus productos de EverShop con los productos de Dropi.
                  El mapeo se realiza desde la API de administracion.
                </CardDescription>
                <div className="mt-4">
                  {productMappings && productMappings.length > 0 ? (
                    <div className="space-y-1">
                      <div className="grid grid-cols-4 gap-3 py-2 border-b border-border font-semibold text-sm">
                        <div>Producto EverShop</div>
                        <div>ID EverShop</div>
                        <div>ID Dropi</div>
                        <div>Nombre Dropi</div>
                      </div>
                      {productMappings.map((m) => (
                        <ProductMappingRow key={m.mapId} mapping={m} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hay productos mapeados todavia. Usa la API de
                      configuracion para vincular productos.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Form>
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
