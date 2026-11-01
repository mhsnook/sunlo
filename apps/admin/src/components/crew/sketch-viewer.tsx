import { useQueries, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { sketchImageQuery } from '~/lib/crew'

export type ViewerScreen = {
	id: number
	title: string
	// What the person does on this screen to reach the next one.
	note?: string
}

// Sketches full size, one at a time, in order: the arrow keys and the
// buttons page through them. `index` is null while it is closed.
export function SketchViewer({
	screens,
	index,
	onIndex,
	noun,
}: {
	screens: Array<ViewerScreen>
	index: number | null
	onIndex: (index: number | null) => void
	// What each screen is, such as "Step", for its counter.
	noun?: string
}) {
	const screen = index === null ? undefined : screens[index]
	const open = screen !== undefined && index !== null
	const go = (by: number) => {
		if (index === null) return
		const next = index + by
		if (next >= 0 && next < screens.length) onIndex(next)
	}
	const onKeyDown = (event: KeyboardEvent) => {
		const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
		const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
		const back = rtl ? 'ArrowRight' : 'ArrowLeft'
		if (event.key === forward) go(1)
		else if (event.key === back) go(-1)
		else return
		event.preventDefault()
	}
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onIndex(null)
			}}
		>
			<DialogContent
				className="flex max-h-11/12 max-w-11/12 flex-col gap-2 p-3"
				onKeyDown={onKeyDown}
				data-testid="sketch-viewer"
				data-key={screen?.id}
			>
				{open && (
					<>
						<DialogTitle className="pe-8 text-sm">
							<span className="text-muted-foreground me-2 font-normal">
								{noun ? `${noun} ` : ''}
								{index + 1} of {screens.length}
							</span>
							{screen.title}
						</DialogTitle>
						<ViewerImage
							screen={screen}
							around={[screens[index - 1], screens[index + 1]]}
						/>
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="ghost"
								disabled={index === 0}
								onClick={() => go(-1)}
								aria-label="Previous screen"
								data-testid="sketch-viewer-previous"
							>
								<ChevronLeft className="rtl:rotate-180" />
							</Button>
							<p className="text-muted-foreground min-w-0 flex-1 text-center text-sm">
								{screen.note}
							</p>
							<Button
								size="sm"
								variant="ghost"
								disabled={index === screens.length - 1}
								onClick={() => go(1)}
								aria-label="Next screen"
								data-testid="sketch-viewer-next"
							>
								<ChevronRight className="rtl:rotate-180" />
							</Button>
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}

// The screens on either side load too, so paging shows them at once.
function ViewerImage({
	screen,
	around,
}: {
	screen: ViewerScreen
	around: Array<ViewerScreen | undefined>
}) {
	const { data: image, isError } = useQuery(sketchImageQuery(screen.id))
	useQueries({
		queries: around
			.filter((neighbour) => neighbour !== undefined)
			.map((neighbour) => sketchImageQuery(neighbour.id)),
	})
	return image ? (
		<img
			src={image.url}
			alt={screen.title}
			className="min-h-0 self-center object-contain"
			data-testid="sketch-viewer-image"
		/>
	) : (
		<div className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-2 text-sm">
			<ImageIcon className={cn('size-6', !isError && 'animate-pulse')} />
			{isError && 'This sketch did not load.'}
		</div>
	)
}
