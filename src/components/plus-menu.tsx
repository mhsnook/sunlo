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
			<DropdownMenuContent className="flex flex-col gap-2 rounded bg-black/20 p-3">
				{children}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
