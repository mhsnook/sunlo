import { useMutation } from '@tanstack/react-query'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from '@/components/ui/sonner'
import { Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShowAndLogError } from '@/components/errors'
import supabase from '@/lib/supabase-client'

/* NOTE: This component does not work and is not used. Using the "invite by email"
 * capability in supabase requires using supabase.admin.auth, which we don't give
 * to the client (or the Tauri app) */

const inviteFriendSchema = z.object({
	email: z.string().email('Please enter a valid email'),
})

type InviteFriendValues = z.infer<typeof inviteFriendSchema>

export function InviteFriendForm() {
	const { control, handleSubmit } = useForm<InviteFriendValues>({
		resolver: zodResolver(inviteFriendSchema),
	})

	const invite = useMutation({
		mutationKey: ['user', 'invite_friend'],
		mutationFn: async (values: InviteFriendValues) => {
			const { data, error } = await supabase.auth.admin.inviteUserByEmail(
				values.email
			)
			if (error) throw error
			return data
		},
		onSuccess: (_, values) => {
			toast.success(`Invitation sent to ${values.email}.`)
		},
	})

	return (
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		<form onSubmit={handleSubmit((data) => invite.mutate(data))}>
			<fieldset
				className="flex flex-row items-end gap-2"
				disabled={invite.isPending}
			>
				<div className="w-full">
					<Label htmlFor="email">Friend's email</Label>
					<Controller
						name="email"
						control={control}
						render={({ field }) => (
							<Input
								{...field}
								type="email"
								placeholder="Enter your friend's email"
							/>
						)}
					/>
				</div>
				<Button disabled={invite.isPending}>
					<Send />
					<span className="hidden @md:block">Send</span>
				</Button>
			</fieldset>
			<ShowAndLogError
				text="There was an error submitting your request"
				values={invite.variables}
				error={invite.error}
				className="mt-4"
			/>
		</form>
	)
}
