import { Heart, Users, Shield, Sparkles } from 'lucide-react'
import { IntroSheet } from '@/components/intro-sheet'

interface CommunityNormsIntroProps {
	open: boolean
	onAffirm: () => void
}

export function CommunityNormsIntro({
	open,
	onAffirm,
}: CommunityNormsIntroProps) {
	return (
		<IntroSheet
			open={open}
			onOpenChange={() => {}} // Can't close without affirming
			title="Welcome to the Sunlo Community"
			description="Before you dive in, let's set some expectations."
			requireAffirmation
			actionLabel="I agree to these norms"
			onAction={onAffirm}
			data-testid="community-norms-intro"
			actionTestId="affirm-community-norms-button"
		>
			<div className="space-y-4">
				<p className="text-muted-foreground">
					Sunlo is built by and for language learners. We're a community of
					people helping each other connect across cultures. Here's what we ask
					of everyone:
				</p>

				<div className="space-y-3">
					<NormItem
						icon={Heart}
						title="Be Kind and Patient"
						description="Everyone is learning. Mistakes are part of the process. Be encouraging and supportive, especially to beginners."
					/>

					<NormItem
						icon={Users}
						title="Share Authentically"
						description="When you contribute translations or phrases, share what you actually know. It's okay to not know something - that's what phrase requests are for!"
					/>

					<NormItem
						icon={Shield}
						title="Respect Cultures"
						description="Languages carry culture. Be respectful when learning about traditions, customs, and contexts that may be different from your own."
					/>

					<NormItem
						icon={Sparkles}
						title="Help Build Something Good"
						description="The more you contribute accurate, helpful content, the better Sunlo becomes for everyone. Quality over quantity."
					/>
				</div>

				<div className="bg-primary/5 rounded-lg border p-4 text-sm">
					<p className="font-medium">What this means in practice:</p>
					<ul className="text-muted-foreground mt-2 ml-4 list-disc space-y-1">
						<li>Don't add joke translations or misleading content</li>
						<li>Credit native speakers who help you</li>
						<li>Flag content that seems wrong rather than just ignoring it</li>
						<li>
							Remember there's a real person on the other end of every
							interaction
						</li>
					</ul>
				</div>
			</div>
		</IntroSheet>
	)
}

function NormItem({
	icon: Icon,
	title,
	description,
}: {
	icon: typeof Heart
	title: string
	description: string
}) {
	return (
		<div className="flex gap-3">
			<div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
				<Icon className="size-5" />
			</div>
			<div>
				<p className="font-medium">{title}</p>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
		</div>
	)
}
