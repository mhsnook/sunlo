import { createStart } from '@tanstack/react-start'

export const startInstance = createStart(() => {
	return {
		// Note: Crawler middleware for OG tags is handled at the edge (Cloudflare/Vercel)
		// See server/middleware/og-crawler.ts for the implementation
	}
})
