import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Network, Circle } from 'lucide-react'

export type GraphView = 'bubbles' | 'force'

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
						'very fine-grained'
					: threshold < 0.55 ?
						'moderate grouping'
					:	'broad categories'}
				</p>
			</div>
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
				</TabsList>
			</Tabs>
		</div>
	)
}
