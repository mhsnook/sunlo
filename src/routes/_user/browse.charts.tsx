import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

const ChartsSearchParams = z.object({
	lang: z.string().optional(),
})

export const Route = createFileRoute('/_user/browse/charts')({
	validateSearch: ChartsSearchParams,
})
