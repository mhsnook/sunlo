import { useProfile } from '@/lib/use-profile'
import { User } from 'lucide-react'

export default function AvatarSection() {
	const { data: profile } = useProfile()
	return (
		<header className="mx-auto my-4 max-w-sm text-center">
			<div className="relative">
				<label
					className="bg-foreground/20 mx-auto mb-2 flex size-36 flex-row justify-center rounded-full shadow-lg"
					htmlFor="single"
				>
					{profile === null || !profile.avatarUrl ?
						<User size={144} />
					:	<img
							src={profile.avatarUrl}
							alt="Your profile pic"
							className="size-36 rounded-full object-cover"
						/>
					}
				</label>
			</div>
			<div>
				<h2 className="text-4xl">Hello {profile?.username} 👋</h2>
			</div>
		</header>
	)
}
