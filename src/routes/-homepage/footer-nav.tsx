import { Github, Heart, Shield, Users, LogIn, UserPlus } from 'lucide-react'
import BlueskyLogo from '@/components/svg/bluesky-logo'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'

export function FooterNavigation() {
	return (
		<footer className="relative overflow-hidden border-t border-white/10 bg-slate-900/95 backdrop-blur-sm dark:bg-slate-950/95">
			{/* Subtle background pattern */}
			<div className="absolute inset-0 opacity-5">
				<div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:20px_20px]"></div>
			</div>

			{/* Floating accent elements */}
			<div className="absolute top-4 left-8 h-16 w-16 rounded-full bg-blue-400/10 blur-xl"></div>
			<div className="absolute right-8 bottom-4 h-20 w-20 rounded-full bg-purple-400/10 blur-xl"></div>

			<div className="relative z-10 container mx-auto px-4 py-12">
				<div className="mx-auto max-w-6xl">
					{/* Main footer content */}
					<div className="mb-8 grid gap-8 md:grid-cols-3">
						{/* Brand section */}
						<div className="space-y-4">
							<h3 className="font-space-grotesk text-2xl font-bold text-white">
								Sunlo
							</h3>
							<p className="leading-relaxed text-slate-300">
								Social language learning that brings people together. Free
								forever, with open software and a crowd-sourced library.
							</p>
							<div className="flex items-center gap-2 text-sm text-slate-400">
								<Heart className="h-4 w-4 fill-red-400 text-red-400" />
								<span>Made for learners of any language worldwide</span>
							</div>
						</div>

						{/* Quick links */}
						<div className="space-y-4">
							<h4 className="font-space-grotesk text-lg font-semibold text-white">
								Connect
							</h4>
							<div className="space-y-3">
								<a
									href="https://bsky.app/profile/sunlo.app"
									className="group flex items-center gap-3 text-slate-300 transition-colors hover:text-white"
								>
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 transition-colors group-hover:bg-blue-500">
										<BlueskyLogo className="size-4" />
									</div>
									<span>BlueSky</span>
								</a>
								<a
									href="https://github.com/mhsnook/sunlo"
									className="group flex items-center gap-3 text-slate-300 transition-colors hover:text-white"
								>
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 transition-colors group-hover:bg-slate-700">
										<Github className="h-4 w-4" />
									</div>
									<span>GitHub</span>
								</a>

								<Link
									to="/privacy-policy"
									className="group flex items-center gap-3 text-slate-300 transition-colors hover:text-white"
								>
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 transition-colors group-hover:bg-green-500">
										<Shield className="h-4 w-4" />
									</div>
									<span>Privacy Policy</span>
								</Link>
							</div>
						</div>

						{/* Action buttons */}
						<div className="space-y-4">
							<h4 className="font-space-grotesk text-lg font-semibold text-white">
								Get Started
							</h4>
							<div className="space-y-3">
								<Link
									className={cn(
										buttonVariants(),
										'font-space-grotesk from-primary hover:to-primary w-full transform bg-gradient-to-r to-indigo-500 font-semibold text-white shadow-lg transition-all duration-300 hover:from-purple-700 hover:shadow-xl'
									)}
									to="/signup"
								>
									<UserPlus className="mr-2 h-4 w-4 transition-transform" />
									Sign Up Free
								</Link>
								<Link
									className={cn(
										buttonVariants({ variant: 'outline' }),
										'font-space-grotesk w-full border-2 border-slate-600 bg-transparent font-semibold text-slate-300 transition-all duration-300 hover:bg-slate-800 hover:text-white'
									)}
									to="/login"
								>
									<LogIn className="mr-2 h-4 w-4" />
									Login
								</Link>
							</div>

							{/* Community stats */}
							<div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
								<div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
									<Users className="h-4 w-4 text-blue-400" />
									<span className="font-medium">Join our community</span>
								</div>
								<div className="font-space-grotesk text-2xl font-bold text-white">
									5+
								</div>
								<div className="text-sm text-slate-400">
									Active learners worldwide
								</div>
							</div>
						</div>
					</div>

					{/* Bottom bar */}
					<div className="border-t border-white/10 pt-8">
						<div className="flex flex-col items-center justify-between gap-4 md:flex-row">
							<div className="text-sm text-slate-400">
								© 2024 Sunlo. Social Language Learning, built by learners, for
								learners ❤️
							</div>

							{/* Open source badge */}
							<div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
								<div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
								<span className="text-sm font-medium text-slate-300">
									100% Open Source
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
}
