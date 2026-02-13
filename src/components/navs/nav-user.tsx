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
import { useProfile } from '@/hooks/use-profile'
import { Link, useNavigate } from '@tanstack/react-router'
import { makeLinks } from '@/hooks/links'
import { avatarUrlify } from '@/lib/hooks'
import { useMutation } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { removeSbTokens } from '@/lib/utils'
import { clearUser } from '@/lib/collections'

const data = makeLinks([
	'/profile',
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
			// If signOut fails (e.g., 403), manually clear tokens and user data
			// This can happen when the session is already invalid server-side
			if (error) {
				console.log(`auth.signOut error:`, error, `- clearing session manually`)
				removeSbTokens()
				await clearUser()
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
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							data-testid="sidebar-user-menu-trigger"
							className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground rounded-xl shadow"
						>
							<Avatar>
								<AvatarImage src={avatarUrl} alt={profile?.username} />
								<AvatarFallback className="rounded-lg">Me</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">
									{profile?.username}
								</span>
								<span className="truncate text-xs">{userEmail}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--anchor-width) min-w-56"
						side={isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuGroup>
							{data?.map((item) => (
								<DropdownMenuItem key={item.link.to} asChild>
									<Link
										to={item.link.to}
										data-key={item.link.to}
										onClick={setClosedMobile}
									>
										{item.Icon ?
											<item.Icon />
										:	null}
										{item.title ?? item.name}
									</Link>
								</DropdownMenuItem>
							))}
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
