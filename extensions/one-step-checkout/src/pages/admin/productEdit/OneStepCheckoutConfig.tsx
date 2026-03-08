import { InputField } from '@components/common/form/InputField.js';
import { NumberField } from '@components/common/form/NumberField.js';
import { SelectField } from '@components/common/form/SelectField.js';
import { ToggleField } from '@components/common/form/ToggleField.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@components/common/ui/Card.js';
import React, { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useQuery } from 'urql';
import { toast } from 'react-toastify';

const CHECKOUT_CONFIG_QUERY = `
  query Query($productId: ID!) {
    product(id: $productId) {
      productId
      checkoutConfig {
        enabled
        defaultCountry
        codFee
        customButtonText
        showUrgencyTimer
        urgencyTimerMinutes
        showEmail
        showPostcode
      }
    }
  }
`;

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
  { value: 'NI', label: 'Nicaragua' },
  { value: 'US', label: 'United States' },
  { value: 'ES', label: 'Spain' }
];

interface CheckoutConfigFormProps {
  productId: number;
  config: {
    enabled: boolean;
    defaultCountry: string;
    codFee: number;
    customButtonText: string;
    showUrgencyTimer: boolean;
    urgencyTimerMinutes: number;
    showEmail: boolean;
    showPostcode: boolean;
  } | null;
  saveApi: string;
}

const CheckoutConfigForm: React.FC<CheckoutConfigFormProps> = ({
  productId,
  config,
  saveApi
}) => {
  const form = useForm({
    defaultValues: {
      enabled: config?.enabled ?? false,
      default_country: config?.defaultCountry ?? 'CO',
      cod_fee: config?.codFee ?? 0,
      custom_button_text: config?.customButtonText ?? 'Completar Pedido',
      show_urgency_timer: config?.showUrgencyTimer ?? false,
      urgency_timer_minutes: config?.urgencyTimerMinutes ?? 15,
      show_email: config?.showEmail ?? true,
      show_postcode: config?.showPostcode ?? true
    }
  });

  const enabled = form.watch('enabled');
  const showUrgencyTimer = form.watch('show_urgency_timer');
  const [saving, setSaving] = useState(false);

  const onSave = async (data: any) => {
    setSaving(true);
    try {
      const response = await fetch(saveApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success === false) {
        toast.error(result.message || 'Error al guardar la configuracion');
      } else {
        toast.success('Configuracion de checkout guardada');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSave)}
        id="checkoutConfigForm"
      >
        <Card className="bg-popover">
          <CardHeader>
            <CardTitle>Checkout Rapido</CardTitle>
            <CardDescription>
              Configura el checkout de un solo paso para este producto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <ToggleField
                name="enabled"
                label="Habilitar checkout rapido"
                trueLabel="Habilitado"
                falseLabel="Deshabilitado"
                defaultValue={config?.enabled ?? false}
              />
              {enabled && (
                <>
                  <SelectField
                    name="default_country"
                    label="Pais por defecto"
                    options={COUNTRY_OPTIONS}
                    defaultValue={config?.defaultCountry ?? 'CO'}
                  />
                  <NumberField
                    name="cod_fee"
                    label="Cargo por contra-entrega"
                    defaultValue={config?.codFee ?? 0}
                    min={0}
                    unit="$"
                  />
                  <InputField
                    name="custom_button_text"
                    label="Texto del boton"
                    placeholder="Completar Pedido"
                    defaultValue={
                      config?.customButtonText ?? 'Completar Pedido'
                    }
                  />
                  <ToggleField
                    name="show_email"
                    label="Mostrar campo de email"
                    trueLabel="Si"
                    falseLabel="No"
                    defaultValue={config?.showEmail ?? true}
                  />
                  <ToggleField
                    name="show_postcode"
                    label="Mostrar campo de codigo postal"
                    trueLabel="Si"
                    falseLabel="No"
                    defaultValue={config?.showPostcode ?? true}
                  />
                  <ToggleField
                    name="show_urgency_timer"
                    label="Mostrar temporizador de urgencia"
                    trueLabel="Si"
                    falseLabel="No"
                    defaultValue={config?.showUrgencyTimer ?? false}
                  />
                  {showUrgencyTimer && (
                    <NumberField
                      name="urgency_timer_minutes"
                      label="Minutos del temporizador"
                      defaultValue={config?.urgencyTimerMinutes ?? 15}
                      min={1}
                      max={120}
                      unit="min"
                    />
                  )}
                </>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              type="submit"
              size="sm"
              isLoading={saving}
            >
              Guardar
            </Button>
          </CardFooter>
        </Card>
      </form>
    </FormProvider>
  );
};

export default function OneStepCheckoutConfig({
  product
}: {
  product: { productId: number };
}) {
  const [result] = useQuery({
    query: CHECKOUT_CONFIG_QUERY,
    variables: { productId: product?.productId },
    pause: !product?.productId
  });

  const { data, fetching, error } = result;

  if (fetching) {
    return (
      <Card className="bg-popover">
        <CardHeader>
          <CardTitle>Checkout Rapido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-popover">
        <CardHeader>
          <CardTitle>Checkout Rapido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const productData = data?.product;
  if (!productData) {
    return null;
  }

  const saveApi = `/admin/products/${productData.productId}/checkout-config`;

  return (
    <CheckoutConfigForm
      productId={productData.productId}
      config={productData.checkoutConfig}
      saveApi={saveApi}
    />
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 50
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      productId
    }
  }
`;
