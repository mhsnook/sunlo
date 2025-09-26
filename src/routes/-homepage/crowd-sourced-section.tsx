import { Card } from '@/components/ui/card'
import {
	Globe,
	Users,
	CheckCircle,
	Search,
	Filter,
	MessagesSquare,
	ChartColumnIncreasing,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'

export function CrowdSourcedSection() {
	return (
		<section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 dark:from-green-900 dark:via-emerald-900 dark:to-teal-900">
			{/* Background pattern */}
			<div className="absolute inset-0 opacity-10">
				<div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:32px_32px]"></div>
			</div>

			{/* Floating elements */}
			<div className="absolute top-32 right-16 h-24 w-24 rounded-full bg-emerald-400/20 blur-xl"></div>
			<div className="absolute bottom-32 left-16 h-32 w-32 rounded-full bg-teal-400/20 blur-xl"></div>

			<div className="relative z-10 container mx-auto px-4 py-16">
				<div className="mx-auto max-w-6xl">
					{/* Section header */}
					<div className="mb-16 text-center">
						<div className="mb-6 flex justify-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/20">
								<Globe className="h-8 w-8 text-emerald-300" />
							</div>
						</div>
						<h2 className="mx-auto mb-6 max-w-200 text-5xl font-bold text-balance text-white md:text-6xl">
							Crowd-Sourced Phrase Library
						</h2>
						<p className="mx-auto max-w-3xl text-xl leading-relaxed text-balance text-emerald-100 md:text-2xl">
							Tap into the collective wisdom of thousands of language learners
							worldwide
						</p>
					</div>

					{/* Main content grid */}
					<div className="mb-16 grid items-center gap-12 lg:grid-cols-2">
						{/* Left side - Benefits */}
						<div className="space-y-8">
							<Card className="moving-glass-card">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/20">
										<MessagesSquare className="h-6 w-6 text-green-300" />
									</div>
									<div>
										<h3 className="mb-2 text-xl font-semibold text-white">
											Real-World Relevance
										</h3>
										<p className="text-emerald-100">
											Learn phrases that native speakers actually use in
											everyday conversations, not just textbook examples.
										</p>
									</div>
								</div>
							</Card>

							<Card className="moving-glass-card">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-teal-400/20">
										<CheckCircle className="h-6 w-6 text-amber-300" />
									</div>
									<div>
										<h3 className="mb-2 text-xl font-semibold text-white">
											Community Verified
										</h3>
										<p className="text-emerald-100">
											Every phrase is reviewed and validated by native speakers
											and experienced learners in our community.
										</p>
									</div>
								</div>
							</Card>

							<Card className="moving-glass-card">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-400/20">
										<ChartColumnIncreasing className="h-6 w-6 text-sky-300" />
									</div>
									<div>
										<h3 className="mb-2 text-xl font-semibold text-white">
											Always Growing
										</h3>
										<p className="text-emerald-100">
											Our library expands daily with new phrases, cultural
											context, and regional variations contributed by users.
										</p>
									</div>
								</div>
							</Card>
						</div>

						{/* Right side - Interactive preview */}
						<div className="space-y-6">
							<Card className="border-white/10 bg-white/5 p-8">
								<div className="mb-6 flex items-center gap-4">
									<Search className="h-5 w-5 text-emerald-300" />
									<div className="flex-1 rounded-full bg-white/10 px-4 py-2 text-emerald-100">
										Search phrases...
									</div>
									<Filter className="h-5 w-5 text-emerald-300" />
								</div>

								<div className="space-y-4">
									<div className="rounded-lg bg-white/10 p-4 transition-colors hover:bg-white/15">
										<div className="mb-2 flex items-start justify-between">
											<span className="font-medium text-white">
												"How&apos;s it going?"
											</span>
											<span className="text-sm text-emerald-300">
												🇺🇸 English
											</span>
										</div>
										<p className="mb-2 text-sm text-emerald-100">
											"¿Cómo va todo?"
										</p>
										<div className="flex items-center gap-2 text-xs text-emerald-200">
											<Users className="h-3 w-3" />
											<span>Verified by 127 users</span>
										</div>
									</div>

									<div className="rounded-lg bg-white/10 p-4 transition-colors hover:bg-white/15">
										<div className="mb-2 flex items-start justify-between">
											<span className="font-medium text-white">
												{'"Let\'s grab coffee"'}
											</span>
											<span className="text-sm text-emerald-300">
												🇺🇸 English
											</span>
										</div>
										<p className="mb-2 text-sm text-emerald-100">
											"Vamos a tomar un café"
										</p>
										<div className="flex items-center gap-2 text-xs text-emerald-200">
											<Users className="h-3 w-3" />
											<span>Verified by 89 users</span>
										</div>
									</div>

									<div className="rounded-lg bg-white/10 p-4 transition-colors hover:bg-white/15">
										<div className="mb-2 flex items-start justify-between">
											<span className="font-medium text-white">
												{'"I\'m running late"'}
											</span>
											<span className="text-sm text-emerald-300">
												🇺🇸 English
											</span>
										</div>
										<p className="mb-2 text-sm text-emerald-100">
											"Voy a llegar tarde"
										</p>
										<div className="flex items-center gap-2 text-xs text-emerald-200">
											<Users className="h-3 w-3" />
											<span>Verified by 203 users</span>
										</div>
									</div>
								</div>
							</Card>

							<div className="text-center">
								<Link
									to="/signup"
									className={cn(
										buttonVariants({ size: 'lg' }),
										'transform bg-emerald-600 font-semibold text-white/80 transition-all duration-300 hover:scale-105 hover:bg-emerald-700'
									)}
								>
									Explore Phrase Library
								</Link>
							</div>
						</div>
					</div>

					{/* Stats */}
					<div className="grid gap-8 text-center md:grid-cols-3">
						<div>
							<div className="mb-2 text-4xl font-bold text-white">50+</div>
							<div className="text-emerald-200">Verified Phrases</div>
						</div>
						<div>
							<div className="mb-2 text-4xl font-bold text-white">150</div>
							<div className="text-emerald-200">Languages Supported</div>
						</div>
						<div>
							<div className="mb-2 text-4xl font-bold text-white">1.2+</div>
							<div className="text-emerald-200">Daily Contributions</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
