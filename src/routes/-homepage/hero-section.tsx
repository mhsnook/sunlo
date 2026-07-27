import { Card } from '@/components/ui/card'
import {
	Users,
	BookOpen,
	Heart,
	Star,
	ArrowRight,
	Compass,
	LogIn,
	UserPlus,
} from 'lucide-react'
import { UnderConstructionNotice } from './under-construction'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function HeroSection() {
	return (
		<header className="from-lum-3 from-chroma-mlow to-lum-5 to-chroma-max relative min-h-screen overflow-hidden bg-gradient-to-br">
			{/* Subtle background pattern */}
			<div className="absolute inset-0 opacity-10">
				<div className="absolute inset-0 bg-[radial-gradient(circle,_oklch(var(--lum-max)_0_0)_1px,_transparent_1px)] bg-[length:24px_24px]"></div>
			</div>

			{/* Floating elements for visual interest */}
			<div className="bg-lum-5 bg-chroma-max bg-hue-success absolute top-20 left-[5%] h-20 w-20 rounded-full opacity-40 blur-xl"></div>
			<div className="bg-lum-5 bg-chroma-max bg-hue-warning absolute top-40 right-[5%] h-32 w-32 rounded-full opacity-30 blur-xl"></div>
			<div className="bg-lum-5 bg-chroma-max bg-hue-info absolute bottom-40 left-[7%] h-24 w-24 rounded-full opacity-30 blur-xl"></div>

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
								<div className="bg-lum-5 bg-chroma-max bg-hue-warning absolute -top-2 -right-2 h-6 w-6 animate-pulse rounded-full shadow-lg"></div>
							</div>
						</div>

						<h1 className="from-lum-10 to-lum-5 to-chroma-max mb-6 bg-gradient-to-r bg-clip-text text-6xl font-bold tracking-tight text-transparent md:text-8xl">
							Sunlo
						</h1>

						<p className="text-con-mhigh mx-auto mb-8 max-w-2xl text-2xl font-extralight text-balance md:text-3xl">
							Social language learning that brings people together
						</p>
					</div>

					{/* Value proposition */}
					<div className="mb-16 text-center">
						{/* Feature highlights */}
						<div className="mx-auto mb-12 grid max-w-4xl gap-6 md:grid-cols-3">
							<Card className="moving-glass-card border-con-low">
								<div className="flex flex-col items-center text-center">
									<div className="bg-lum-6 bg-chroma-mid bg-hue-success mb-4 flex h-12 w-12 items-center justify-center rounded-full">
										<BookOpen className="text-lum-none h-6 w-6" />
									</div>
									<h2 className="mb-2 font-semibold opacity-80">
										Personal Flash Cards
									</h2>
									<p className="text-sm text-balance opacity-80">
										Create custom cards tailored to your learning style
									</p>
								</div>
							</Card>

							<Card className="moving-glass-card border-con-low">
								<div className="flex flex-col items-center text-center">
									<div className="bg-lum-6 bg-chroma-mid bg-hue-info mb-4 flex h-12 w-12 items-center justify-center rounded-full">
										<Users className="text-lum-none h-6 w-6" />
									</div>
									<h2 className="mb-2 font-semibold opacity-80">
										Community Pool
									</h2>
									<p className="text-sm text-balance opacity-80">
										Access thousands of crowd-sourced learning materials
									</p>
								</div>
							</Card>

							<Card className="moving-glass-card border-con-low">
								<div className="flex flex-col items-center text-center">
									<div className="bg-lum-6 bg-chroma-mid bg-hue-warning mb-4 flex h-12 w-12 items-center justify-center rounded-full">
										<Heart className="text-lum-none h-6 w-6" />
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
								to="/browse"
								className={cn(
									'btn btn-size-lg btn-variant-soft',
									'group border-con-low border-chroma-mlow hover:border-con-mid hover:bg-lum-2 w-full border-2 bg-transparent text-lg font-semibold transition-all duration-300 sm:w-auto'
								)}
							>
								<Compass className="opacity-60 transition-opacity group-hover:opacity-100" />{' '}
								Browse Library
							</Link>
							<Link
								to="/signup"
								className={cn(
									'btn btn-size-lg btn-variant-default',
									'group from-lum-5 from-chroma-max w-full border-2 border-transparent bg-gradient-to-r to-lum-6 to-chroma-max text-lum-none hover:from-lum-6 hover:to-lum-7 px-8 text-lg font-semibold shadow-lg transition-all duration-300 hover:shadow-xl sm:w-auto'
								)}
							>
								<UserPlus className="opacity-60 transition-opacity group-hover:opacity-100" />{' '}
								Start Learning
								<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
							</Link>
							<Link
								to="/login"
								className={cn(
									'btn btn-size-lg btn-variant-soft',
									'group border-con-low border-chroma-mlow hover:border-con-mid hover:bg-lum-2 w-full border-2 bg-transparent text-lg font-semibold transition-all duration-300 sm:w-auto'
								)}
							>
								<LogIn className="opacity-60 transition-opacity group-hover:opacity-100" />{' '}
								Sign In
							</Link>
						</div>

						{/* Trust indicators */}
						<div className="text-con-mid flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-xs sm:text-sm">
							<div className="flex items-center gap-1.5">
								<div className="flex">
									{[0, 1, 2, 3, 4].map((i) => (
										<Star
											key={i}
											className="text-lum-5 text-chroma-max text-hue-warning h-3 w-3 fill-current"
										/>
									))}
								</div>
								<span>Loved by learners</span>
							</div>
							<span className="opacity-40">·</span>
							<div className="flex items-center gap-1.5">
								<Users className="h-3 w-3" />
								<span>5+ active learners</span>
							</div>
							<span className="opacity-40">·</span>
							<div className="flex items-center gap-1.5">
								<Heart className="h-3 w-3" />
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
					className="fill-lum-none h-20 w-full opacity-10"
				>
					<path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"></path>
				</svg>
			</div>
		</header>
	)
}
