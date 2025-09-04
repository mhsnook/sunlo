import { usePhrase } from '@/hooks/composite-phrase'
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../ui/card'
import { Badge } from '../ui/badge'
import { CheckCircle } from 'lucide-react'
import { uuid } from '@/types/main'

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
	lang,
}: TapCardToSelectProps) {
	const { data: phrase } = usePhrase(pid, lang)
	if (!phrase) return null
	return (
		<Card
			onClick={() => toggleCardSelection(pid)}
			key={pid}
			className={`hover:bg-primary/20 cursor-pointer border-1 transition-all ${isSelected ? 'border-primary bg-primary/10' : ''}`}
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
		</Card>
	)
}
