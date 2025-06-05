import { createFileRoute } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { PasswordResetForm } from '@/components/password-reset-form'

export const Route = createFileRoute('/_auth/set-new-password')({
	component: SetNewPasswordPage,
})

function SetNewPasswordPage() {
	return (
		<Card className="mx-auto mt-[10cqh] w-full max-w-md [padding:clamp(0.5rem,2cqw,2rem)]">
			<CardHeader>
				<CardTitle>Set your new password</CardTitle>
			</CardHeader>
			<PasswordResetForm />
		</Card>
	)
}
