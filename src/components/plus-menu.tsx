import type { ReactNode } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from './ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from './ui/dropdown-menu'

export function PlusMenu({ children }: { children: ReactNode }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="ghost" size="icon">
					<PlusIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="z-30 flex flex-col gap-2 rounded bg-black/10 p-3 backdrop-blur-sm">
				{children}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
