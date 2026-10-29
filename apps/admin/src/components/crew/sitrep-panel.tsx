import { Suspense } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Loader } from '@/components/ui/loader'
import { SITREP } from '../../../shared/crew'
import { documentsQuery } from '~/lib/crew'
import { DocumentView } from './document-view'
import { Empty } from './workspace-parts'
import { SidePanel } from './side-panel'

// Where Sunlo and each room stand now: the Command room's Situation Report,
// which every agent reads at the top of every run. The Command room's
// principal and the admin write it.
export function SitrepPanel({ onClose }: { onClose: () => void }) {
	const { data: documents } = useSuspenseQuery(documentsQuery('command'))
	const sitrep = documents.find((doc) => doc.name === SITREP)
	return (
		<SidePanel title={SITREP} testId="sitrep" onClose={onClose}>
			{sitrep ? (
				<Suspense fallback={<Loader className="mx-auto mt-10 opacity-50" />}>
					<DocumentView id={sitrep.id} showName={false} />
				</Suspense>
			) : (
				<Empty>The Command room has no Situation Report.</Empty>
			)}
		</SidePanel>
	)
}
