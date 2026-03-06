import { SettingMenu } from '@components/admin/SettingMenu.js';
import { Form } from '@components/common/form/Form.js';
import { InputField } from '@components/common/form/InputField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import React from 'react';

interface TrackingPixelSettingProps {
  saveSettingApi: string;
  setting: {
    trackingFacebookPixelId: string;
    trackingFacebookAccessToken: string;
    trackingFacebookEnabled: string;
    trackingTiktokPixelId: string;
    trackingTiktokAccessToken: string;
    trackingTiktokEnabled: string;
  };
}

export default function TrackingPixelSetting({
  saveSettingApi,
  setting: {
    trackingFacebookPixelId,
    trackingFacebookAccessToken,
    trackingFacebookEnabled,
    trackingTiktokPixelId,
    trackingTiktokAccessToken,
    trackingTiktokEnabled
  }
}: TrackingPixelSettingProps) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-5 grid-flow-row">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form method="POST" id="trackingPixelSetting" action={saveSettingApi}>
            <div className="flex flex-col gap-6">
              {/* Facebook Meta Pixel */}
              <Card>
                <CardHeader>
                  <CardTitle>Facebook Meta Pixel</CardTitle>
                  <CardDescription>
                    Configura tu pixel de Facebook para rastrear conversiones y
                    optimizar tus campanas publicitarias.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <ToggleField
                      name="trackingFacebookEnabled"
                      label="Habilitar Facebook Pixel"
                      trueLabel="Habilitado"
                      falseLabel="Deshabilitado"
                      defaultValue={trackingFacebookEnabled === '1' || trackingFacebookEnabled === 'true'}
                    />
                    <InputField
                      name="trackingFacebookPixelId"
                      label="ID del Pixel de Facebook"
                      placeholder="Ej: 123456789012345"
                      defaultValue={trackingFacebookPixelId || ''}
                    />
                    <InputField
                      name="trackingFacebookAccessToken"
                      label="Token de Acceso (Conversions API - Opcional)"
                      placeholder="Token de acceso para la API de Conversiones"
                      defaultValue={trackingFacebookAccessToken || ''}
                    />
                    <p className="text-xs text-muted-foreground">
                      El token de acceso es necesario solo si deseas enviar
                      eventos del lado del servidor mediante la API de
                      Conversiones de Facebook. Puedes obtenerlo en el
                      Administrador de Eventos de Facebook.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* TikTok Pixel */}
              <Card>
                <CardHeader>
                  <CardTitle>TikTok Pixel</CardTitle>
                  <CardDescription>
                    Configura tu pixel de TikTok para rastrear conversiones y
                    mejorar el rendimiento de tus anuncios en TikTok.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <ToggleField
                      name="trackingTiktokEnabled"
                      label="Habilitar TikTok Pixel"
                      trueLabel="Habilitado"
                      falseLabel="Deshabilitado"
                      defaultValue={trackingTiktokEnabled === '1' || trackingTiktokEnabled === 'true'}
                    />
                    <InputField
                      name="trackingTiktokPixelId"
                      label="ID del Pixel de TikTok"
                      placeholder="Ej: ABCDEF123456"
                      defaultValue={trackingTiktokPixelId || ''}
                    />
                    <InputField
                      name="trackingTiktokAccessToken"
                      label="Token de Acceso (Events API - Opcional)"
                      placeholder="Token de acceso para la API de Eventos de TikTok"
                      defaultValue={trackingTiktokAccessToken || ''}
                    />
                    <p className="text-xs text-muted-foreground">
                      El token de acceso es necesario solo si deseas enviar
                      eventos del lado del servidor mediante la API de Eventos
                      de TikTok. Puedes generarlo en TikTok Events Manager.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
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
      trackingFacebookPixelId
      trackingFacebookAccessToken
      trackingFacebookEnabled
      trackingTiktokPixelId
      trackingTiktokAccessToken
      trackingTiktokEnabled
    }
  }
`;
