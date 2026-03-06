import { Button } from '@components/common/ui/Button.js';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@components/common/ui/Item.js';
import { cn } from '@evershop/evershop/lib/util/cn';
import { Package } from 'lucide-react';
import React from 'react';

interface DropiMenuItemProps {
  dropiSettingUrl: string;
}

export default function DropiMenuItem({ dropiSettingUrl }: DropiMenuItemProps) {
  const isActive =
    typeof window !== 'undefined' &&
    new URL(dropiSettingUrl, window.location.origin).pathname ===
      window.location.pathname;

  return (
    <Item
      variant={'outline'}
      className={cn(
        isActive && 'bg-primary/5 border-primary/20 dark:bg-primary/10'
      )}
      data-active={isActive ? 'true' : 'false'}
    >
      <ItemContent>
        <ItemTitle>
          <div>
            <a
              href={dropiSettingUrl}
              className={cn(
                'uppercase text-xs font-semibold',
                isActive && 'text-primary'
              )}
            >
              Dropi Dropshipping
            </a>
          </div>
        </ItemTitle>
        <ItemDescription>
          <div>Configura la integracion con Dropi para sincronizar pedidos</div>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = dropiSettingUrl)}
        >
          <Package className="h-4 w-4 mr-1" />
        </Button>
      </ItemActions>
    </Item>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 55
};

export const query = `
  query Query {
    dropiSettingUrl: url(routeId: "dropiSetting")
  }
`;
