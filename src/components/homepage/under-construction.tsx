import { Construction, Mail, MessageCircle } from 'lucide-react'

export function UnderConstructionNotice() {
	return (
		<section className="mx-auto w-full max-w-172 px-4 py-8">
			<div className="container mx-auto max-w-4xl">
				<div className="border-border/50 from-background/20 relative overflow-hidden rounded-2xl border bg-gradient-to-br to-indigo-200/20 p-6 shadow-sm sm:p-8 dark:to-indigo-900/20">
					{/* Subtle background pattern */}
					<div className="bg-grid-small absolute inset-0 opacity-5" />

					<div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-start">
						{/* Icon - centered on mobile, left-aligned on larger screens */}
						<div className="flex-shrink-0">
							<div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg sm:h-16 sm:w-16">
								<Construction className="h-7 w-7 text-white sm:h-8 sm:w-8" />
							</div>
						</div>

						{/* Content - centered on mobile, left-aligned on larger screens */}
						<div className="flex-1 space-y-4 text-center sm:text-left">
							<div className="space-y-2">
								<h3 className="text-xl font-semibold text-white">
									We're putting the finishing touches on Sunlo
								</h3>
								<p className="leading-relaxed text-white/70">
									Our platform is under active development and should be ready
									soon. Feel free to explore what's available, and don't
									hesitate to reach out if you encounter any issues or have
									feedback to share.
								</p>
							</div>

							{/* Contact options */}
							<div className="flex flex-col items-center gap-4 pt-2 sm:flex-row sm:items-start sm:gap-6">
								<a
									href="https://bsky.app/profile/sunlo.app"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-foreground inline-flex items-center gap-2 text-sm text-white/70 transition-colors"
								>
									<MessageCircle className="h-4 w-4" />
									<span>Follow us on BlueSky</span>
								</a>

								<a
									href="mailto:sunloapp@gmail.com"
									className="hover:text-foreground inline-flex items-center gap-2 text-sm text-white/70 transition-colors"
								>
									<Mail className="h-4 w-4" />
									<span>sunloapp@gmail.com</span>
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
