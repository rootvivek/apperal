'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

export interface AdminProductForm {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  category?: string;
  subcategory?: string;
  badge?: string;
  stock_quantity: number;
  is_active?: boolean;
  show_in_hero?: boolean;
}

interface ProductEditModalProps {
  open: boolean;
  product: AdminProductForm | null;
  formData: AdminProductForm | null;
  loading: boolean;
  onClose: () => void;
  onChange: (data: AdminProductForm) => void;
  onSave: () => void;
}

export function ProductEditModal({
  open,
  product,
  formData,
  loading,
  onClose,
  onChange,
  onSave,
}: ProductEditModalProps) {
  if (!product || !formData) return null;

  const updateField = <K extends keyof AdminProductForm>(
    field: K,
    value: AdminProductForm[K],
  ) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Product Name */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </p>
            <Input
              value={formData.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Product name"
            />
          </div>

          {/* Description */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </p>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
              placeholder="Product description"
            />
          </div>

          {/* Price Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹) *
              </p>
              <Input
                type="number"
                value={formData.price ?? ''}
                onChange={(e) =>
                  updateField('price', parseFloat(e.target.value) || 0)
                }
                step="0.01"
                placeholder="Price"
              />
            </div>
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">
                Original Price (₹)
              </p>
              <Input
                type="number"
                value={formData.original_price ?? ''}
                onChange={(e) =>
                  updateField(
                    'original_price',
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                step="0.01"
                placeholder="Original price"
              />
            </div>
          </div>

          {/* Category & Subcategory Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </p>
              <Input
                value={formData.category || ''}
                onChange={(e) => updateField('category', e.target.value)}
                placeholder="Category"
              />
            </div>
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">
                Subcategory
              </p>
              <Input
                value={formData.subcategory || ''}
                onChange={(e) => updateField('subcategory', e.target.value)}
                placeholder="Subcategory"
              />
            </div>
          </div>

          {/* Badge & Stock Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">
                Badge
              </p>
              <Select
                value={formData.badge || ''}
                onValueChange={(value) =>
                  updateField('badge', (value || undefined) as any)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No Badge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Badge</SelectItem>
                  <SelectItem value="NEW">NEW</SelectItem>
                  <SelectItem value="SALE">SALE</SelectItem>
                  <SelectItem value="HOT">HOT</SelectItem>
                  <SelectItem value="FEATURED">FEATURED</SelectItem>
                  <SelectItem value="LIMITED">LIMITED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity *
              </p>
              <Input
                type="number"
                value={formData.stock_quantity ?? ''}
                onChange={(e) =>
                  updateField(
                    'stock_quantity',
                    parseInt(e.target.value || '0', 10) || 0,
                  )
                }
                placeholder="Stock"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <Checkbox
                checked={formData.is_active !== false}
                onCheckedChange={(checked) =>
                  updateField('is_active', Boolean(checked))
                }
              />
              <span className="text-sm text-gray-700">Product is active</span>
            </label>
            <label className="flex items-center space-x-2">
              <Checkbox
                checked={formData.show_in_hero === true}
                onCheckedChange={(checked) =>
                  updateField('show_in_hero', Boolean(checked))
                }
              />
              <span className="text-sm text-gray-700">
                Show in hero section
              </span>
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={onSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


