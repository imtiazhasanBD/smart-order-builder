import { useQuery } from '@tanstack/react-query';
import { fetchOrders, OrdersResponse } from '@/services/api';
import { StoredOrder } from '@/types';

// completed orders and historical persistence
export const useOrders = () => {
  const query = useQuery<OrdersResponse>({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  });

  const orders: StoredOrder[] = query.data?.orders || [];

  return {
    orders,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
