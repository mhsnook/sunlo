import { createFileRoute, redirect } from '@tanstack/react-router'
import * as z from 'zod'

const SearchSchema = z.object({
	referrer: z.string().uuid().optional(),
})

type SignUpProps = z.infer<typeof SearchSchema>

export const Route = createFileRoute('/_auth/signup')({
	validateSearch: (search: Record<string, unknown>): SignUpProps => {
		const result = SearchSchema.safeParse(search)
		return result.success ? result.data : {}
	},
	beforeLoad: ({ context: { auth } }) => {
		if (auth.isAuth) {
			console.log(
				`Issuing redirect from /signup to /learn because auth.isAuth is true`
			)
			throw redirect({ to: '/learn' })
		}
		return
	},
})
