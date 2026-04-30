import { createFileRoute, Navigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/use-auth'
import { LoginCardBody } from '@/components/login-card-body'
import { CSSProperties } from 'react'

export interface LoginSearchParams {
	redirectedFrom?: string
}

export const Route = createFileRoute('/_auth/login')({
	validateSearch: (search: Record<string, unknown>): LoginSearchParams => {
		return {
			redirectedFrom: search.redirectedFrom as string | undefined,
		}
	},
	component: LoginForm,
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function LoginForm() {
	const { isAuth, isReady } = useAuth()
	const { redirectedFrom } = Route.useSearch()

	if (isReady && isAuth)
		return <Navigate to={redirectedFrom || '/learn'} from={Route.fullPath} />

	return (
		<Card
			className="mx-auto mt-[10cqh] w-full max-w-md p-[clamp(0.5rem,2cqw,2rem)]"
			style={style}
		>
			<CardHeader>
				<CardTitle>Please log in</CardTitle>
			</CardHeader>
			<CardContent>
				<LoginCardBody />
			</CardContent>
		</Card>
	)
}
