import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

const ChartsSearchParams = z.object({
	lang: z.string().optional(),
})

// Charts route metadata; the page component lives in browse.charts.lazy.tsx
// so the recharts bundle only ships when this route is visited.
export const Route = createFileRoute('/_user/browse/charts')({
	validateSearch: ChartsSearchParams,
})
