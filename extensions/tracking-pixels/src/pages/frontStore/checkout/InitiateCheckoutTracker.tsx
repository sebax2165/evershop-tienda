import React from 'react';

// DISABLED: InitiateCheckout is now fired directly from the OneStepCheckout
// component in the one-step-checkout extension, triggered on first form field
// interaction (not on page load). This component is kept as a no-op to avoid
// breaking the build.

export default function InitiateCheckoutTracker() {
  return null;
}

export const layout = {
  areaId: 'head',
  sortOrder: 3
};
