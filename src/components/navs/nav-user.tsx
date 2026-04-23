import { ChevronsUpDown, LogIn, LogOut, UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/lib/use-auth'
import { useProfile } from '@/features/profile/hooks'
import { Link, useNavigate } from '@tanstack/react-router'
import { makeLinks } from '@/hooks/links'
import { avatarUrlify } from '@/lib/hooks'
import { useMutation } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { removeSbTokens } from '@/lib/utils'

const data = makeLinks([
	'/profile',
	'/learn/contributions',
	'/profile/change-email',
	'/profile/change-password',
])

export function NavUser() {
	const { isMobile, setClosedMobile } = useSidebar()
	const { isAuth, userEmail } = useAuth()
	const { data: profile } = useProfile()
	const navigate = useNavigate()
	const signOut = useMutation({
		mutationFn: async () => {
			const { error } = await supabase.auth.signOut({ scope: 'local' })
			// If signOut fails (e.g., 403 when session is already invalid
			// server-side), supabase won't fire SIGNED_OUT, leaving the auth
			// context stale. Clear tokens and hard-reload to reset everything.
			if (error) {
				console.log(`auth.signOut error:`, error, `- clearing session manually`)
				removeSbTokens()
				window.location.href = '/'
				return
			}
			// Don't throw - we want to navigate home regardless
		},
		onSettled: () => {
			void navigate({ to: '/' })
		},
	})

	// Show login/signup buttons when not authenticated
	if (!isAuth) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton asChild>
						<Link
							to="/login"
							data-testid="login-link"
							onClick={setClosedMobile}
						>
							<LogIn className="size-4" />
							<span>Log in</span>
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
				<SidebarMenuItem>
					<SidebarMenuButton asChild>
						<Link to="/signup" onClick={setClosedMobile}>
							<UserPlus className="size-4" />
							<span>Sign up</span>
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		)
	}

	const avatarUrl = avatarUrlify(profile?.avatar_path)

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton
								size="lg"
								data-testid="sidebar-user-menu-trigger"
								className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground rounded-xl shadow"
							/>
						}
					>
						<Avatar>
							<AvatarImage src={avatarUrl} alt={profile?.username} />
							<AvatarFallback className="rounded-lg">Me</AvatarFallback>
						</Avatar>
						<div className="grid flex-1 text-start text-sm leading-tight">
							<span className="truncate font-semibold">
								{profile?.username}
							</span>
							<span className="truncate text-xs">{userEmail}</span>
						</div>
						<ChevronsUpDown className="ms-auto size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--anchor-width) min-w-56"
						side={isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuGroup>
							{data?.map((item) => {
								const slug = item.link.to.split('/').pop() ?? 'item'
								return (
									<DropdownMenuItem
										key={item.link.to}
										render={
											<Link
												to={item.link.to}
												data-testid={`user-menu-${slug}`}
												onClick={setClosedMobile}
											/>
										}
									>
										{item.Icon ? <item.Icon /> : null}
										{item.title ?? item.name}
									</DropdownMenuItem>
								)
							})}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => signOut.mutate()}
							data-testid="sidebar-signout-button"
							disabled={!isAuth || signOut.isPending}
						>
							<LogOut />
							{signOut.isPending ? 'Signing out...' : 'Sign out'}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
