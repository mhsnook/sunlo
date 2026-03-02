import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Network, Circle, Target } from 'lucide-react'

export type GraphView = 'bubbles' | 'force' | 'radial'

interface GraphControlsProps {
	view: GraphView
	onViewChange: (view: GraphView) => void
	threshold: number
	onThresholdChange: (value: number) => void
	clusterCount: number
	phraseCount: number
}

export default function GraphControls({
	view,
	onViewChange,
	threshold,
	onThresholdChange,
	clusterCount,
	phraseCount,
}: GraphControlsProps) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			{view !== 'radial' && (
				<div className="flex flex-1 flex-col gap-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="threshold-slider" className="text-sm">
							Similarity threshold
						</Label>
						<span className="text-muted-foreground font-mono text-xs">
							{threshold.toFixed(2)}
						</span>
					</div>
					<input
						id="threshold-slider"
						type="range"
						min="0.2"
						max="0.9"
						step="0.02"
						value={threshold}
						onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
						className="accent-primary h-2 w-full cursor-pointer"
					/>
					<p className="text-muted-foreground text-xs">
						{clusterCount} clusters from {phraseCount} phrases —{' '}
						{threshold < 0.4 ?
							'broad categories'
						: threshold < 0.55 ?
							'moderate grouping'
						:	'very fine-grained'}
					</p>
				</div>
			)}
			{view === 'radial' && (
				<p className="text-muted-foreground flex-1 text-xs">
					{phraseCount} phrases — difficulty increases outward, similar meanings
					are near each other
				</p>
			)}
			<Tabs
				value={view}
				onValueChange={(val) => onViewChange(val as GraphView)}
			>
				<TabsList>
					<TabsTrigger value="bubbles">
						<Circle className="mr-1.5 size-4" />
						Bubbles
					</TabsTrigger>
					<TabsTrigger value="force">
						<Network className="mr-1.5 size-4" />
						Network
					</TabsTrigger>
					<TabsTrigger value="radial">
						<Target className="mr-1.5 size-4" />
						Landscape
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	)
}
