import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from '@/components/ui/chart'

type ActivityChartProps = {
	data: {
		day: string
		total: number
		positive: number
	}[]
}

const chartConfig = {
	total: {
		label: 'Total Reviews',
		color: 'var(--chart-1)',
	},
	positive: {
		label: 'Positive',
		color: 'var(--chart-2)',
	},
} satisfies ChartConfig

export function ActivityChart({ data }: ActivityChartProps) {
	return (
		<ChartContainer config={chartConfig} className="h-[200px] w-full">
			<AreaChart accessibilityLayer data={data}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="day"
					tickLine={false}
					tickMargin={10}
					axisLine={false}
					stroke="hsl(var(--muted-foreground))"
				/>
				<YAxis
					allowDecimals={false}
					stroke="hsl(var(--muted-foreground))"
					tickLine={false}
					axisLine={false}
					width={24}
				/>
				<ChartTooltip
					cursor={false}
					// oxlint-disable-next-line jsx-no-jsx-as-prop
					content={<ChartTooltipContent indicator="dot" />}
				/>
				<ChartLegend
					// oxlint-disable-next-line jsx-no-jsx-as-prop
					content={<ChartLegendContent />}
				/>
				<Area
					dataKey="total"
					type="step"
					fill="var(--color-total)"
					fillOpacity={0.4}
					stroke="var(--color-total)"
				/>
				<Area
					dataKey="positive"
					type="step"
					fill="var(--color-positive)"
					stroke="var(--color-positive)"
				/>
			</AreaChart>
		</ChartContainer>
	)
}
