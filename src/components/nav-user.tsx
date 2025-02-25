import { ChevronsUpDown, Lock, LogOut, Mail, UserPen } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar'
import { useAuth, useSignOut } from '@/lib/hooks'
import { useProfile } from '@/lib/use-profile'
import { Link } from '@tanstack/react-router'

const data = [
	{
		name: 'Update profile',
		link: {
			to: '/profile',
		},
		Icon: UserPen,
	},
	{
		name: 'Update email',
		link: {
			to: '/profile/change-email',
		},
		Icon: Mail,
	},
	{
		name: `Update password`,
		link: {
			to: '/profile/change-password',
		},
		Icon: Lock,
	},
]

export function NavUser() {
	const { isMobile } = useSidebar()
	const { isAuth, userEmail } = useAuth()
	const { data: profile, isPending } = useProfile()
	const signOut = useSignOut()
	if (isPending || !profile) return null
	const { avatar_url, username } = profile
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage src={avatar_url} alt={username} />
								<AvatarFallback className="rounded-lg">Me</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">{username}</span>
								<span className="truncate text-xs">{userEmail}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage src={avatar_url} alt={username} />
									<AvatarFallback className="rounded-lg">CN</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">{username}</span>
									<span className="truncate text-xs">{userEmail}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							{data.map((item) => (
								<DropdownMenuItem key={item.link.to} asChild>
									<Link to={item.link.to}>
										<item.Icon />
										{item.name}
									</Link>
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={(event) => {
								event.preventDefault()
								signOut.mutate()
							}}
							disabled={signOut.isPending || !isAuth}
						>
							<LogOut />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
