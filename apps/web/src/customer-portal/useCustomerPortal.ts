import { useQuery } from '@tanstack/react-query';
import {
  fetchCustomerPortalDocuments,
  fetchCustomerPortalMe,
} from './api';

export function useCustomerPortalMe(enabled = true) {
  return useQuery({
    queryKey: ['customer-portal', 'me'],
    queryFn: () => fetchCustomerPortalMe(),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useCustomerPortalDocuments(enabled = true) {
  return useQuery({
    queryKey: ['customer-portal', 'documents'],
    queryFn: () => fetchCustomerPortalDocuments(),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}
