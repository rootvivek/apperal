'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/EmptyState';

interface UserDetailsModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    full_name: string;
    phone: string;
    created_at: string;
  } | null;
  userOrders: any[];
  userCartItems: any[];
  userWishlistItems: any[];
  activeTab: 'orders' | 'cart' | 'wishlist';
  onTabChange: (tab: 'orders' | 'cart' | 'wishlist') => void;
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
}

export function UserDetailsModal({
  open,
  onClose,
  user,
  userOrders,
  userCartItems,
  userWishlistItems,
  activeTab,
  onTabChange,
  formatDate,
  formatCurrency,
}: UserDetailsModalProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user.full_name}</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex space-x-1 pt-2 border-b border-gray-200">
          <Button
            type="button"
            variant={activeTab === 'orders' ? 'default' : 'ghost'}
            className="px-4 py-2 h-9"
            onClick={() => onTabChange('orders')}
          >
            Orders ({userOrders.length})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'cart' ? 'default' : 'ghost'}
            className="px-4 py-2 h-9"
            onClick={() => onTabChange('cart')}
          >
            🛒 Cart ({userCartItems.length})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'wishlist' ? 'default' : 'ghost'}
            className="px-4 py-2 h-9"
            onClick={() => onTabChange('wishlist')}
          >
            ❤️ Wishlist ({userWishlistItems.length})
          </Button>
        </div>

        <div className="py-4 space-y-4">
          {/* User Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Phone</p>
              <p className="font-medium">{user.phone || '-'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Joined</p>
              <p className="font-medium">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Orders</p>
              <p className="font-medium">{userOrders.length}</p>
            </div>
          </div>

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              <h3 className="font-semibold mb-4">
                All Orders ({userOrders.length})
              </h3>
              {userOrders.length === 0 ? (
                <p className="text-gray-600">No orders</p>
              ) : (
                <div className="space-y-3">
                  {userOrders.map((order) => (
                    <div
                      key={order.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-blue-600">
                            #{order.order_number}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <span className="font-semibold">
                          {formatCurrency(order.total_amount || 0)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <Badge
                          className="capitalize"
                          variant={
                            order.status === 'delivered'
                              ? 'secondary'
                              : order.status === 'shipped'
                              ? 'secondary'
                              : order.status === 'processing'
                              ? 'secondary'
                              : order.status === 'pending'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {order.status}
                        </Badge>
                        <span className="text-gray-600 capitalize">
                          {order.payment_method === 'cod'
                            ? 'Cash on Delivery'
                            : order.payment_method}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cart Tab */}
          {activeTab === 'cart' && (
            <div>
              <h3 className="font-semibold mb-2">Shopping Cart</h3>
              {userCartItems.length === 0 ? (
                <EmptyState title="Cart is empty" variant="minimal" />
              ) : (
                <div className="space-y-2">
                  {userCartItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center border p-2 rounded"
                    >
                      <div>
                        <p className="font-medium">{item.product?.name}</p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(
                          (item.product?.price || 0) * (item.quantity || 0),
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wishlist Tab */}
          {activeTab === 'wishlist' && (
            <div>
              <h3 className="font-semibold mb-2">Wishlist</h3>
              {userWishlistItems.length === 0 ? (
                <p className="text-gray-600">No items in wishlist</p>
              ) : (
                <div className="space-y-2">
                  {userWishlistItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center border p-2 rounded"
                    >
                      <p className="font-medium">{item.product?.name}</p>
                      <span className="font-medium">
                        {formatCurrency(item.product?.price || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" className="w-full" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


