import { createFileRoute, Link } from '@tanstack/react-router'
import { UnderConstruction } from '@/components/under-construction'
import { GarlicBroccoli } from '@/components/garlic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuList,
} from '@/components/ui/navigation-menu'
import BlueskyLogo from '@/components/svg/bluesky-logo'
import {
	Code,
	FileText,
	Heart,
	LogIn,
	MessageSquareText,
	PlaneLanding,
	Sparkles,
	UserPlus,
	Users,
	UsersIcon,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'

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
		<>
			<main className="mb-8 flex flex-row flex-wrap gap-4 @xl:my-20">
				<div className="mx-auto flex max-w-[537px] basis-11/12 flex-col justify-center space-y-4 @xl:basis-3/5">
					<h1 className="d1 mt-12 text-center @xl:mt-8 @xl:mb-4 @xl:text-start @3xl:mb-10">
						Sunlo: social language&nbsp;learning
					</h1>
					<p className="text-center text-xl @xl:h-[120px] @xl:text-start">
						Create your own flash cards, pick from a crowd-sourced pool, or send
						your friend some key phrases to help them learn.
					</p>
				</div>
				<div className="mx-auto flex-none space-y-4 text-center @xl:basis-1/3">
					<GarlicBroccoli />
					<div className="flex w-60 flex-col gap-1 place-self-center">
						<Link
							to="/signup"
							from="/"
							className={buttonVariants({ size: 'lg' })}
						>
							Sign up
						</Link>
						<Link
							to="/login"
							from="/"
							className={buttonVariants({ size: 'lg', variant: 'outline' })}
						>
							Log in
						</Link>
					</div>
				</div>
			</main>

			<UnderConstruction />

			<section className="my-16 px-1 pt-4 pb-8 @lg:px-4 @lg:pt-10 @lg:pb-16">
				<h2 className="h2 px-4 text-center @lg:mb-6">
					Our Approach to Language&nbsp;Learning
				</h2>
				<div className="flex flex-row flex-wrap gap-4">
					<Card className="grow basis-80">
						<CardHeader>
							<CardTitle className="flex flex-row gap-2">
								<MessageSquareText /> Phrase Based
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<p>
								Sunlo&apos;s approach is phrases-first, useful for people who
								are immersed in a new language context and want to learn for
								immediate use – how to ask for directions or order tea or swear
								at your friends.
							</p>
							<p>
								We think this is effective, and motivating – and it means you
								can choose the areas you focus on to suit your goals.
							</p>
						</CardContent>
					</Card>
					<Card className="grow basis-80">
						<CardHeader>
							<CardTitle className="flex flex-row gap-2">
								<UsersIcon /> Social Learning
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<p>
								We don&apos;t learn languages to earn gems or score points – we
								learn to connect with people.
							</p>
							<p>
								When you move to a new city, take a new job, or want to learn
								the language of your extended family, you will always find
								people who want to help, which is why Sunlo has a special
								&ldquo;Friend Mode&rdquo; so your new friends can send you all
								their favourite phrases and help you along your journey.
							</p>
						</CardContent>
					</Card>
					<Card className="grow basis-80">
						<CardHeader>
							<CardTitle className="flex flex-row gap-2">
								<Sparkles /> Driven by Curiosity
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<p>
								Often times, trying to translate literally from one language to
								another doesn&apos;t really work, but if you spend enough time
								clicking around you will start to catch on to the patterns.
							</p>
							<p>
								Sunlo is meant to feed your curiosity and reward it, because
								that feeling of wonder and excitement keeps your brain in its
								best learning space.
							</p>
						</CardContent>
					</Card>
				</div>
			</section>
			<section className="my-16 px-1 pt-4 pb-8 @lg:px-4 @lg:pt-10 @lg:pb-16">
				<h2 className="h2 px-4 text-center @lg:mb-6">Who is Sunlo for?</h2>
				<div className="flex flex-row flex-wrap gap-4">
					<Card className="grow basis-80">
						<CardHeader>
							<CardTitle className="flex flex-row gap-2">
								<PlaneLanding /> Moving To a New Place
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<p>
								If you just moved to a new place, and you&apos;re surrounded by
								people speaking another language, Sunlo is for you.
							</p>
							<p>
								Our approach works best when you have daily opportunities to
								deploy your new skills and build on them – and when you have
								friends, family or colleagues who are excited to help you learn.
							</p>
						</CardContent>
					</Card>
					<Card className="grow basis-80">
						<CardHeader>
							<CardTitle className="flex flex-row gap-2">
								<Users /> The Friend / Guide
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<p>
								If you&apos;re the one helping a friend or colleague learn{' '}
								<em>your</em> language, Sunlo&apos;s &ldquo;Friend Mode&rdquo;
								is for you! Teach them the lyrics to a favourite song, or how to
								order at lunch for the table.
							</p>
							<p>
								You can pick from our public pool of flash cards, or create new
								ones that will help the whole community too.
							</p>
						</CardContent>
					</Card>

					<Card className="grow basis-80">
						<CardHeader>
							<CardTitle className="flex flex-row gap-2">
								<Heart /> Extended Family
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<p>
								Some people grow up speaking different languages than the rest
								of their family, especially in the case of the linguistic
								&ldquo;generation gap.&rdquo; Perhaps your grandparents speak a
								more regional language and it can be difficult to find resources
								or even apps that can help.
							</p>
							<p>
								Sunlo relies on user-generated content, so you can ask your
								parents or your fun cousin and get started; no barriers will
								stand in your way.
							</p>
						</CardContent>
					</Card>
				</div>
			</section>
			<section className="my-10 pb-16 text-center">
				<h2 className="h2">Ready to get started?</h2>

				<Link to="/signup" from="/" className={buttonVariants({ size: 'lg' })}>
					Sign up and start learning &rarr;
				</Link>
			</section>

			<section className="my-16 px-2 pt-4 pb-16 @lg:px-8 @lg:pt-10">
				<Card className="p-[4%]">
					<CardHeader>
						<CardTitle className="h2 px-4 pb-6 text-center">
							The Story Behind Sunlo
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="columns-1 space-y-4 text-xl/8 @lg:columns-2">
							<p>
								Sunlo is a labour of love that started in 2015 when I came to
								India and found tools like the owl app lacking. (You know the
								one...)
							</p>
							<p>
								I found I didn&apos;t need to know the word for
								&ldquo;Tomato&rdquo; as much as I needed to be able to point at
								the tomato and say &ldquo;give me 6 of those (polite).&rdquo;
								When I learned to do this, the rest started to fall into place.
							</p>
							<p>
								As I tried other methods and researched the science of
								language-learning I started to feel a lack of good tools for
								helping people learn languages that are{' '}
								<em>different in structure</em> from the ones they&apos;re
								raised on. Learning{' '}
								<span className="decoration-accent underline decoration-[3px]">
									Spanish
								</span>{' '}
								from{' '}
								<span className="decoration-accent underline decoration-[3px]">
									English
								</span>{' '}
								may be straight-forward with lessons on vocabulary and grammar,
								but the same approach might not work to learn{' '}
								<span className="decoration-accent underline decoration-[3px]">
									Arabic
								</span>
								,{' '}
								<span className="decoration-accent underline decoration-[3px]">
									Xhosa
								</span>{' '}
								or{' '}
								<span className="decoration-accent underline decoration-[3px]">
									Mandarin
								</span>
								, whose grammars and patterns may be too unfamiliar for me to
								succeed with that formulaic approach.
							</p>
							<p>
								The answer to this problem seems to be a phrase-based approach,
								where you don&apos;t necessarily try to understand every meaning
								and tense, you learn <em>chunks of meaning</em> that you can use
								in real life. And when you do, it creates a reward in your brain
								and helps you connect with others in your world, both of which
								aid in the formation of lasting, usable memory.
							</p>
							<p>
								There&apos;s a fantastic (and free) app called Anki – which I
								also use and love! – which takes this phrase-based approach, and{' '}
								<a
									className="s-link"
									href="https://docs.ankiweb.net/background.html"
								>
									their background doc
								</a>{' '}
								does a great job of explaining why it&apos;s so effective.{' '}
							</p>
							<p>
								But the most important part of my learning journey was the
								friends I made who were excited to help me. There are a couple
								of friends who have an intuitive sense of how much I know and
								don&apos;t know, and are able to speak to me in a way that they
								know I&apos;ll understand enough of what they&apos;re saying
								that I can learn and figure out the rest.
							</p>
							<p>
								So Sunlo is a bit of a love song to those friends – the very
								reason we learn in the first place – to make them main
								characters in the play as well. It invites them to help curate
								your deck of flash cards and find or create the ones they think
								you&apos;ll need and use and love. If you&apos;re a friend
								helping a newcomer learn your language – Sunlo is for you too.
								Thank you, and welcome! I hope you love it.
							</p>
							<p className="text-center italic">– M</p>
						</div>
					</CardContent>
				</Card>
			</section>
			<section className="my-16 pt-4 pb-16 @lg:pt-10">
				<h2 className="h2 px-4 pb-6 text-center">
					Sunlo is Free and Open Source
				</h2>
				<div className="columns-1 space-y-4 text-xl/8 @lg:columns-2 @xl:columns-3">
					<p>
						For now Sunlo is just me, trying to learn languages to connect with
						the people I love. It is my humble wish that it may help others do
						the same 🙏
					</p>
					<p>
						If you have feedback or suggestions or requests, please do get in
						touch. Sunlo can&apos;t be everything to everyone, but it can always
						get better! ❤️
					</p>
					<p>
						If you&apos;re a developer or a language expert and would like to
						help,{' '}
						<a className="s-link" href="https://github.com/michaelsnook/sunlo">
							check out the code on GitHub
						</a>{' '}
						or find me on socials (
						<a className="s-link" href="https://twitter.com/mhsnook">
							tw
						</a>{' '}
						&amp;{' '}
						<a className="s-link" href="https://bsky.app/profile/sunlo.app">
							bsky
						</a>
						).
					</p>
				</div>
			</section>
			<footer className="flex justify-center">
				<NavigationMenu aria-label="Footer Navigation">
					<NavigationMenuList className="my-16 flex flex-row flex-wrap justify-center gap-8 pt-4 pb-16 @lg:pt-10">
						<>
							{footerNavigationItems.map((item, i) => (
								<NavigationMenuItem key={`nav-link-${i}`}>
									<Button
										variant="ghost"
										className="text-foreground/80"
										asChild
									>
										{item}
									</Button>
								</NavigationMenuItem>
							))}
						</>
					</NavigationMenuList>
				</NavigationMenu>
			</footer>
		</>
	)
}
