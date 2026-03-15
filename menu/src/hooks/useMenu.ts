import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/config/api';
import type { MenuData, TableData } from '@/types';

export function useTableInfo(slug: string, mesa: number) {
  return useQuery({
    queryKey: ['table-info', slug, mesa],
    queryFn: () => apiFetch<TableData>(`/menu/${slug}/table/${mesa}`),
    enabled: !!slug && mesa > 0,
    refetchInterval: 30000,
  });
}

export function useMenuData(slug: string) {
  return useQuery({
    queryKey: ['menu', slug],
    queryFn: () => apiFetch<MenuData>(`/menu/${slug}`),
    enabled: !!slug,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
