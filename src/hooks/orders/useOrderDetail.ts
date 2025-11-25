'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { OrderDetailData, OrderDetailItem, OrderReturn } from '@/components/orders/OrderDetail/OrderDetail';

interface UseOrderDetailProps {
  order: OrderDetailData;
  onOrderUpdate?: (updatedOrder: OrderDetailData) => void;
}

interface CancelModalState {
  selectedItem: OrderDetailItem | null;
  modalOpen: boolean;
  isCancelling: boolean;
}

interface ReturnModalState {
  selectedItem: OrderDetailItem | null;
  modalOpen: boolean;
  isSubmitting: boolean;
  quantity: number;
  reason: string;
}

export function useOrderDetail({ order, onOrderUpdate }: UseOrderDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [currentOrder, setCurrentOrder] = useState<OrderDetailData>(order);
  const [returnRequests, setReturnRequests] = useState<Record<string, OrderReturn[]>>({});
  const [cancelModal, setCancelModal] = useState<CancelModalState>({
    selectedItem: null,
    modalOpen: false,
    isCancelling: false,
  });
  const [returnModal, setReturnModal] = useState<ReturnModalState>({
    selectedItem: null,
    modalOpen: false,
    isSubmitting: false,
    quantity: 1,
    reason: '',
  });

  // Fetch return requests for the current order
  const fetchReturnRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('order_returns')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Error handled silently
        return;
      }

      // Group by order_item_id
      const grouped: Record<string, OrderReturn[]> = {};
      (data || []).forEach((returnReq: any) => {
        const itemId = returnReq.order_item_id;
        if (!grouped[itemId]) {
          grouped[itemId] = [];
        }
        grouped[itemId].push(returnReq as OrderReturn);
      });

      setReturnRequests(grouped);
    } catch (error) {
      console.error('Error fetching return requests:', error);
    }
  }, [order.id, supabase]);

  // Update local order state when prop changes
  useEffect(() => {
    setCurrentOrder(order);
    // Fetch return requests for this order
    fetchReturnRequests();
  }, [order, fetchReturnRequests]);

  // Check if item can be cancelled
  const canCancelItem = useCallback((item: OrderDetailItem): boolean => {
    // Can cancel if item is not fully cancelled and order is not delivered/cancelled
    const remainingQuantity = item.quantity - (item.cancelled_quantity || 0);
    const isFullyCancelled = remainingQuantity <= 0 || item.is_cancelled;
    return (
      !isFullyCancelled &&
      currentOrder.status !== 'delivered' &&
      currentOrder.status !== 'cancelled'
    );
  }, [currentOrder.status]);

  // Open cancel modal
  const handleCancelItem = useCallback((item: OrderDetailItem) => {
    if (!canCancelItem(item)) {
      return;
    }
    setCancelModal({
      selectedItem: item,
      modalOpen: true,
      isCancelling: false,
    });
  }, [canCancelItem]);

  // Close cancel modal
  const closeCancelModal = useCallback(() => {
    setCancelModal({
      selectedItem: null,
      modalOpen: false,
      isCancelling: false,
    });
  }, []);

  // Confirm cancellation
  const confirmCancelItem = useCallback(async () => {
    if (!cancelModal.selectedItem) {
      return;
    }

    const remainingQuantity = cancelModal.selectedItem.quantity - (cancelModal.selectedItem.cancelled_quantity || 0);

    if (remainingQuantity <= 0) {
      alert('This item is already fully cancelled');
      return;
    }

    setCancelModal(prev => ({ ...prev, isCancelling: true }));

    try {
      // Get current session for auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      // Call Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('cancel-order-item', {
        body: {
          order_item_id: cancelModal.selectedItem!.id,
          cancelled_quantity: 1,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to cancel item');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to cancel item');
      }

      // Use Edge Function response as single source of truth
      const { order: updatedOrderData, order_items: updatedItemsData } = data;

      // Map order_items to OrderDetailItem format
      const updatedItems: OrderDetailItem[] = (updatedItemsData || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        product_price: item.product_price,
        quantity: item.quantity,
        total_price: item.total_price,
        size: item.size,
        is_cancelled: item.is_cancelled,
        cancelled_quantity: item.cancelled_quantity,
      }));

      // Update local state with Edge Function response
      const updatedOrder: OrderDetailData = {
        ...currentOrder,
        ...updatedOrderData,
        items: updatedItems,
        status: updatedOrderData.status,
        total_amount: updatedOrderData.total_amount,
      };
      
      setCurrentOrder(updatedOrder);
      
      // Notify parent component if callback provided
      if (onOrderUpdate) {
        onOrderUpdate(updatedOrder);
      }

      // Close modal on success
      setCancelModal({
        selectedItem: null,
        modalOpen: false,
        isCancelling: false,
      });
      
      // Navigate after successful cancellation
      router.push('/orders');
    } catch (error: any) {
      // Show user-friendly error message
      const errorMessage = error.message || 'Unknown error';
      alert(`Failed to cancel item: ${errorMessage}`);
      
      // Keep modal open on error, just stop loading
      setCancelModal(prev => ({ ...prev, isCancelling: false }));
    }
  }, [cancelModal.selectedItem, currentOrder, supabase, onOrderUpdate, router]);

  // Check if item can be returned
  const canReturnItem = useCallback((item: OrderDetailItem): boolean => {
    // Can return if:
    // 1. Order is delivered
    // 2. Item is not fully cancelled
    // 3. Item is not fully returned
    // 4. No pending return request exists
    if (currentOrder.status !== 'delivered') {
      return false;
    }

    const remainingQuantity = item.quantity - (item.cancelled_quantity || 0);
    if (remainingQuantity <= 0 || item.is_cancelled) {
      return false;
    }

    const itemReturns = returnRequests[item.id] || [];
    const pendingReturn = itemReturns.find(r => r.status === 'pending');
    if (pendingReturn) {
      return false; // Already has pending return
    }

    const returnedQty = itemReturns
      .filter(r => r.status === 'approved' || r.status === 'refunded')
      .reduce((sum, r) => sum + (r.approved_quantity || r.requested_quantity), 0);

    return (remainingQuantity - returnedQty) > 0;
  }, [currentOrder.status, returnRequests]);

  // Get return status for an item
  const getReturnStatus = useCallback((item: OrderDetailItem): {
    status: 'none' | 'pending' | 'approved' | 'rejected' | 'refunded';
    returnedQuantity: number;
    pendingQuantity: number;
  } => {
    const itemReturns = returnRequests[item.id] || [];
    
    if (itemReturns.length === 0) {
      return { status: 'none', returnedQuantity: 0, pendingQuantity: 0 };
    }

    const pendingReturn = itemReturns.find(r => r.status === 'pending');
    const approvedReturns = itemReturns.filter(r => r.status === 'approved' || r.status === 'refunded');
    const rejectedReturn = itemReturns.find(r => r.status === 'rejected');

    const returnedQty = approvedReturns.reduce((sum, r) => sum + (r.approved_quantity || r.requested_quantity), 0);
    const pendingQty = pendingReturn ? pendingReturn.requested_quantity : 0;

    if (pendingReturn) {
      return { status: 'pending', returnedQuantity: returnedQty, pendingQuantity: pendingQty };
    } else if (approvedReturns.length > 0) {
      const hasRefunded = approvedReturns.some(r => r.status === 'refunded');
      return { status: hasRefunded ? 'refunded' : 'approved', returnedQuantity: returnedQty, pendingQuantity: 0 };
    } else if (rejectedReturn) {
      return { status: 'rejected', returnedQuantity: returnedQty, pendingQuantity: 0 };
    }

    return { status: 'none', returnedQuantity: returnedQty, pendingQuantity: 0 };
  }, [returnRequests]);

  // Open return modal
  const handleRequestReturn = useCallback((item: OrderDetailItem) => {
    if (!canReturnItem(item)) {
      return;
    }

    const remainingQuantity = item.quantity - (item.cancelled_quantity || 0);
    const itemReturns = returnRequests[item.id] || [];
    const returnedQty = itemReturns
      .filter(r => r.status === 'approved' || r.status === 'refunded')
      .reduce((sum, r) => sum + (r.approved_quantity || r.requested_quantity), 0);
    const availableQty = remainingQuantity - returnedQty;

    setReturnModal({
      selectedItem: item,
      modalOpen: true,
      isSubmitting: false,
      quantity: Math.min(1, availableQty),
      reason: '',
    });
  }, [canReturnItem, returnRequests]);

  // Close return modal
  const closeReturnModal = useCallback(() => {
    setReturnModal({
      selectedItem: null,
      modalOpen: false,
      isSubmitting: false,
      quantity: 1,
      reason: '',
    });
  }, []);

  // Update return modal state
  const updateReturnModal = useCallback((updates: Partial<ReturnModalState>) => {
    setReturnModal(prev => ({ ...prev, ...updates }));
  }, []);

  // Submit return request
  const submitReturnRequest = useCallback(async () => {
    if (!returnModal.selectedItem || !returnModal.reason.trim() || returnModal.quantity <= 0) {
      return;
    }

    setReturnModal(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Get current session for auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      // Call Supabase Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('request-return', {
        body: {
          order_item_id: returnModal.selectedItem!.id,
          requested_quantity: returnModal.quantity,
          reason: returnModal.reason.trim(),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to submit return request');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to submit return request');
      }

      // Refresh return requests
      await fetchReturnRequests();

      // Close modal on success
      setReturnModal({
        selectedItem: null,
        modalOpen: false,
        isSubmitting: false,
        quantity: 1,
        reason: '',
      });

      alert('Return request submitted successfully');
    } catch (error: any) {
      // Show user-friendly error message
      const errorMessage = error.message || 'Unknown error';
      alert(`Failed to submit return request: ${errorMessage}`);
      
      // Keep modal open on error, just stop loading
      setReturnModal(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [returnModal, supabase, fetchReturnRequests]);

  return {
    currentOrder,
    cancelModal,
    returnModal,
    returnRequests,
    canCancelItem,
    canReturnItem,
    getReturnStatus,
    handleCancelItem,
    handleRequestReturn,
    closeCancelModal,
    closeReturnModal,
    updateReturnModal,
    confirmCancelItem,
    submitReturnRequest,
  };
}

