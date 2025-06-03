import { Construction, Mail, MessageCircle } from 'lucide-react'

export function UnderConstruction() {
	return (
		<section className="mx-auto w-full max-w-172 px-4 py-8">
			<div className="container mx-auto max-w-4xl">
				<div className="border-border/50 from-background to-primary/5 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-8 shadow-sm backdrop-blur-sm">
					{/* Subtle background pattern */}
					<div className="bg-grid-small absolute inset-0 opacity-5" />

					<div className="relative flex items-start gap-6">
						<div className="flex-shrink-0">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
								<Construction className="h-8 w-8 text-white" />
							</div>
						</div>

						<div className="flex-1 space-y-4">
							<div className="space-y-2">
								<h3 className="text-foreground text-xl font-semibold">
									We're putting the finishing touches on Sunlo
								</h3>
								<p className="text-muted-foreground leading-relaxed">
									Our platform is under active development and should be ready
									soon. Feel free to explore what's available, and don't
									hesitate to reach out if you encounter any issues or have
									feedback to share.
								</p>
							</div>

							{/* Contact options */}
							<div className="flex flex-wrap items-center gap-6 pt-2">
								<a
									href="https://bsky.app/profile/sunlo.app"
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
								>
									<MessageCircle className="h-4 w-4" />
									<span>Follow us on BlueSky</span>
								</a>

								<a
									href="mailto:sunloapp@gmail.com"
									className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
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
