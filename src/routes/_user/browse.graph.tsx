import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'

const GraphSearchParams = z.object({
	lang: z.string().optional(),
})

// Graph route metadata; the page component lives in browse.graph.lazy.tsx
// so the force-simulation code only ships when this route is visited.
export const Route = createFileRoute('/_user/browse/graph')({
	validateSearch: GraphSearchParams,
})
