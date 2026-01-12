import { usePhrase } from '@/hooks/composite-phrase'
import {
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'
import { uuid } from '@/types/main'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import { CSSProperties } from 'react'

type TapCardToSelectProps = {
	toggleCardSelection: (pid: string) => void
	isSelected: boolean
	pid: uuid
	lang: string
}

export function TapCardToSelect({
	toggleCardSelection,
	isSelected,
	pid,
}: TapCardToSelectProps) {
	const { data: phrase } = usePhrase(pid)
	if (!phrase) return null
	return (
		<CardlikeFlashcard
			onClick={() => toggleCardSelection(pid)}
			key={pid}
			className={`hover:bg-primary/10 cursor-pointer transition-all ${isSelected ? 'border-primary bg-primary/5' : ''}`}
			style={{ viewTransitionName: `phrase-${pid}` } as CSSProperties}
		>
			<CardHeader className="p-3 pb-0">
				<CardTitle className="text-base">{phrase.text}</CardTitle>
				<CardDescription>{phrase.translations[0].text}</CardDescription>
			</CardHeader>
			<CardFooter className="flex justify-end p-3 pt-0">
				<Badge
					variant={isSelected ? 'default' : 'outline'}
					className="grid grid-cols-1 grid-rows-1 place-items-center font-normal [grid-template-areas:'stack']"
				>
					<span
						className={`flex flex-row items-center gap-1 [grid-area:stack] ${isSelected ? '' : 'invisible'}`}
					>
						<CheckCircle className="me-1 h-3 w-3" />
						Selected
					</span>
					<span
						className={`[grid-area:stack] ${isSelected ? 'invisible' : ''}`}
					>
						Tap to select
					</span>
				</Badge>
			</CardFooter>
		</CardlikeFlashcard>
	)
}
