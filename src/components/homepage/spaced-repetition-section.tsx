import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Clock, Target, BarChart3, Calendar, Zap } from 'lucide-react'

export function SpacedRepetitionSection() {
	return (
		<section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900 dark:from-purple-900 dark:via-violet-900 dark:to-indigo-900">
			{/* Background pattern */}
			<div className="absolute inset-0 opacity-10">
				<div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:28px_28px]"></div>
			</div>

			{/* Floating elements */}
			<div className="absolute top-24 left-12 h-28 w-28 rounded-full bg-purple-400/20 blur-xl"></div>
			<div className="absolute right-12 bottom-24 h-36 w-36 rounded-full bg-violet-400/20 blur-xl"></div>

			<div className="relative z-10 container mx-auto px-4 py-16">
				<div className="mx-auto max-w-6xl">
					{/* Section header */}
					<div className="mb-16 text-center">
						<div className="mb-6 flex justify-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-400/20">
								<Brain className="h-8 w-8 text-purple-300" />
							</div>
						</div>
						<h2 className="mb-6 text-5xl font-bold text-white md:text-6xl">
							Spaced Repetition System
						</h2>
						<p className="mx-auto max-w-3xl text-xl leading-relaxed text-purple-100 md:text-2xl">
							Science-backed learning that adapts to your memory patterns for
							maximum retention
						</p>
					</div>

					{/* Main content */}
					<div className="mb-16 grid items-center gap-12 lg:grid-cols-2">
						{/* Left side - Learning curve visualization */}
						<div className="space-y-6">
							<Card className="border-white/10 bg-white/5 p-8">
								<h3 className="mb-6 text-center text-2xl font-semibold text-white">
									Your Learning Progress
								</h3>

								{/* Simulated progress bars */}
								<div className="space-y-4">
									<div className="flex items-center gap-4">
										<div className="h-3 w-3 rounded-full bg-green-400"></div>
										<div className="flex-1">
											<div className="mb-1 flex justify-between text-sm text-purple-100">
												<span>&ldquo;Hola, ¿cómo estás?&rdquo;</span>
												<span>Mastered</span>
											</div>
											<div className="h-2 w-full rounded-full bg-white/10">
												<div className="h-2 w-full rounded-full bg-green-400"></div>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-4">
										<div className="h-3 w-3 rounded-full bg-blue-400"></div>
										<div className="flex-1">
											<div className="mb-1 flex justify-between text-sm text-purple-100">
												<span>&ldquo;¿Dónde está el baño?&rdquo;</span>
												<span>Review in 2 days</span>
											</div>
											<div className="h-2 w-full rounded-full bg-white/10">
												<div className="h-2 w-3/4 rounded-full bg-blue-400"></div>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-4">
										<div className="h-3 w-3 rounded-full bg-yellow-400"></div>
										<div className="flex-1">
											<div className="mb-1 flex justify-between text-sm text-purple-100">
												<span>&ldquo;Me gusta mucho&rdquo;</span>
												<span>Review tomorrow</span>
											</div>
											<div className="h-2 w-full rounded-full bg-white/10">
												<div className="h-2 w-1/2 rounded-full bg-yellow-400"></div>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-4">
										<div className="h-3 w-3 rounded-full bg-red-400"></div>
										<div className="flex-1">
											<div className="mb-1 flex justify-between text-sm text-purple-100">
												<span>&ldquo;No entiendo&rdquo;</span>
												<span>Review now</span>
											</div>
											<div className="h-2 w-full rounded-full bg-white/10">
												<div className="h-2 w-1/4 rounded-full bg-red-400"></div>
											</div>
										</div>
									</div>
								</div>

								<div className="mt-6 rounded-lg bg-white/10 p-4">
									<div className="flex items-center gap-2 text-sm text-purple-100">
										<Zap className="h-4 w-4 text-yellow-400" />
										<span>Next review session: 20 minutes (54 cards)</span>
									</div>
								</div>
							</Card>
						</div>

						{/* Right side - Benefits */}
						<div className="space-y-8">
							<Card className="border-white/20 bg-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/15">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-400/20">
										<Clock className="h-6 w-6 text-violet-300" />
									</div>
									<div>
										<h3 className="mb-2 text-xl font-semibold text-white">
											Optimal Timing
										</h3>
										<p className="text-purple-100">
											Reviews are scheduled at the perfect moment - just before
											you're about to forget, maximizing retention with minimal
											effort.
										</p>
									</div>
								</div>
							</Card>

							<Card className="border-white/20 bg-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/15">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-violet-400/20">
										<Target className="h-6 w-6 text-violet-300" />
									</div>
									<div>
										<h3 className="mb-2 text-xl font-semibold text-white">
											Personalized Algorithm
										</h3>
										<p className="text-purple-100">
											Our AI learns your unique memory patterns and adjusts
											review intervals to match your learning speed and
											retention rate.
										</p>
									</div>
								</div>
							</Card>

							<Card className="border-white/20 bg-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white/15">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-400/20">
										<BarChart3 className="h-6 w-6 text-violet-300" />
									</div>
									<div>
										<h3 className="mb-2 text-xl font-semibold text-white">
											Proven Results
										</h3>
										<p className="text-purple-100">
											Studies show spaced repetition can improve long-term
											retention by up to 200% compared to traditional study
											methods.
										</p>
									</div>
								</div>
							</Card>

							<Card className="tranion-300 border-white/20 bg-white/10 p-6 hover:-translate-y-1 hover:bg-white/15">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-pink-400/20">
										<Calendar className="h-6 w-6 text-violet-300" />
									</div>
									<div>
										<h3 className="mb-2 text-xl font-semibold text-white">
											Flexible Schedule
										</h3>
										<p className="text-purple-100">
											Study at your own pace with smart notifications that
											remind you when it's time for your next review session.
										</p>
									</div>
								</div>
							</Card>
						</div>
					</div>

					{/* CTA */}
					<div className="text-center">
						<Button
							size="lg"
							className="transform rounded-full bg-gradient-to-r from-purple-500 to-violet-500 font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:from-purple-600 hover:to-violet-600 hover:shadow-xl"
						>
							Start Smart Learning
						</Button>
					</div>
				</div>
			</div>
		</section>
	)
}
