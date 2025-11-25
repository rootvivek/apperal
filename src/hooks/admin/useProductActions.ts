import type { Dispatch, SetStateAction } from 'react';

type ProductLike = {
  id: string;
};

interface SaveProductArgs<TProduct extends ProductLike> {
  userId: string;
  selectedProduct: TProduct;
  editFormData: TProduct;
  products: TProduct[];
  setProducts: Dispatch<SetStateAction<TProduct[]>>;
  setShowProductEdit: (open: boolean) => void;
  setEditProductLoading: (loading: boolean) => void;
}

export async function saveProduct<TProduct extends ProductLike>({
  userId,
  selectedProduct,
  editFormData,
  products,
  setProducts,
  setShowProductEdit,
  setEditProductLoading,
}: SaveProductArgs<TProduct>): Promise<void> {
  try {
    setEditProductLoading(true);

    const response = await fetch('/api/admin/update-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        productId: selectedProduct.id,
        product: {
          // These fields must match the existing API contract
          // The calling code is responsible for shaping editFormData correctly
          ...(editFormData as any),
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update product');
    }

    setProducts(
      products.map((p) => (p.id === selectedProduct.id ? editFormData : p)),
    );
    setShowProductEdit(false);
    alert('Product updated successfully!');
  } catch (error: any) {
    alert('Failed to update product: ' + (error?.message || 'Unknown error'));
  } finally {
    setEditProductLoading(false);
  }
}

interface DeleteProductArgs<TProduct extends ProductLike> {
  userId: string;
  productId: string;
  products: TProduct[];
  setProducts: Dispatch<SetStateAction<TProduct[]>>;
}

export async function deleteProduct<TProduct extends ProductLike>({
  userId,
  productId,
  products,
  setProducts,
}: DeleteProductArgs<TProduct>): Promise<void> {
  if (!confirm('Are you sure you want to delete this product?')) return;

  try {
    const response = await fetch('/api/admin/delete-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify({ productId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete product');
    }

    if (result.success) {
      setProducts(products.filter((p) => p.id !== productId));
      alert('Product deleted successfully');
    } else {
      throw new Error('Deletion failed');
    }
  } catch (error: any) {
    alert('Failed to delete product: ' + (error?.message || 'Unknown error'));
  }
}


