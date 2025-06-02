import { createFileRoute, Link } from '@tanstack/react-router'
import BlueskyLogo from '@/components/svg/bluesky-logo'
import { Code, FileText, LogIn, UserPlus } from 'lucide-react'
import { HeroSection } from '@/components/homepage/hero-section'
import { CrowdSourcedSection } from '@/components/homepage/crowd-sourced-section'
import { SpacedRepetitionSection } from '@/components/homepage/spaced-repetition-section'
import { SocialLearningSection } from '@/components/homepage/social-learning-section'
import { ThemeToggle } from '@/components/homepage/theme-toggle'

export const Route = createFileRoute('/')({
	component: Index,
})

const className = 'mr-2 h-6 w-4'

const footerNavigationItems = [
	<a href="https://github.com/mhsnook/sunlo">
		<Code className={className} />
		GitHub
	</a>,
	<a href="https://bsky.app/profile/sunlo.app">
		<BlueskyLogo className={className} />
		BlueSky
	</a>,
	<Link to="/privacy-policy" from="/">
		<FileText className={className} />
		Privacy Policy
	</Link>,
	<Link to="/login" from="/">
		<LogIn className={className} />
		Login
	</Link>,
	<Link to="/signup" from="/">
		<UserPlus className={className} />
		Signup
	</Link>,
]

function Index() {
	return (
		<div className="relative">
			<ThemeToggle />
			<HeroSection />
			<CrowdSourcedSection />
			<SpacedRepetitionSection />
			<SocialLearningSection />
		</div>
	)
}
