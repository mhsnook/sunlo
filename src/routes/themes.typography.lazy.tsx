import { createLazyFileRoute } from '@tanstack/react-router'
import { useEffect, useState, type CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'
import { ThumbsUp, MessageSquare, Mail, Copy, Share2, Send } from 'lucide-react'

export const Route = createLazyFileRoute('/themes/typography')({
	component: TypographyLab,
})

const GOOGLE_FONT_HREF =
	'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,200..800;1,200..800&display=swap'

function useAtkinsonNext() {
	useEffect(() => {
		const existing = document.querySelector<HTMLLinkElement>(
			`link[href="${GOOGLE_FONT_HREF}"]`
		)
		if (existing) return
		const preconnect1 = document.createElement('link')
		preconnect1.rel = 'preconnect'
		preconnect1.href = 'https://fonts.googleapis.com'
		const preconnect2 = document.createElement('link')
		preconnect2.rel = 'preconnect'
		preconnect2.href = 'https://fonts.gstatic.com'
		preconnect2.crossOrigin = 'anonymous'
		const link = document.createElement('link')
		link.rel = 'stylesheet'
		link.href = GOOGLE_FONT_HREF
		document.head.append(preconnect1, preconnect2, link)
	}, [])
}

type SampleProps = {
	label: string
	fontFamily: string
	weight: number
	boldWeight: number
	style?: CSSProperties
}

function SampleBlock({
	label,
	fontFamily,
	weight,
	boldWeight,
	style,
}: SampleProps) {
	const baseStyle: CSSProperties = {
		fontFamily,
		fontWeight: weight,
		...style,
	}
	const boldStyle: CSSProperties = { fontWeight: boldWeight }

	return (
		<Card className="overflow-hidden">
			<div className="bg-1-mlo-primary border-b px-4 py-2">
				<div className="flex items-center justify-between">
					<p className="text-sm font-medium">{label}</p>
					<p className="text-muted-foreground text-xs">
						{fontFamily.split(',')[0]} · {weight} / {boldWeight}
					</p>
				</div>
			</div>
			<CardContent className="space-y-5 p-5" style={baseStyle}>
				{/* Request-card replica */}
				<div className="bg-1-mlo-primary rounded-2xl border p-4">
					<div className="flex items-start gap-3">
						<div className="bg-3-mid-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm">
							Y
						</div>
						<div className="flex-1">
							<p style={boldStyle}>Yemm</p>
							<p className="text-muted-foreground text-sm">
								posted a Request 5 mo ago
							</p>
						</div>
						<Badge variant="outline">HIN</Badge>
					</div>
					<p className="mt-3">
						hey, i&apos;m introducing my friend to coworkers, how do i say:
					</p>
					<blockquote className="bg-2-mid-primary mt-3 rounded-md border-s-4 px-4 py-3 italic">
						<span style={boldStyle}>This is maria</span> hello
					</blockquote>
					<p className="mt-3">i want to be informal but polite.</p>
					<Separator className="my-3" />
					<div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
						<span className="flex items-center gap-1">
							<ThumbsUp className="size-4" /> 2
						</span>
						<span className="flex items-center gap-1">
							<MessageSquare className="size-4" /> 1 comment
						</span>
						<span className="flex items-center gap-1">
							<Mail className="size-4" /> 1 answer
						</span>
						<span className="ms-auto flex items-center gap-1">
							<Copy className="size-4" />
							<Share2 className="size-4" />
							<Send className="size-4" />
						</span>
					</div>
				</div>

				{/* Typographic scale */}
				<div className="space-y-2">
					<h1 className="text-3xl" style={boldStyle}>
						Spaced repetition that respects your time
					</h1>
					<h2 className="text-xl" style={boldStyle}>
						A pangram for sampling
					</h2>
					<p>
						The quick brown fox jumps over the lazy dog. Sphinx of black quartz,
						judge my vow. Pack my box with five dozen liquor jugs.
					</p>
					<p>
						<em>Italic:</em> <em>Wherever you go, there you are.</em>{' '}
						<span style={boldStyle}>Bold:</span>{' '}
						<span style={boldStyle}>read this clearly.</span>{' '}
						<em style={boldStyle}>Bold italic:</em>{' '}
						<em style={boldStyle}>emphasized and strong.</em>
					</p>
					<p className="text-muted-foreground text-sm">
						Small muted line: 1234567890 · O0 Il1 · &quot;curly quotes&quot; vs
						&apos;single&apos; vs `backtick`
					</p>
				</div>

				{/* Numerics & ID-ish strings */}
				<div className="grid grid-cols-3 gap-2 text-sm">
					<div className="rounded border p-2">
						<p className="text-muted-foreground text-xs">Streak</p>
						<p className="text-2xl" style={boldStyle}>
							7
						</p>
					</div>
					<div className="rounded border p-2">
						<p className="text-muted-foreground text-xs">Accuracy</p>
						<p className="text-2xl" style={boldStyle}>
							87%
						</p>
					</div>
					<div className="rounded border p-2">
						<p className="text-muted-foreground text-xs">Cards</p>
						<p className="text-2xl" style={boldStyle}>
							142
						</p>
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button size="sm">Primary</Button>
					<Button size="sm" variant="soft">
						Soft
					</Button>
					<Button size="sm" variant="neutral">
						Neutral
					</Button>
					<Button size="sm" variant="ghost">
						Ghost
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}

function Slider({
	label,
	min,
	max,
	step = 1,
	value,
	onChange,
}: {
	label: string
	min: number
	max: number
	step?: number
	value: number
	onChange: (v: number) => void
}) {
	return (
		<div className="flex items-center gap-3">
			<label className="w-32 shrink-0 text-sm font-medium">{label}</label>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="bg-muted h-2 flex-1 cursor-pointer appearance-none rounded-full"
			/>
			<input
				type="number"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="bg-input text-foreground w-20 rounded border px-2 py-1 text-sm"
			/>
		</div>
	)
}

const CURRENT_FAMILY =
	"'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const NEXT_FAMILY =
	"'Atkinson Hyperlegible Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

function TypographyLab() {
	useAtkinsonNext()

	const [nextWeight, setNextWeight] = useState(350)
	const [nextBold, setNextBold] = useState(600)
	const [tracking, setTracking] = useState(0)

	const presets: Array<{ label: string; weight: number; bold: number }> = [
		{ label: 'Next 300 / 600', weight: 300, bold: 600 },
		{ label: 'Next 325 / 600', weight: 325, bold: 600 },
		{ label: 'Next 350 / 650', weight: 350, bold: 650 },
		{ label: 'Next 375 / 700', weight: 375, bold: 700 },
		{ label: 'Next 400 / 700', weight: 400, bold: 700 },
	]

	const trackingStyle: CSSProperties = {
		letterSpacing: `${tracking}em`,
	}

	return (
		<div className="mx-auto max-w-6xl space-y-6 p-4">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-3xl font-bold">Typography Lab</h1>
					<p className="text-muted-foreground text-sm">
						Compare Atkinson Hyperlegible (current) with Atkinson Hyperlegible
						Next (variable). Tweak weight live.
					</p>
				</div>
				<ThemeToggle />
			</div>

			<div className="bg-card space-y-4 rounded-xl border p-4 shadow">
				<div className="space-y-3">
					<Slider
						label="Next body weight"
						min={200}
						max={800}
						value={nextWeight}
						onChange={setNextWeight}
					/>
					<Slider
						label="Next bold weight"
						min={400}
						max={800}
						value={nextBold}
						onChange={setNextBold}
					/>
					<Slider
						label="Letter-spacing (em)"
						min={-0.04}
						max={0.08}
						step={0.005}
						value={tracking}
						onChange={setTracking}
					/>
				</div>
				<div className="space-y-2">
					<Label>Presets</Label>
					<div className="flex flex-wrap gap-2">
						{presets.map((p) => (
							<Button
								key={p.label}
								size="sm"
								variant={
									p.weight === nextWeight && p.bold === nextBold
										? 'soft'
										: 'neutral'
								}
								onClick={() => {
									setNextWeight(p.weight)
									setNextBold(p.bold)
								}}
							>
								{p.label}
							</Button>
						))}
					</div>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-2" style={trackingStyle}>
				<SampleBlock
					label="Current — Atkinson Hyperlegible (static 400/700)"
					fontFamily={CURRENT_FAMILY}
					weight={400}
					boldWeight={700}
				/>
				<SampleBlock
					label="New — Atkinson Hyperlegible Next (variable)"
					fontFamily={NEXT_FAMILY}
					weight={nextWeight}
					boldWeight={nextBold}
				/>
			</div>

			<div className="bg-card space-y-3 rounded-xl border p-4 shadow">
				<h2 className="text-lg font-semibold">Weight ladder · Next</h2>
				<p className="text-muted-foreground text-sm">
					Each row is the same paragraph at a different variable-axis weight.
				</p>
				<div className="space-y-2" style={{ fontFamily: NEXT_FAMILY }}>
					{[200, 250, 300, 325, 350, 375, 400, 450, 500, 600, 700, 800].map(
						(w) => (
							<div
								key={w}
								className="flex items-baseline gap-4 border-b pb-1.5"
							>
								<span className="text-muted-foreground w-12 shrink-0 text-xs">
									{w}
								</span>
								<span style={{ fontWeight: w }}>
									The quick brown fox jumps over the lazy dog — 0123456789
								</span>
							</div>
						)
					)}
				</div>
			</div>
		</div>
	)
}
