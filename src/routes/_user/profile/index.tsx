import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AvatarSection from '@/routes/_user/profile/-avatar-section'
import UserAuthCard from '@/routes/_user/profile/-user-auth-card'
import { useProfile } from '@/features/profile/hooks'
import { useAuth } from '@/lib/use-auth'
import { UpdateProfileForm } from './-update-profile-form'
import { DisplayPreferences } from './-display-preferences'
import supabase from '@/lib/supabase-client'
import { removeSbTokens } from '@/lib/utils'

export const Route = createFileRoute('/_user/profile/')({
	component: ProfilePage,
})

function ProfilePage() {
	const { isAuth } = useAuth()
	const { data: profile } = useProfile()

	if (!isAuth) {
		return (
			<main
				data-testid="profile-page-public"
				className="flex flex-col gap-6 px-px"
			>
				<Card>
					<CardHeader>
						<CardTitle>Display settings</CardTitle>
						<CardDescription>
							Customize how the app looks for you
						</CardDescription>
					</CardHeader>
					<CardContent>
						<DisplayPreferences profile={null} />
					</CardContent>
				</Card>
			</main>
		)
	}

	return (
		<main data-testid="profile-page" className="flex flex-col gap-6 px-px">
			{profile ? <AvatarSection /> : null}

			{profile ? (
				<Card>
					<CardHeader>
						<CardTitle>Edit Profile</CardTitle>
						<CardDescription>Update your profile information</CardDescription>
					</CardHeader>
					<CardContent>
						<UpdateProfileForm profile={profile} />
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Display Preferences</CardTitle>
					<CardDescription>Customize how the app looks for you</CardDescription>
				</CardHeader>
				<CardContent>
					<DisplayPreferences profile={profile ?? null} />
				</CardContent>
			</Card>

			{profile ? (
				<Card>
					<CardHeader>
						<CardTitle>Login Credentials</CardTitle>
						<CardDescription>Update your email or password</CardDescription>
					</CardHeader>
					<CardContent>
						<UserAuthCard />
					</CardContent>
				</Card>
			) : null}

			<SignOutSection />
		</main>
	)
}

function SignOutSection() {
	const navigate = useNavigate()
	const signOut = useMutation({
		mutationFn: async () => {
			const { error } = await supabase.auth.signOut({ scope: 'local' })
			if (error) {
				console.log(`auth.signOut error:`, error, `- clearing session manually`)
				removeSbTokens()
				window.location.href = '/'
				return
			}
		},
		onSettled: () => {
			void navigate({ to: '/' })
		},
	})

	return (
		<div className="flex justify-end pt-2">
			<Button
				variant="ghost"
				className="text-7-mhi-danger hover:text-7-hi-danger"
				onClick={() => signOut.mutate()}
				data-testid="profile-signout-button"
				disabled={signOut.isPending}
			>
				<LogOut />
				{signOut.isPending ? 'Signing out...' : 'Sign out'}
			</Button>
		</div>
	)
}
