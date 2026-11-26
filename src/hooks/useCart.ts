import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCart, CartResponse } from '@/services/api';
import { CartReservationItem } from '@/mocks/serverStore';
import { subscribeToSync } from '@/lib/syncChannel';

// Custom hook to manage cart queries, version tracking, and active reservations.
export const useCart = (defaultStock?: Record<string, number>) => {
  const queryClient = useQueryClient();

  const query = useQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: fetchCart,
    refetchInterval: 10000, // Periodically refresh reservation expiration & stock state
  });

  // Multi-tab real-time sync subscription (Part G Bonus)
  useEffect(() => {
    let timeoutId: any;
    const unsubscribe = subscribeToSync((msg) => {
      if (msg.type === 'CART_UPDATED' || msg.type === 'ORDER_COMPLETED') {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['cart'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        }, 80);
      }
    });
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [queryClient]);

  const cartItems: CartReservationItem[] = query.data?.items || [];
  const cartVersion: number = query.data?.version || 1;
  const remainingStock: Record<string, number> =
    query.data?.remainingStock || defaultStock || {};
  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  return {
    cartData: query.data,
    cartItems,
    cartVersion,
    cartCount,
    remainingStock,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
