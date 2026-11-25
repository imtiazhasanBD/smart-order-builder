import { useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reserveCartItem,
  updateCartItem,
  removeCartItem,
  checkout,
  ApiError,
} from '@/services/api';
import { PaymentMethod, SelectedOptions } from '@/types';
import { ReserveResult, CheckoutResult } from '@/mocks/serverStore';

// Custom hook managing cart mutations
export const useCartMutations = (cartVersion: number) => {
  const queryClient = useQueryClient();

  // Stable idempotency key references
  const reserveKeyRef = useRef<string | null>(null);
  const checkoutKeyRef = useRef<string | null>(null);

  const refreshCart = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ['cart'] });
  }, [queryClient]);

  const refreshOrders = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient]);

  // Handle version conflict or stock shortage
  const handleMutationError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 409) {
        // refresh cart snapshot
        refreshCart();
      }
    },
    [refreshCart]
  );

  // 1. Add / Reserve Item Mutation
  const addMutation = useMutation<
    ReserveResult,
    Error,
    {
      options: SelectedOptions;
      qty: number;
      idempotencyKey?: string;
    }
  >({
    mutationFn: async ({ options, qty, idempotencyKey }) => {
      // Reuse existing pending key on retry or create new stable key
      const key =
        idempotencyKey ||
        reserveKeyRef.current ||
        `reserve-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      reserveKeyRef.current = key;

      try {
        const result = await reserveCartItem(key, options, qty, cartVersion);
        reserveKeyRef.current = null; // Reset on success
        return result;
      } catch (err) {
        throw err;
      }
    },
    onSuccess: async () => {
      reserveKeyRef.current = null;
      await refreshCart();
    },
    onError: handleMutationError,
  });

  // 2. Edit / Update Item Mutation
  const editMutation = useMutation<
    ReserveResult,
    Error,
    {
      id: string;
      options: SelectedOptions;
      qty: number;
    }
  >({
    mutationFn: async ({ id, options, qty }) => {
      return updateCartItem(id, options, qty, cartVersion);
    },
    onSuccess: async () => {
      await refreshCart();
    },
    onError: handleMutationError,
  });

  // 3. Remove Item Mutation
  const removeMutation = useMutation<
    { success: boolean; version: number },
    Error,
    string
  >({
    mutationFn: async (id: string) => {
      return removeCartItem(id, cartVersion);
    },
    onSuccess: async () => {
      await refreshCart();
    },
    onError: handleMutationError,
  });

  // 4. Checkout Mutation
  const checkoutMutation = useMutation<
    CheckoutResult,
    Error,
    {
      paymentMethod: PaymentMethod;
      couponCode: string | null;
      idempotencyKey?: string;
    }
  >({
    mutationFn: async ({ paymentMethod, couponCode, idempotencyKey }) => {
      const key =
        idempotencyKey ||
        checkoutKeyRef.current ||
        `pay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      checkoutKeyRef.current = key;

      try {
        const result = await checkout(key, paymentMethod, couponCode, cartVersion);
        checkoutKeyRef.current = null;
        return result;
      } catch (err) {
        throw err;
      }
    },
    onSuccess: async () => {
      checkoutKeyRef.current = null;
      await Promise.all([refreshCart(), refreshOrders()]);
    },
    onError: handleMutationError,
  });

  return {
    addMutation,
    editMutation,
    removeMutation,
    checkoutMutation,
    refreshCart,
  };
};
