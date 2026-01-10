import { Card } from '@/components/ui/card'
import {
	Heart,
	Users,
	MessageCircle,
	Gift,
	Share,
	Github,
	Sparkles,
	InfinityIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'

export function SocialLearningSection() {
	const [isForFriends, setIsForFriends] = useState(false)

	return (
		<section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-900 via-pink-800 to-orange-900 dark:from-rose-900 dark:via-pink-900 dark:to-orange-900">
			{/* Background pattern */}
			<div className="absolute inset-0 opacity-10">
				<div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:30px_30px]"></div>
			</div>

			{/* Floating elements */}
			<div className="absolute top-28 right-14 h-26 w-26 rounded-full bg-rose-400/20 blur-xl"></div>
			<div className="absolute bottom-28 left-14 h-30 w-30 rounded-full bg-orange-400/20 blur-xl"></div>

			<div className="relative z-10 container mx-auto px-4 py-16">
				<div className="mx-auto max-w-6xl">
					{/* Section header */}
					<div className="mb-16 text-center">
						<div className="mb-6 flex justify-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-400/20">
								<button className="cursor-pointer">
									<Heart
										// oxlint-disable-next-line jsx-no-new-function-as-prop
										onClick={() => setIsForFriends((val) => !val)}
										className="h-8 w-8 text-rose-300"
									/>
								</button>
							</div>
						</div>
						<h2 className="mb-6 text-5xl font-bold text-white md:text-6xl">
							Friends & Family Learning
						</h2>
						<p className="mx-auto max-w-2xl text-xl leading-relaxed text-rose-100 md:text-2xl">
							Turn language learning into a shared journey with the people who
							{isForFriends ? ' you explore the world with' : ' matter most'}
						</p>
					</div>

					{/* Main content grid */}
					<div className="mb-16 grid items-center gap-12 lg:grid-cols-2">
						{/* Left side - Social features */}
						<div className="space-y-6">
							<Card className="border-white/10 bg-white/5 p-6">
								<h3 className="mb-4 flex items-center gap-3 text-xl font-semibold text-white">
									<MessageCircle className="h-6 w-6 text-rose-300" />
									{isForFriends ? 'Close Friends' : 'Family'} Learning Circle
								</h3>

								<div className="space-y-3">
									<div className="flex items-center gap-3 rounded-lg bg-white/10 p-3">
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-400 text-sm font-semibold text-white">
											M
										</div>
										<div className="flex-1">
											<div className="text-sm text-white">
												{isForFriends ? 'Manju ' : 'Mom '}
												sent you a phrase pack
											</div>
											<div className="text-xs text-rose-200">
												{isForFriends ?
													`"Essential Kannada now that you've moved"`
												:	'"Essential Punjabi for your trip"'}
											</div>
										</div>
										<Gift className="h-4 w-4 text-rose-300" />
									</div>

									<div className="flex items-center gap-3 rounded-lg bg-white/10 p-3">
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-400 text-sm font-semibold text-white">
											D
										</div>
										<div className="flex-1">
											<div className="text-sm text-white">
												{isForFriends ? 'Devu ' : 'Dad '}
												is practicing with you
											</div>
											<div className="text-xs text-rose-200">
												{isForFriends ?
													`"Let's learn all the swear words!"`
												:	`"Let's learn all the best food words!"`}
											</div>
										</div>
										<Users className="h-4 w-4 text-orange-300" />
									</div>

									<div className="flex items-center gap-3 rounded-lg bg-white/10 p-3">
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-400 text-sm font-semibold text-white">
											S
										</div>
										<div className="flex-1">
											<div className="text-sm text-white">
												{isForFriends ? 'Shilpa ' : 'Sister '}
												shared a memory tip
											</div>
											<div className="text-xs text-rose-200">
												{isForFriends ?
													'"These drinking songs are fun asf"'
												:	'"These folk songs are super catchy!"'}
											</div>
										</div>
										<Share className="h-4 w-4 text-pink-300" />
									</div>
								</div>
							</Card>

							<div className="text-center">
								<Link
									to="/friends/invite"
									className={cn(
										buttonVariants({ size: 'lg' }),
										'bg-rose-700 font-semibold text-white/90 transition-all duration-300 hover:bg-rose-800'
									)}
								>
									Invite Your {isForFriends ? 'Friends' : 'Family'}
								</Link>
							</div>
						</div>

						{/* Right side - Benefits */}
						<div className="space-y-8">
							<Card className="moving-glass-card">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-rose-400/20">
										<Heart className="h-6 w-6 text-rose-300" />
									</div>
									<div>
										<h3 className="mb-2 text-xl font-semibold text-white">
											Emotional Support
										</h3>
										<p className="text-rose-100">
											Learning with{' '}
											{isForFriends ? ' your besties ' : ' loved ones '}
											provides motivation, encouragement, and accountability
											that keeps you going when it gets tough.
										</p>
									</div>
								</div>
							</Card>

							<Card className="moving-glass-card">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-400/20">
										<Users className="h-6 w-6 text-orange-300" />
									</div>
									<div>
										<h3 className="mb-2 text-xl font-semibold text-white">
											Shared Progress
										</h3>
										<p className="text-rose-100">
											When one of us learns more, it's a gateway for all of us
											to learn more. Discover fun and useful phrases and share
											them with your {isForFriends ? 'pals' : 'family'}.
										</p>
									</div>
								</div>
							</Card>

							<Card className="moving-glass-card">
								<div className="flex items-start gap-4">
									<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-pink-400/20">
										<Gift className="h-6 w-6 text-pink-300" />
									</div>
									<div>
										<h3 className="mb-2 text-xl font-semibold text-white">
											Personalized Gifts
										</h3>
										<p className="text-rose-100">
											{isForFriends ?
												'Friends and colleagues '
											:	'Family members '}
											can send you custom phrase packs, cultural tips, and
											learning resources tailored to your interests.
										</p>
									</div>
								</div>
							</Card>
						</div>
					</div>

					{/* Free & Open Source section */}
					<div className="mb-12 text-center">
						<Card className="mx-auto max-w-4xl border-white/10 bg-white/5 p-8">
							<div className="mb-6 flex justify-center">
								<div className="flex items-center gap-4">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-blue-400">
										<Sparkles className="h-6 w-6 text-white" />
									</div>
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tl from-stone-800 to-slate-800">
										<Github className="h-6 w-6 text-white" />
									</div>
								</div>
							</div>

							<h3 className="mb-4 text-3xl font-bold text-white">
								Free Forever & Open Source
							</h3>
							<p className="mx-auto mb-6 max-w-2xl text-xl text-rose-100">
								Sunlo is free for individual learners and always will be. Our
								open-source approach means the community can contribute,
								improve, and ensure the platform serves learners worldwide.
							</p>

							<div className="flex flex-col justify-center gap-4 sm:flex-row">
								<Link
									to="/signup"
									className={cn(
										buttonVariants(),
										'border-2 border-transparent bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6 text-lg font-semibold text-white transition-all duration-300 hover:from-green-700'
									)}
								>
									Start Learning
								</Link>

								<a
									href="https://github.com/mhsnook/sunlo"
									target="_blank"
									rel="noopener noreferrer"
									className={cn(
										buttonVariants({ variant: 'outline' }),
										'border-2 border-white/30 bg-transparent px-8 py-6 text-lg font-semibold text-white hover:bg-white/10'
									)}
								>
									<Github />
									View on GitHub
								</a>
							</div>
						</Card>
					</div>

					{/* Final stats */}
					<div className="grid gap-8 text-center md:grid-cols-3">
						<div>
							<div className="mb-2 h-10 text-4xl font-bold text-white">
								100%
							</div>
							<div className="text-rose-200">Free Forever</div>
						</div>
						<div>
							<div className="mb-2 h-10 text-4xl font-bold text-white">
								Open
							</div>
							<div className="text-rose-200">Source Community</div>
						</div>
						<div>
							<div className="mb-2 text-4xl font-bold text-white">
								<InfinityIcon className="mx-auto size-10" />
							</div>
							<div className="text-rose-200">Learning Together</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
