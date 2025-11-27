'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, MapPin, Phone, Star, Pen, Trash2 } from 'lucide-react';
import { formatPhoneForDisplay } from '@/utils/phone';
import { cn } from '@/lib/utils';
import { mobileTypography } from '@/utils/mobileTypography';
import type { Address } from '@/hooks/useAddresses';

export interface ShippingAddressCardProps {
  address: Address | {
    id?: string;
    full_name?: string | null;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state: string;
    zip_code: string;
    phone?: number | string | null;
    is_default?: boolean;
  };
  variant?: 'display' | 'selectable' | 'editable';
  isSelected?: boolean;
  showBadge?: boolean;
  showPhone?: boolean;
  showActions?: boolean;
  onSelect?: () => void;
  onEdit?: (e?: React.MouseEvent) => void;
  onDelete?: (e?: React.MouseEvent) => void;
  onSetDefault?: (e?: React.MouseEvent) => void;
  className?: string;
  compact?: boolean;
}

export default function ShippingAddressCard({
  address,
  variant = 'display',
  isSelected = false,
  showBadge = false,
  showPhone = true,
  showActions = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  className,
  compact = false,
}: ShippingAddressCardProps) {
  const phoneNumber = address.phone 
    ? (typeof address.phone === 'string' ? address.phone : String(address.phone))
    : null;

  const addressParts = [
    address.address_line1,
    address.address_line2,
    address.city,
    address.state,
    address.zip_code,
  ].filter(Boolean);

  const addressLine = addressParts.join(', ');

  // Display variant - simple read-only card
  if (variant === 'display') {
    const addressParts = [
      address.address_line1,
      address.address_line2,
      address.city,
      address.state,
      address.zip_code,
    ].filter(Boolean);
    const addressLine = addressParts.join(', ');

    return (
      <Card className={cn('rounded-2xl', className)}>
        <CardContent className={cn(compact ? 'p-2.5' : 'p-4')}>
          <h3 className={cn(
            `${mobileTypography.title14Bold} sm:text-base lg:text-lg text-gray-900`,
            compact ? 'mb-2' : 'mb-3 sm:mb-4'
          )}>
            Shipping Information
          </h3>
          {(address.full_name || phoneNumber) && (
            <div className={cn(
              'text-sm sm:text-base font-medium text-gray-900',
              compact ? 'mb-1' : 'mb-2'
            )}>
              {address.full_name && <span>{address.full_name}</span>}
              {address.full_name && phoneNumber && (
                <span className="mx-1 text-gray-400">|</span>
              )}
              {phoneNumber && <span>{formatPhoneForDisplay(phoneNumber)}</span>}
            </div>
          )}
          <div className={cn(compact ? 'mt-0' : 'mt-1')}>
            <p className={cn(
              `font-medium text-gray-900 ${mobileTypography.body12} sm:text-sm`,
              compact && 'text-xs sm:text-sm'
            )}>
              {addressLine}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Selectable variant - for checkout address selection
  if (variant === 'selectable') {
    return (
      <div
        className={cn(
          'border rounded-lg p-[10px] transition-colors cursor-pointer',
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 hover:border-gray-300',
          className
        )}
        onClick={onSelect}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn(
              'font-medium mb-1',
              compact ? 'text-xs' : 'text-sm'
            )}>
              {address.full_name || 'Address'}
              {showPhone && phoneNumber && (
                <>
                  <span className="mx-1 text-gray-400">|</span>
                  <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>{formatPhoneForDisplay(phoneNumber)}</span>
                </>
              )}
            </p>
            <p className={cn(
              mobileTypography.title14,
              'text-muted-foreground'
            )}>
              {addressLine}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {isSelected && (
              <>
                <Check className="w-5 h-5 text-primary" />
                {onEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(e);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Editable variant - for profile address management
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md rounded-2xl',
        isSelected && 'ring-2 ring-primary border-primary',
        !isSelected && 'hover:scale-[1.01]',
        className
      )}
      onClick={onSelect}
    >
      <CardContent className={cn(compact ? 'p-2.5' : 'p-4')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={cn(
                'font-semibold text-foreground truncate',
                compact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
              )}>
                {address.full_name || 'Address'}
              </h3>
              {showBadge && address.is_default && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Default
                </Badge>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-xs sm:text-sm text-foreground/80">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p>{address.address_line1}</p>
                  {address.address_line2 && <p>{address.address_line2}</p>}
                  <p className="text-muted-foreground">
                    {address.city}, {address.state} {address.zip_code}
                  </p>
                </div>
              </div>
              {showPhone && phoneNumber && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/80">
                  <Phone className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <span>{formatPhoneForDisplay(phoneNumber)}</span>
                </div>
              )}
            </div>
          </div>
          {isSelected && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
        </div>
        {showActions && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(e);
                }}
                className="h-10 min-h-[44px] flex-1"
              >
                <Pen className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {!address.is_default && onSetDefault && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetDefault(e);
                  }}
                  className="h-10 min-h-[44px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Set Default
                </Button>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(e);
                    }}
                    className="h-10 min-h-[44px] text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

