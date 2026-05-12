import { createFileRoute } from '@tanstack/react-router'

export interface LoginSearchParams {
	redirectedFrom?: string
}

export const Route = createFileRoute('/_auth/login')({
	validateSearch: (search: Record<string, unknown>): LoginSearchParams => {
		return {
			redirectedFrom: search.redirectedFrom as string | undefined,
		}
	},
})
