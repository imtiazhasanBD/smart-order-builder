import { useQuery } from '@tanstack/react-query';
import { fetchMenu } from '@/services/api';
import { MenuResponse } from '@/types';

// Custom hook to query and manage the menu catalog.
export const useMenu = () => {
  const query = useQuery<MenuResponse>({
    queryKey: ['menu'],
    queryFn: fetchMenu,
  });

  return {
    menu: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
