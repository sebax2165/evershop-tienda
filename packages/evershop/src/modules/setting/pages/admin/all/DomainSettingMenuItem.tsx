import { Button } from '@components/common/ui/Button.js';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@components/common/ui/Item.js';
import { cn } from '@evershop/evershop/lib/util/cn';
import { Globe, Settings } from 'lucide-react';
import React from 'react';

interface DomainSettingMenuItemProps {
  domainSettingUrl: string;
}

export default function DomainSettingMenuItem({
  domainSettingUrl
}: DomainSettingMenuItemProps) {
  const isActive =
    typeof window !== 'undefined' &&
    new URL(domainSettingUrl, window.location.origin).pathname ===
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
              href={domainSettingUrl}
              className={cn(
                'uppercase text-xs font-semibold',
                isActive && 'text-primary'
              )}
            >
              Dominio
            </a>
          </div>
        </ItemTitle>
        <ItemDescription>
          <div>Configura tu dominio personalizado</div>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = domainSettingUrl)}
        >
          <Globe className="h-4 w-4 mr-1" />
        </Button>
      </ItemActions>
    </Item>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 35
};

export const query = `
  query Query {
    domainSettingUrl: url(routeId: "domainSetting")
  }
`;
