import { ChevronsUpDown, LogOut } from 'lucide-react'
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
import { useAuth } from '@/lib/use-auth'
import { useProfile } from '@/hooks/use-profile'
import { Link, useNavigate } from '@tanstack/react-router'
import { makeLinks } from '@/hooks/links'
import { avatarUrlify } from '@/lib/hooks'
import { useMutation } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { clearUser } from '@/lib/collections'
import { removeSbTokens } from '@/lib/utils'

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
		mutationFn: async () =>
			(await supabase.auth.signOut({ scope: 'local' }))?.error,
		onError: (error) => {
			if (error) {
				console.log(`auth.signOut error`, error, `clearing session manually`)
				removeSbTokens()
				throw error
			}
		},
		onSettled: async () => {
			await clearUser()
			void navigate({ to: '/' })
		},
	})

	if (!profile) return null
	const { username, avatar_path } = profile
	const avatarUrl = avatarUrlify(avatar_path)

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-2xl shadow"
						>
							<Avatar className="size-8 rounded-lg">
								<AvatarImage src={avatarUrl} alt={username} />
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
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="size-8 rounded-lg">
									<AvatarImage src={avatarUrl} alt={username} />
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
							{data?.map((item) => (
								<DropdownMenuItem key={item.link.to} asChild>
									<Link to={item.link.to} onClick={setClosedMobile}>
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
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => signOut.mutate()}
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
