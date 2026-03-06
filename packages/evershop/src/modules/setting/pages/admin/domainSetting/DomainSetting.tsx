import { SettingMenu } from '@components/admin/SettingMenu.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface DomainSettingProps {
  saveSettingApi: string;
  setting: {
    domainCustomDomain: string;
  };
}

export default function DomainSetting({
  saveSettingApi,
  setting: { domainCustomDomain }
}: DomainSettingProps) {
  const isConfigured = !!domainCustomDomain;

  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            method="POST"
            id="domainSetting"
            action={saveSettingApi}
            successMessage="Configuracion de dominio guardada"
          >
            <Card>
              <CardHeader>
                <CardTitle>Configuracion de dominio personalizado</CardTitle>
                <CardDescription>
                  Configura tu dominio personalizado para tu tienda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <InputField
                    name="domainCustomDomain"
                    label="Dominio personalizado"
                    placeholder="mitienda.com"
                    defaultValue={domainCustomDomain}
                  />
                  <div className="flex items-center gap-2 text-sm">
                    {isConfigured ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">
                          Dominio configurado: {domainCustomDomain}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          No hay dominio personalizado configurado
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardContent className="pt-3 border-t border-border">
                <CardTitle>Instrucciones de configuracion DNS</CardTitle>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  <p>
                    Para conectar tu dominio personalizado, sigue estos pasos:
                  </p>
                  <ol className="list-decimal list-inside space-y-3">
                    <li>
                      Accede al panel de administracion de tu proveedor de
                      dominio (GoDaddy, Namecheap, Cloudflare, etc.)
                    </li>
                    <li>
                      Agrega un registro CNAME con los siguientes valores:
                      <div className="mt-2 ml-4 p-3 bg-muted rounded-md space-y-1 font-mono text-xs">
                        <div>
                          <span className="font-semibold">Nombre/Host:</span> @
                          o www
                        </div>
                        <div>
                          <span className="font-semibold">Tipo:</span> CNAME
                        </div>
                        <div>
                          <span className="font-semibold">Valor:</span>{' '}
                          evershop-tienda-production.up.railway.app
                        </div>
                      </div>
                    </li>
                    <li>
                      Espera la propagacion DNS (puede tardar hasta 48 horas)
                    </li>
                    <li>
                      El certificado SSL se configurara automaticamente
                    </li>
                  </ol>
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
    saveSettingApi: url(routeId: "saveSetting")
    setting {
      domainCustomDomain
    }
  }
`;
