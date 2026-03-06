import { Button } from '@components/common/ui/Button.js';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle
} from '@components/common/ui/Item.js';
import { cn } from '@evershop/evershop/lib/util/cn';
import { BarChart3 } from 'lucide-react';
import React from 'react';

interface TrackingPixelMenuItemProps {
  trackingPixelSettingUrl: string;
}

export default function TrackingPixelMenuItem({
  trackingPixelSettingUrl
}: TrackingPixelMenuItemProps) {
  const isActive =
    typeof window !== 'undefined' &&
    new URL(trackingPixelSettingUrl, window.location.origin).pathname ===
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
              href={trackingPixelSettingUrl}
              className={cn(
                'uppercase text-xs font-semibold',
                isActive && 'text-primary'
              )}
            >
              Pixeles de Seguimiento
            </a>
          </div>
        </ItemTitle>
        <ItemDescription>
          <div>Configura Facebook Pixel y TikTok Pixel</div>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (window.location.href = trackingPixelSettingUrl)}
        >
          <BarChart3 className="h-4 w-4 mr-1" />
        </Button>
      </ItemActions>
    </Item>
  );
}

export const layout = {
  areaId: 'settingPageMenu',
  sortOrder: 50
};

export const query = `
  query Query {
    trackingPixelSettingUrl: url(routeId: "trackingPixelSetting")
  }
`;
