import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 2 * 60 * 1000, // 2 minutes
			gcTime: 20 * 60 * 1000, // 20 minutes
			refetchOnWindowFocus: false,
			refetchOnMount: false,
		},
	},
})
