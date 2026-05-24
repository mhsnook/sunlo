import { LogIn, Settings, UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/lib/use-auth'
import { useProfile } from '@/features/profile/hooks'
import { Link } from '@tanstack/react-router'
import { avatarUrlify } from '@/lib/hooks'

export function NavUser() {
	const { setClosedMobile } = useSidebar()
	const { isAuth } = useAuth()
	const { data: profile } = useProfile()

	if (!isAuth) {
		return (
			<SidebarGroup>
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
					<SidebarMenuItem>
						<SidebarMenuButton asChild>
							<Link
								to="/profile"
								data-testid="sidebar-display-settings-link"
								onClick={setClosedMobile}
							>
								<Settings className="size-4" />
								<span>Display settings</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroup>
		)
	}

	const avatarUrl = avatarUrlify(profile?.avatar_path)

	return (
		<SidebarGroup>
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton
						asChild
						data-testid="sidebar-profile-settings-link"
					>
						<Link to="/profile" onClick={setClosedMobile}>
							<Avatar className="size-6">
								<AvatarImage src={avatarUrl} alt={profile?.username} />
								<AvatarFallback
									seed={profile?.uid}
									className="rounded text-[10px]"
								>
									Me
								</AvatarFallback>
							</Avatar>
							<span>Profile &amp; settings</span>
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</SidebarGroup>
	)
}
