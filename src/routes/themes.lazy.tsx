import { createLazyFileRoute } from '@tanstack/react-router'
import { useState, type CSSProperties } from 'react'
import { themes as defaultThemes, type ThemeType } from '@/lib/deck-themes'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	Copy,
	Plus,
	Trash2,
	Rocket,
	HouseHeart,
	Logs,
	Hourglass,
	WalletCards,
} from 'lucide-react'
import { toastSuccess } from '@/components/ui/sonner'
import { Separator } from '@/components/ui/separator'

export const Route = createLazyFileRoute('/themes')({
	component: ThemesPage,
})

// Hue variables that go inline on every panel
function hueVars(theme: ThemeType): CSSProperties {
	return {
		'--hue-primary': theme.hue,
		'--hue-neutral': theme.hueOff,
		'--hue-accent': theme.hueAccent,
	} as CSSProperties
}

// Both panels need oklch luminance vars force-declared because the plugin
// uses :root:not(.dark) / @theme to flip them — a nested div can't trigger that.
const lightOklchVars: CSSProperties = {
	'--lc-dir': '-1',
	'--lc-range-start': '0.95',
	'--lc-range-end': '0.15',
	'--l-0': '0.95',
	'--l-1': '0.87',
	'--l-2': '0.79',
	'--l-3': '0.71',
	'--l-4': '0.63',
	'--l-5': '0.55',
	'--l-6': '0.47',
	'--l-7': '0.39',
	'--l-8': '0.31',
	'--l-9': '0.23',
	'--l-10': '0.15',
	'--l-base': '0.95',
	'--l-fore': '0.15',
	'--l-none': '1',
	'--l-full': '0',
} as CSSProperties

// Light panel also needs semantic vars re-declared because :root pre-resolves
// var(--hue-primary) at compute time. Re-declaring them here lets them
// pick up the inline --hue-primary value.
const lightSemanticVars: CSSProperties = {
	'--background': 'oklch(0.96 0.02 var(--hue-primary))',
	'--foreground': 'oklch(0.30 0.06 var(--hue-primary))',
	'--card': 'oklch(1.00 0 0)',
	'--card-foreground': 'oklch(0.15 0.02 var(--hue-neutral))',
	'--popover': 'oklch(1.00 0 0)',
	'--popover-foreground': 'oklch(0.15 0.02 var(--hue-neutral))',
	'--secondary': 'oklch(0.97 0.005 var(--hue-neutral))',
	'--secondary-foreground': 'oklch(0.22 0.03 var(--hue-neutral))',
	'--muted': 'oklch(0.97 0.005 var(--hue-neutral))',
	'--muted-foreground': 'oklch(0.55 0.01 var(--hue-neutral))',
	'--border': 'oklch(0.85 0.03 var(--hue-primary))',
	'--input': 'oklch(0.93 0.005 var(--hue-neutral))',
	'--ring': 'oklch(0.58 0.22 var(--hue-primary))',
	'--destructive': 'oklch(0.63 0.26 25)',
	'--destructive-foreground': 'oklch(0.98 0.005 250)',
} as CSSProperties

const darkOklchVars: CSSProperties = {
	'--lc-dir': '1',
	'--lc-range-start': '0.12',
	'--lc-range-end': '0.92',
	'--l-0': '0.12',
	'--l-1': '0.20',
	'--l-2': '0.28',
	'--l-3': '0.36',
	'--l-4': '0.44',
	'--l-5': '0.52',
	'--l-6': '0.60',
	'--l-7': '0.68',
	'--l-8': '0.76',
	'--l-9': '0.84',
	'--l-10': '0.92',
	'--l-base': '0.12',
	'--l-fore': '0.92',
	'--l-none': '0',
	'--l-full': '1',
} as CSSProperties

// ---------- Showcase components using real UI primitives ----------

function MiniDeckCard() {
	return (
		<Card className="@container relative overflow-hidden">
			<CardHeader className="from-1-mlo-primary to-2-mid-primary flex flex-row items-center justify-between gap-6 bg-gradient-to-br p-4">
				<CardTitle className="text-primary-foresoft text-xl">
					Sample Language
				</CardTitle>
				<Button size="icon">
					<Rocket />
				</Button>
			</CardHeader>
			<CardContent className="space-y-2 p-4">
				<div className="flex flex-wrap gap-2">
					<Badge variant="outline">
						<Hourglass /> 4 due today
					</Badge>
					<Badge variant="outline">
						<WalletCards /> 12 active cards
					</Badge>
				</div>
			</CardContent>
			<CardFooter className="block w-full space-y-4 p-4 pt-0">
				<div className="flex flex-row flex-wrap gap-2">
					<Button variant="neutral" className="grow basis-40">
						<HouseHeart /> Deck Home
					</Button>
					<Button variant="neutral" className="grow basis-60">
						<Logs /> Browse Feed
					</Button>
				</div>
				<div className="text-muted-foreground border-t pt-2 text-xs">
					12 total cards &bull; 25% mastered
				</div>
			</CardFooter>
		</Card>
	)
}

function ButtonSamples() {
	return (
		<>
			<div className="flex flex-wrap gap-1.5">
				<Button size="sm">Default</Button>
				<Button size="sm" variant="soft">
					Soft
				</Button>
				<Button size="sm" variant="neutral">
					Neutral
				</Button>
				<Button size="sm" variant="red">
					Red
				</Button>
				<Button size="sm" variant="red-soft">
					Red Soft
				</Button>
				<Button size="sm" variant="ghost">
					Ghost
				</Button>
				<Button variant="badge-outline" size="sm">
					badge outline
				</Button>
				<Button variant="dashed-w-full">dashed w full</Button>
			</div>
			<Separator />
			<div className="flex flex-wrap gap-1.5">
				<Button>Default</Button>
				<Button variant="soft">Soft</Button>
				<Button variant="neutral">Neutral</Button>
				<Button variant="red">Red</Button>
				<Button variant="red-soft">Red Soft</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="badge-outline">badge outline</Button>
				<Button variant="dashed-w-full" className="h-20">
					dashed w full
				</Button>
			</div>
		</>
	)
}

function BadgeSamples() {
	return (
		<div className="flex flex-wrap gap-1.5">
			<Badge>Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="outline">Outline</Badge>
			<Badge variant="lang">tam</Badge>
		</div>
	)
}

function TextSamples() {
	return (
		<div className="space-y-0.5 text-sm">
			<p className="text-foreground">Foreground text</p>
			<p className="text-primary-foresoft">Primary foresoft text</p>
			<p className="text-primary">Primary text</p>
			<p className="text-muted-foreground">Muted foreground</p>
			<p className="s-language-name">Accent language name</p>
			<p className="s-link cursor-pointer">A styled link</p>
		</div>
	)
}

function InputSample() {
	return (
		<div className="space-y-1">
			<Label>Sample input</Label>
			<Input placeholder="Type something..." />
		</div>
	)
}

function ThemeShowcase({
	theme,
	mode,
}: {
	theme: ThemeType
	mode: 'light' | 'dark'
}) {
	const style =
		mode === 'light' ?
			{ ...hueVars(theme), ...lightOklchVars, ...lightSemanticVars }
		:	{ ...hueVars(theme), ...darkOklchVars }

	return (
		<div
			className={`bg-background text-foreground flex-1 space-y-3 rounded-xl p-3 ${mode === 'dark' ? 'dark' : ''}`}
			style={style}
		>
			<p className="text-xs font-semibold tracking-wider uppercase opacity-60">
				{mode}
			</p>
			<MiniDeckCard />
			<ButtonSamples />
			<BadgeSamples />
			<TextSamples />
			<InputSample />
		</div>
	)
}

// ---------- Editor controls ----------

function HueSlider({
	label,
	value,
	onChange,
}: {
	label: string
	value: number
	onChange: (v: number) => void
}) {
	return (
		<div className="flex items-center gap-3">
			<label className="w-24 shrink-0 text-sm font-medium">{label}</label>
			<input
				type="range"
				min={0}
				max={360}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="h-2 flex-1 cursor-pointer appearance-none rounded-full"
				style={{
					background: `linear-gradient(to right, ${Array.from({ length: 13 }, (_, i) => `oklch(0.7 0.15 ${i * 30})`).join(', ')})`,
				}}
			/>
			<input
				type="number"
				min={0}
				max={360}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="bg-input text-foreground w-16 rounded border px-2 py-1 text-sm"
			/>
		</div>
	)
}

// ---------- Main page ----------

function ThemesPage() {
	const [themeList, setThemeList] = useState<Array<ThemeType>>([
		...defaultThemes,
	])
	const [selectedIdx, setSelectedIdx] = useState(0)
	const [editTheme, setEditTheme] = useState<ThemeType>(
		() =>
			themeList[0] ?? {
				name: 'new',
				hue: 300,
				hueOff: 270,
				hueAccent: 175,
			}
	)

	const selectTheme = (idx: number) => {
		setSelectedIdx(idx)
		setEditTheme({ ...themeList[idx] })
	}

	const updateField = (field: keyof ThemeType, value: string | number) => {
		setEditTheme((prev) => ({ ...prev, [field]: value }))
	}

	const applyChanges = () => {
		setThemeList((prev) =>
			prev.map((t, i) => (i === selectedIdx ? { ...editTheme } : t))
		)
	}

	const addTheme = () => {
		const newTheme: ThemeType = {
			name: 'new',
			hue: 200,
			hueOff: 220,
			hueAccent: 200,
		}
		setThemeList((prev) => [...prev, newTheme])
		setSelectedIdx(themeList.length)
		setEditTheme(newTheme)
	}

	const removeTheme = () => {
		if (themeList.length <= 1) return
		setThemeList((prev) => prev.filter((_, i) => i !== selectedIdx))
		const newIdx = Math.min(selectedIdx, themeList.length - 2)
		setSelectedIdx(newIdx)
		setEditTheme({
			...themeList[newIdx === selectedIdx ? newIdx + 1 : newIdx],
		})
	}

	const copyOne = () => {
		void navigator.clipboard.writeText(JSON.stringify(editTheme, null, '\t'))
		toastSuccess('Copied theme JSON')
	}

	const copyAll = () => {
		void navigator.clipboard.writeText(JSON.stringify(themeList, null, '\t'))
		toastSuccess('Copied all themes JSON')
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6 p-4">
			<div>
				<h1 className="text-3xl font-bold">Theme Editor</h1>
				<p className="text-muted-foreground text-sm">
					OKLCH color system &mdash; edit themes and preview in light and dark
					mode side by side
				</p>
			</div>

			{/* Theme picker */}
			<div className="flex flex-wrap gap-2">
				{themeList.map((theme, i) => (
					<button
						key={`${theme.name}-${i}`}
						onClick={() => selectTheme(i)}
						className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium shadow transition ${
							i === selectedIdx ?
								'border-primary bg-1-mlo-primary text-primary-foresoft'
							:	'border-border bg-card text-card-foreground hover:bg-muted'
						}`}
					>
						<span
							className="size-4 rounded-full shadow-xs"
							style={{
								background: `oklch(0.58 0.22 ${theme.hue})`,
							}}
						/>
						{theme.name}
					</button>
				))}
				<button
					onClick={addTheme}
					className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 rounded-2xl border border-dashed px-4 py-2 text-sm transition"
				>
					<Plus className="size-4" />
					Add
				</button>
			</div>

			{/* Editor */}
			<div className="bg-card rounded-xl border p-4 shadow">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-semibold">Editing: {editTheme.name}</h2>
					<div className="flex gap-2">
						<button
							onClick={removeTheme}
							disabled={themeList.length <= 1}
							className="text-destructive hover:bg-destructive/10 flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm transition disabled:opacity-30"
						>
							<Trash2 className="size-4" />
							Remove
						</button>
					</div>
				</div>

				<div className="space-y-3">
					<div className="flex items-center gap-3">
						<label
							htmlFor="theme-name"
							className="w-24 shrink-0 text-sm font-medium"
						>
							Name
						</label>
						<input
							id="theme-name"
							type="text"
							value={editTheme.name}
							onChange={(e) => updateField('name', e.target.value)}
							className="bg-input text-foreground rounded border px-3 py-1.5 text-sm"
						/>
					</div>

					<HueSlider
						label="Hue"
						value={editTheme.hue}
						onChange={(v) => updateField('hue', v)}
					/>
					<HueSlider
						label="Hue Off"
						value={editTheme.hueOff}
						onChange={(v) => updateField('hueOff', v)}
					/>
					<HueSlider
						label="Hue Accent"
						value={editTheme.hueAccent}
						onChange={(v) => updateField('hueAccent', v)}
					/>

					<Button onClick={applyChanges}>Apply Changes to List</Button>
				</div>
			</div>

			{/* Showcase: light and dark side by side */}
			<div className="flex gap-4 max-sm:flex-col">
				<ThemeShowcase theme={editTheme} mode="light" />
				<ThemeShowcase theme={editTheme} mode="dark" />
			</div>

			{/* JSON output */}
			<div className="bg-card space-y-3 rounded-xl border p-4 shadow">
				<h2 className="text-lg font-semibold">Export</h2>
				<div className="flex gap-2">
					<Button variant="neutral" onClick={copyOne}>
						<Copy className="size-4" />
						Copy Selected Theme
					</Button>
					<Button variant="neutral" onClick={copyAll}>
						<Copy className="size-4" />
						Copy All Themes
					</Button>
				</div>
				<pre className="bg-muted text-foreground overflow-auto rounded-lg p-3 text-xs">
					{JSON.stringify(themeList, null, '\t')}
				</pre>
			</div>
		</div>
	)
}
