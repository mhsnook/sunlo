import { createFileRoute } from '@tanstack/react-router'
import { HeroSection } from '@/components/homepage/hero-section'
import { CrowdSourcedSection } from '@/components/homepage/crowd-sourced-section'
import { SpacedRepetitionSection } from '@/components/homepage/spaced-repetition-section'
import { SocialLearningSection } from '@/components/homepage/social-learning-section'
import { ThemeToggle } from '@/components/homepage/theme-toggle'
import { FooterNavigation } from '@/components/homepage/footer-nav'

export const Route = createFileRoute('/')({
	component: Index,
})

function Index() {
	return (
		<div className="relative">
			<ThemeToggle />
			<HeroSection />
			<CrowdSourcedSection />
			<SpacedRepetitionSection />
			<SocialLearningSection />
			<FooterNavigation />
		</div>
	)
}
