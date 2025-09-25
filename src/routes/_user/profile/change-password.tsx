import { createFileRoute } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { PasswordResetForm } from '@/components/password-reset-form'

export const Route = createFileRoute('/_user/profile/change-password')({
	component: ChangePasswordPage,
})

function ChangePasswordPage() {
	return (
		<Card className="mt-6 max-w-100">
			<CardHeader>
				<CardTitle>Change your password</CardTitle>
			</CardHeader>
			<PasswordResetForm />
		</Card>
	)
}
