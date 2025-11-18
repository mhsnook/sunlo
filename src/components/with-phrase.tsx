import { usePhrase } from '@/hooks/composite-phrase'
import { uuid } from '@/types/main'
import { PhraseFullFilteredType } from '@/lib/schemas'
import { ComponentType } from 'react'
import Callout from './ui/callout'
import { CircleQuestionMark } from 'lucide-react'

export function WithPhrase({
	pid,
	Component,
}: {
	pid: uuid
	Component: ComponentType<{ phrase: PhraseFullFilteredType }>
}) {
	const { data: phrase, status } = usePhrase(pid)
	return (
		status === 'pending' ? null
		: status === 'not-found' ?
			<Callout variant="ghost" Icon={CircleQuestionMark}>
				Phrase not found.
			</Callout>
		:	<Component phrase={phrase} />
	)
}
