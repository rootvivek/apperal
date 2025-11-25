import type { SupabaseClient } from '@supabase/supabase-js';

type OrderLike = {
  id: string;
  status: string;
};

interface UpdateOrderStatusArgs<TOrder extends OrderLike> {
  supabase: SupabaseClient;
  orderId: string;
  newStatus: string;
  orders: TOrder[];
  setOrders: (orders: TOrder[]) => void;
  selectedOrder: TOrder | null;
  setSelectedOrder: (order: TOrder | null) => void;
}

export async function updateOrderStatus<TOrder extends OrderLike>({
  supabase,
  orderId,
  newStatus,
  orders,
  setOrders,
  selectedOrder,
  setSelectedOrder,
}: UpdateOrderStatusArgs<TOrder>): Promise<void> {
  try {
    // If cancelling, use the cancellation API
    if (newStatus === 'cancelled') {
      if (!confirm('Are you sure you want to cancel this order?')) {
        return;
      }

      const response = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      setOrders(
        orders.map((o) =>
          o.id === orderId ? { ...o, status: 'cancelled' } : o,
        ),
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'cancelled' });
      }

      alert('Order cancelled successfully!');
      return;
    }

    // For other status updates, update directly in Supabase
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) throw error;

    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }

    alert('Order status updated successfully!');
  } catch (error: any) {
    alert(
      'Failed to update order status: ' + (error?.message || 'Unknown error'),
    );
  }
}


