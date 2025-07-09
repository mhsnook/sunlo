import { Card } from '@/components/ui/card'
import { Users, BookOpen, Heart, Star, ArrowRight } from 'lucide-react'
import { ThemeToggle } from '@/components/homepage/theme-toggle'
import { UnderConstructionNotice } from './under-construction'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { buttonVariants } from '../ui/button-variants'

export function HeroSection() {
	return (
		<header className="dark:from-background dark:to-muted from-primary/30 via-background to-foresoft relative min-h-screen overflow-hidden bg-gradient-to-br dark:via-slate-800">
			{/* Theme Toggle */}
			<ThemeToggle />

			{/* Subtle background pattern */}
			<div className="absolute inset-0 opacity-20 dark:opacity-30">
				<div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(0,0,0,0.5)_1px,_transparent_1px)] bg-[length:24px_24px] dark:bg-[radial-gradient(circle,_rgba(255,255,255,0.3)_1px,_transparent_1px)]"></div>
			</div>

			{/* Floating elements for visual interest */}
			<div className="absolute top-20 left-[5%] h-20 w-20 rounded-full bg-green-600/40 blur-xl dark:bg-green-400/30"></div>
			<div className="absolute top-40 right-[5%] h-32 w-32 rounded-full bg-yellow-600/30 blur-xl dark:bg-yellow-400/30"></div>
			<div className="absolute bottom-40 left-[7%] h-24 w-24 rounded-full bg-blue-600/30 blur-xl dark:bg-blue-400/30"></div>

			<div className="relative z-10 container mx-auto px-4 py-16">
				<div className="mx-auto max-w-5xl">
					{/* Logo and brand section */}
					<div className="mb-16 text-center">
						<div className="mb-8 flex justify-center">
							<div className="relative">
								<img
									src="/images/logo-pair.png"
									alt="Sunlo mascots - friendly learning companions"
									width={200}
									height={120}
									className="drop-shadow-2xl"
									fetchPriority="high"
								/>
								<div className="absolute -top-2 -right-2 h-6 w-6 animate-pulse rounded-full bg-yellow-400 shadow-lg dark:bg-yellow-300"></div>
							</div>
						</div>

						<h1 className="from-foreground to-primary mb-6 bg-gradient-to-r bg-clip-text text-6xl font-bold tracking-tight text-transparent md:text-8xl dark:from-white dark:via-blue-200 dark:to-indigo-200">
							Sunlo
						</h1>

						<p className="text-foreground mx-auto mb-8 max-w-2xl text-2xl font-extralight text-balance md:text-3xl dark:text-slate-300">
							Social language learning that brings people together
						</p>
					</div>

					{/* Value proposition */}
					<div className="mb-16 text-center">
						{/* Feature highlights */}
						<div className="mx-auto mb-12 grid max-w-4xl gap-6 md:grid-cols-3">
							<Card className="border-primary/30 bg-white/10 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
								<div className="flex flex-col items-center text-center">
									<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-700/70 dark:bg-green-400/30">
										<BookOpen className="h-6 w-6 text-green-300 dark:text-green-200" />
									</div>
									<h2 className="mb-2 font-semibold opacity-80">
										Personal Flash Cards
									</h2>
									<p className="text-sm text-balance opacity-80">
										Create custom cards tailored to your learning style
									</p>
								</div>
							</Card>

							<Card className="border-primary/30 bg-white/10 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
								<div className="flex flex-col items-center text-center">
									<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700/70 dark:bg-blue-400/30">
										<Users className="h-6 w-6 text-blue-300 dark:text-blue-200" />
									</div>
									<h2 className="mb-2 font-semibold opacity-80">
										Community Pool
									</h2>
									<p className="text-sm text-balance opacity-80">
										Access thousands of crowd-sourced learning materials
									</p>
								</div>
							</Card>

							<Card className="border-primary/30 bg-white/10 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
								<div className="flex flex-col items-center text-center">
									<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-700/70 dark:bg-yellow-400/30">
										<Heart className="h-6 w-6 text-yellow-300 dark:text-yellow-200" />
									</div>
									<h2 className="mb-2 font-semibold opacity-80">
										Help Friends
									</h2>
									<p className="text-sm text-balance opacity-80">
										Share essential phrases and learn together
									</p>
								</div>
							</Card>
						</div>
					</div>

					{/* Call to action */}
					<div className="mb-16 text-center">
						<div className="mx-auto mb-8 flex max-w-md flex-col items-center justify-center gap-4 sm:flex-row">
							<Link
								to="/signup"
								className={cn(
									buttonVariants({ size: 'lg' }),
									'group from-primary dark:from-primary dark:hover:to-primary] w-full transform rounded-full border-2 border-transparent bg-gradient-to-r to-violet-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl sm:w-auto dark:hover:from-purple-700'
								)}
							>
								Start Learning Free
								<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
							</Link>
							<Link
								to="/login"
								className={cn(
									buttonVariants({ size: 'lg', variant: 'outline' }),
									'border-primary/30 hover:border-primary/60 hover:bg-foreground/5 w-full rounded-full border-2 bg-transparent text-lg font-semibold transition-all duration-300 sm:w-auto dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/5'
								)}
							>
								Sign In
							</Link>
						</div>

						{/* Trust indicators */}
						<div className="text-muted-foreground flex flex-col items-center justify-center gap-6 text-sm sm:flex-row">
							<div className="flex items-center gap-2">
								<div className="flex">
									{[0, 1, 2, 3, 4].map((i) => (
										<Star
											key={i}
											className="h-4 w-4 fill-yellow-500 text-yellow-500 dark:fill-yellow-300 dark:text-yellow-300"
										/>
									))}
								</div>
								<span>Loved by learners</span>
							</div>
							<div className="flex items-center gap-2">
								<Users className="h-4 w-4" />
								<span>Join 5+ active learners</span>
							</div>
							<div className="flex items-center gap-2">
								<Heart className="h-4 w-4" />
								<span>Free forever</span>
							</div>
						</div>
						<UnderConstructionNotice />
					</div>
				</div>
			</div>

			{/* Bottom decorative wave */}
			<div className="absolute right-0 bottom-0 left-0">
				<svg
					viewBox="0 0 1200 120"
					preserveAspectRatio="none"
					className="h-20 w-full fill-white/10 dark:fill-white/5"
				>
					<path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"></path>
				</svg>
			</div>
		</header>
	)
}
