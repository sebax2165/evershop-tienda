import { Button } from '@components/common/ui/Button.js';
import React from 'react';
import { useFormContext } from 'react-hook-form';

const FormButtons: React.FC<{
  formId: string;
  cancelUrl: string;
}> = ({ cancelUrl, formId }) => {
  const {
    formState: { isSubmitting }
  } = useFormContext();

  return (
    <div className="form-submit-button flex border-t border-border mt-4 pt-4 justify-between">
      <Button
        variant="destructive"
        onClick={() => {
          window.location.href = cancelUrl;
        }}
      >
        Cancelar
      </Button>
      <Button
        onClick={() => {
          (document.getElementById(formId) as HTMLFormElement).dispatchEvent(
            new Event('submit', { cancelable: true, bubbles: true })
          );
        }}
        isLoading={isSubmitting}
      >
        Guardar
      </Button>
    </div>
  );
};

export { FormButtons };
