import { Link } from '@tanstack/react-router'
import supabase from '@/lib/supabase-client'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { CardContent } from '@/components/ui/card'
import Callout from '@/components/ui/callout'
import { SuccessCheckmarkTrans } from '@/components/success-checkmark'
import { ShowAndLogError } from '@/components/errors'
import PasswordField from './fields/password-field'

const FormSchema = z.object({
	password: z.string().min(8, 'Password should be 8 characters at least'),
})

type FormInputs = z.infer<typeof FormSchema>

export function PasswordResetForm() {
	const changeMutation = useMutation({
		mutationKey: ['password-reset'],
		mutationFn: async ({ password }: FormInputs) => {
			const { data, error } = await supabase.auth.updateUser({ password })
			if (error) {
				console.log(`Error`, error)
				throw error
			}
			return data
			// console.log(`form data`, email, user_role)
			// return { user: { email: '@fake email@' } }
		},
		onSuccess: () => {
			toast.success(`Successfully updated your password.`)
		},
	})

	const {
		handleSubmit,
		register,
		formState: { errors, isSubmitting, isValid },
	} = useForm<FormInputs>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			password: '',
		},
	})

	return (
		<CardContent>
			{changeMutation.isSuccess ?
				<Callout Icon={SuccessCheckmarkTrans}>
					<p>Success!</p>
					<p>You've changed your password.</p>
					<p>
						<Link to="/profile" className="s-link">
							Return to your profile page.
						</Link>
					</p>
				</Callout>
			:	<form
					role="form"
					noValidate
					className="space-y-4"
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					onSubmit={handleSubmit((data) => changeMutation.mutate(data))}
				>
					<fieldset className="flex flex-col gap-y-4" disabled={isSubmitting}>
						<PasswordField
							register={register}
							error={errors.password}
							// oxlint-disable-next-line tabindex-no-positive
							tabIndex={1}
						/>
					</fieldset>
					<div className="flex flex-row justify-between">
						<Button disabled={changeMutation.isPending || !isValid}>
							Submit
						</Button>
						<Link
							to="/profile"
							className={buttonVariants({ variant: 'secondary' })}
						>
							Back to profile
						</Link>
					</div>
					<ShowAndLogError
						error={changeMutation.error}
						text="Problem changing password"
					/>
				</form>
			}
		</CardContent>
	)
}
