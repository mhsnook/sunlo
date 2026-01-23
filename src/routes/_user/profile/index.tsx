import { createFileRoute, Navigate } from '@tanstack/react-router'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import AvatarSection from '@/routes/_user/profile/-avatar-section'
import UserAuthCard from '@/routes/_user/profile/-user-auth-card'
import { useProfile } from '@/hooks/use-profile'
import { UpdateProfileForm } from './-update-profile-form'
import { DisplayPreferences } from './-display-preferences'

export const Route = createFileRoute('/_user/profile/')({
	component: ProfilePage,
})

function ProfilePage() {
	const { data: profile } = useProfile()

	if (!profile) return <Navigate to={`/getting-started`} />

	return (
		<main data-testid="profile-page" className="flex flex-col gap-6 px-px">
			<AvatarSection />

			<Card>
				<CardHeader>
					<CardTitle>Edit Profile</CardTitle>
					<CardDescription>Update your profile information</CardDescription>
				</CardHeader>
				<CardContent>
					<UpdateProfileForm profile={profile} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Display Preferences</CardTitle>
					<CardDescription>Customize how the app looks for you</CardDescription>
				</CardHeader>
				<CardContent>
					<DisplayPreferences profile={profile} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Login Credentials</CardTitle>
					<CardDescription>Update your email or password</CardDescription>
				</CardHeader>
				<CardContent>
					<UserAuthCard />
				</CardContent>
			</Card>
		</main>
	)
}
