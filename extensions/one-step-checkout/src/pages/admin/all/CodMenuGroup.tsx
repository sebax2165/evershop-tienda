import React from 'react';

export default function CodMenuGroup({
  codDashboardUrl,
  codSettingsUrl,
  codUpsellsUrl,
  codQuantityOffersUrl,
  codShippingRatesUrl,
  codFraudRulesUrl,
  codAbandonedOrdersUrl,
  codFormDesignerUrl
}: {
  codDashboardUrl: string;
  codSettingsUrl: string;
  codUpsellsUrl: string;
  codQuantityOffersUrl: string;
  codShippingRatesUrl: string;
  codFraudRulesUrl: string;
  codAbandonedOrdersUrl: string;
  codFormDesignerUrl: string;
}) {
  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '';

  const items = [
    { label: 'Panel de Control', url: codDashboardUrl },
    { label: 'Configuracion', url: codSettingsUrl },
    { label: 'Upsells', url: codUpsellsUrl },
    { label: 'Ofertas por Cantidad', url: codQuantityOffersUrl },
    { label: 'Tarifas de Envio', url: codShippingRatesUrl },
    { label: 'Prevencion de Fraude', url: codFraudRulesUrl },
    { label: 'Pedidos Abandonados', url: codAbandonedOrdersUrl },
    { label: 'Disenador de Formulario', url: codFormDesignerUrl }
  ];

  const isGroupActive = items.some((item) => {
    try {
      return (
        new URL(item.url, window.location.origin).pathname === currentPath
      );
    } catch {
      return false;
    }
  });

  return (
    <div className="nav-item">
      <div
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold ${
          isGroupActive ? 'text-primary' : 'text-foreground'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <path d="M9 3v18" />
          <path d="M13 7h5" />
          <path d="M13 11h5" />
          <path d="M13 15h5" />
          <path d="M13 19h5" />
        </svg>
        <span>Formulario COD</span>
      </div>
      <ul className="list-unstyled">
        {items.map((item) => {
          let active = false;
          try {
            active =
              new URL(item.url, window.location.origin).pathname ===
              currentPath;
          } catch {
            // ignore
          }
          return (
            <li key={item.url}>
              <a
                href={item.url}
                className={`flex items-center gap-2 px-8 py-1.5 text-sm ${
                  active
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 45
};

export const query = `
  query Query {
    codDashboardUrl: url(routeId: "codDashboard")
    codSettingsUrl: url(routeId: "codSettings")
    codUpsellsUrl: url(routeId: "codUpsells")
    codQuantityOffersUrl: url(routeId: "codQuantityOffers")
    codShippingRatesUrl: url(routeId: "codShippingRates")
    codFraudRulesUrl: url(routeId: "codFraudRules")
    codAbandonedOrdersUrl: url(routeId: "codAbandonedOrders")
    codFormDesignerUrl: url(routeId: "codFormDesigner")
  }
`;
