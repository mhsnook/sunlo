import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { UserCog } from 'lucide-react'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/use-auth'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from '@/components/ui/popover'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import { isDevEnvironment } from '@/lib/dev-mode'
import { cn } from '@/lib/utils'

type Actor = { role: string; email: string; username?: string }
type Team = { name: string; tag: string; actors: Array<Actor> }

const TEAMS: Array<Team> = [
	{
		name: 'Sunlo Default',
		tag: 'team-1',
		actors: [
			{ role: 'learner', email: 'sunloapp@gmail.com', username: 'GarlicFace' },
			{
				role: 'friend',
				email: 'sunloapp+friend@gmail.com',
				username: 'Lexigrine',
			},
			{
				role: 'learner2',
				email: 'sunloapp+1@gmail.com',
				username: 'Best Frin',
			},
			{
				role: 'learner3',
				email: 'sunloapp+2@gmail.com',
				username: 'Work Andy',
			},
			{ role: 'new-user', email: 'sunloapp+new@gmail.com' },
		],
	},
	{
		name: 'Team 2 (fra/spa/eus)',
		tag: 'team-2',
		actors: [
			{
				role: 'learner',
				email: 'sunloapp+t2@gmail.com',
				username: 'GarlicTongue',
			},
			{
				role: 'friend',
				email: 'sunloapp+t2-friend@gmail.com',
				username: 'Lexigrande',
			},
			{
				role: 'learner2',
				email: 'sunloapp+t2-1@gmail.com',
				username: 'Mejor Amigo',
			},
			{
				role: 'learner3',
				email: 'sunloapp+t2-2@gmail.com',
				username: 'Office Pierre',
			},
			{ role: 'new-user', email: 'sunloapp+t2-new@gmail.com' },
		],
	},
]

export function DevIdentitySwitcher() {
	// Gate on a real local-dev session, not just the build-time DEV flag: a
	// production deploy built/served in the wrong Vite mode would otherwise
	// expose this one-click login switcher and its hardcoded test password.
	if (!isDevEnvironment()) return null
	// Hide under Playwright/scenetest so the corner button can't intercept
	// clicks or overlap toasts. navigator.webdriver is set by Playwright by
	// default; manual dev sessions get the widget as expected.
	if (typeof navigator !== 'undefined' && navigator.webdriver) return null
	return <Switcher />
}

function Switcher() {
	const { userEmail } = useAuth()
	const [open, setOpen] = useState(false)
	const [busy, setBusy] = useState(false)
	const navigate = useNavigate()

	const switchTo = async (email: string) => {
		setBusy(true)
		try {
			if (userEmail) await supabase.auth.signOut()
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password: 'password',
			})
			if (error) throw error
			toastSuccess(`Switched to ${email}`)
			setOpen(false)
			void navigate({ to: '/learn' })
		} catch (e) {
			toastError(`Switch failed: ${(e as Error).message}`)
		} finally {
			setBusy(false)
		}
	}

	const signOut = async () => {
		setBusy(true)
		try {
			await supabase.auth.signOut()
			toastSuccess('Signed out')
			setOpen(false)
			void navigate({ to: '/' })
		} finally {
			setBusy(false)
		}
	}

	const currentLabel = userEmail
		? (userEmail.match(/sunloapp(\+[^@]+)?@/)?.[1] ?? userEmail).replace(
				/^\+/,
				''
			) || 'learner'
		: '(no auth)'

	return (
		<div className="fixed start-3 bottom-3 z-50">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="soft"
						size="sm"
						className="font-mono text-xs opacity-70 hover:opacity-100"
						data-testid="dev-identity-switcher"
					>
						<UserCog className="size-3.5" />
						<span>{currentLabel}</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align="start"
					side="top"
					className="w-72 p-2"
					data-testid="dev-identity-switcher-content"
				>
					<div className="text-muted-foreground mb-2 px-2 text-xs">
						Dev only · password = <code>password</code>
					</div>
					{TEAMS.map((team) => (
						<div key={team.tag} className="mb-2 last:mb-0">
							<div className="text-muted-foreground px-2 pt-1 pb-0.5 text-xs font-semibold">
								{team.name}
							</div>
							{team.actors.map((a) => {
								const active = a.email === userEmail
								return (
									<button
										key={a.email}
										type="button"
										disabled={busy || active}
										onClick={() => void switchTo(a.email)}
										className={cn(
											'hover:bg-lc-1 hover:bg-chroma-mlo hover:bg-hue-primary flex w-full items-baseline justify-between gap-2 rounded border-s-2 border-transparent px-2 py-1 text-start text-sm disabled:opacity-100',
											active &&
												'bg-lc-2 bg-chroma-mlo bg-hue-primary border-s-primary-foresoft font-medium'
										)}
									>
										<span className="truncate">
											<span className="font-mono text-xs">{a.role}</span>
											{a.username ? (
												<span className="text-muted-foreground">
													{' '}
													· {a.username}
												</span>
											) : null}
										</span>
										<span className="text-muted-foreground truncate text-xs">
											{a.email
												.replace('sunloapp', '')
												.replace('@gmail.com', '')}
										</span>
									</button>
								)
							})}
						</div>
					))}
					<div className="mt-2 border-t pt-2">
						<Button
							variant="ghost"
							size="sm"
							className="w-full"
							disabled={busy || !userEmail}
							onClick={() => void signOut()}
						>
							Sign out
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	)
}
