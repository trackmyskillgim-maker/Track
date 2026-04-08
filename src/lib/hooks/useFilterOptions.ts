import useSWR from 'swr'
import { fetcher } from '@/lib/providers/SWRProvider'

export interface FilterOptions {
  batches: string[]
  courses: string[]
  sections: string[]
}

export function useFilterOptions() {
  const { data, error, isLoading } = useSWR<FilterOptions>(
    '/api/admin/filter-options',
    fetcher,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
    }
  )

  return {
    filterOptions: data,
    isLoading,
    isError: error
  }
}
