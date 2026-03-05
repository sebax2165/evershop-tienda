import { Area } from '@components/common/Area.js';
import { Button } from '@components/common/ui/Button.js';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@components/common/ui/Sheet.js';
import { CartData } from '@components/frontStore/cart/CartContext.js';
import { CartItems } from '@components/frontStore/cart/CartItems.js';
import { CartTotalSummary } from '@components/frontStore/cart/CartTotalSummary.js';
import { DefaultMiniCartDropdownEmpty } from '@components/frontStore/cart/DefaultMiniCartDropdownEmpty.js';
import { DefaultMiniCartItemList } from '@components/frontStore/cart/DefaultMiniCartItemList.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';

export const DefaultMiniCartDropdown: React.FC<{
  cart: CartData | null;
  isOpen: boolean;
  onClose: () => void;
  cartUrl?: string;
  checkoutUrl?: string;
  dropdownPosition?: 'left' | 'right';
  setIsDropdownOpen: (isOpen: boolean) => void;
}> = ({
  cart,
  isOpen,
  onClose,
  cartUrl,
  checkoutUrl,
  dropdownPosition = 'right',
  setIsDropdownOpen
}) => {
  const totalQty = cart?.totalQty || 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={dropdownPosition}
        className="w-full md:w-1/3 border-border"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle className="font-medium text-xl">
            {_('Your Cart')}
          </SheetTitle>
        </SheetHeader>
        {totalQty === 0 ? (
          <DefaultMiniCartDropdownEmpty setIsDropdownOpen={setIsDropdownOpen} />
        ) : (
          <div
            className="minicart__items__container flex flex-col px-5 justify-between h-full"
            style={{ height: 'calc(100vh - 150px)' }}
          >
            <Area id="miniCartItemsBefore" noOuter />
            <div className="overflow-y-auto mb-8">
              <CartItems>
                {({ items, loading }) => (
                  <DefaultMiniCartItemList items={items} loading={loading} />
                )}
              </CartItems>
            </div>
            <Area id="miniCartItemsAfter" noOuter />
            <Area id="miniCartSummaryBefore" noOuter />
            <CartTotalSummary>
              {({ total }) => (
                <>
                  <div className="minicart__summary flex justify-between items-center mb-3">
                    <span className="font-medium text-gray-900">
                      {_('Subtotal')}:
                    </span>
                    <span className="font-semibold text-lg text-gray-900">
                      {total || '—'}
                    </span>
                  </div>
                  <Button
                    variant={'outline'}
                    size={'lg'}
                    onClick={() => {
                      if (cartUrl) {
                        window.location.href = cartUrl;
                      }
                    }}
                    className="minicart__viewcart__button w-full "
                  >
                    {_('View Cart (${totalQty})', {
                      totalQty: totalQty.toString()
                    })}
                  </Button>
                  <Button
                    variant={'default'}
                    size={'lg'}
                    onClick={() => {
                      if (checkoutUrl) {
                        window.location.href = checkoutUrl;
                      }
                    }}
                    className="minicart__viewcart__button w-full "
                  >
                    {_('Checkout')}
                  </Button>
                </>
              )}
            </CartTotalSummary>
            <Area id="miniCartSummaryAfter" noOuter />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
