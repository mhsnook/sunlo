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
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
	Copy,
	Plus,
	Trash2,
	Rocket,
	HouseHeart,
	Logs,
	ChevronDown,
	Hourglass,
	WalletCards,
} from 'lucide-react'
import { toastSuccess } from '@/components/ui/sonner'

export const Route = createLazyFileRoute('/themes')({
	component: ThemesPage,
})

// Advanced L/C variables (per mode, separate from ThemeType)
interface AdvancedVars {
	cHi: number
	cLo: number
	L1: number
	L2: number
	L3: number
	L4: number
	cSec: number
	cSecF: number
	LSec: number
	LSecF: number
}

const defaultLightVars: AdvancedVars = {
	cHi: 0.22,
	cLo: 0.08,
	L1: 0.35,
	L2: 0.45,
	L3: 0.58,
	L4: 0.9,
	cSec: 0.008,
	cSecF: 0.03,
	LSec: 0.97,
	LSecF: 0.22,
}

const defaultDarkVars: AdvancedVars = {
	cHi: 0.22,
	cLo: 0.08,
	L1: 0.95,
	L2: 0.82,
	L3: 0.5,
	L4: 0.28,
	cSec: 0.02,
	cSecF: 0.01,
	LSec: 0.28,
	LSecF: 0.98,
}

// Base L/C + hue variables that go inline on every panel
function baseVars(theme: ThemeType, vars: AdvancedVars): CSSProperties {
	return {
		'--h': theme.hue,
		'--h-off': theme.hueOff,
		'--h-accent': theme.hueAccent,
		'--c-hi': vars.cHi,
		'--c-lo': vars.cLo,
		'--L-1': vars.L1,
		'--L-2': vars.L2,
		'--L-3': vars.L3,
		'--L-4': vars.L4,
		'--c-sec': vars.cSec,
		'--c-sec-f': vars.cSecF,
		'--L-sec': vars.LSec,
		'--L-sec-f': vars.LSecF,
	} as CSSProperties
}

// Light panel also needs semantic vars re-declared because
// :root pre-resolves var(--h) at compute time. Re-declaring
// them here lets them pick up the inline --h value.
const lightSemanticVars: CSSProperties = {
	'--background': 'oklch(0.96 0.02 var(--h))',
	'--foreground': 'oklch(0.30 0.06 var(--h))',
	'--card': 'oklch(1.00 0 0)',
	'--card-foreground': 'oklch(0.15 0.02 var(--h-off))',
	'--popover': 'oklch(1.00 0 0)',
	'--popover-foreground': 'oklch(0.15 0.02 var(--h-off))',
	'--secondary': 'oklch(0.97 0.005 var(--h-off))',
	'--secondary-foreground': 'oklch(0.22 0.03 var(--h-off))',
	'--muted': 'oklch(0.97 0.005 var(--h-off))',
	'--muted-foreground': 'oklch(0.55 0.01 var(--h-off))',
	'--border': 'oklch(0.85 0.03 var(--h))',
	'--input': 'oklch(0.93 0.005 var(--h-off))',
	'--ring': 'oklch(0.58 0.22 var(--h))',
	'--destructive': 'oklch(0.63 0.26 25)',
	'--destructive-foreground': 'oklch(0.98 0.005 250)',
} as CSSProperties

// The dark panel gets semantic vars from the .dark CSS rule, which
// re-declares them and picks up the inline --h. No extra work needed.

// ---------- Showcase components using real UI primitives ----------

function MiniDeckCard() {
	return (
		<Card className="@container relative overflow-hidden">
			<CardHeader className="from-primary/10 to-primary-foresoft/30 flex flex-row items-center justify-between gap-6 bg-gradient-to-br p-4">
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
					<Button variant="secondary" className="grow basis-40">
						<HouseHeart /> Deck Home
					</Button>
					<Button variant="secondary" className="grow basis-60">
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
		<div className="flex flex-wrap gap-1.5">
			<Button size="sm">Primary</Button>
			<Button size="sm" variant="accent">
				Accent
			</Button>
			<Button size="sm" variant="secondary">
				Secondary
			</Button>
			<Button size="sm" variant="outline-primary">
				Outline
			</Button>
			<Button size="sm" variant="ghost">
				Ghost
			</Button>
			<Button size="sm" variant="destructive">
				Destructive
			</Button>
		</div>
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
	vars,
}: {
	theme: ThemeType
	mode: 'light' | 'dark'
	vars: AdvancedVars
}) {
	const style =
		mode === 'light' ?
			{ ...baseVars(theme, vars), ...lightSemanticVars }
		:	baseVars(theme, vars)

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

function AdvancedVarInput({
	label,
	value,
	onChange,
	min = 0,
	max = 1,
	step = 0.01,
}: {
	label: string
	value: number
	onChange: (v: number) => void
	min?: number
	max?: number
	step?: number
}) {
	return (
		<div className="flex items-center gap-2">
			<label className="w-16 shrink-0 font-mono text-xs">{label}</label>
			<input
				type="number"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="bg-input text-foreground w-20 rounded border px-2 py-1 font-mono text-xs"
			/>
		</div>
	)
}

function AdvancedVarsPanel({
	label,
	vars,
	onChange,
}: {
	label: string
	vars: AdvancedVars
	onChange: (vars: AdvancedVars) => void
}) {
	const set = (key: keyof AdvancedVars, value: number) =>
		onChange({ ...vars, [key]: value })

	return (
		<div className="space-y-2">
			<h3 className="text-sm font-semibold">{label}</h3>
			<div className="grid grid-cols-2 gap-x-4 gap-y-1">
				<AdvancedVarInput
					label="c-hi"
					value={vars.cHi}
					onChange={(v) => set('cHi', v)}
					max={0.4}
				/>
				<AdvancedVarInput
					label="c-lo"
					value={vars.cLo}
					onChange={(v) => set('cLo', v)}
					max={0.2}
				/>
				<AdvancedVarInput
					label="L-1"
					value={vars.L1}
					onChange={(v) => set('L1', v)}
				/>
				<AdvancedVarInput
					label="L-2"
					value={vars.L2}
					onChange={(v) => set('L2', v)}
				/>
				<AdvancedVarInput
					label="L-3"
					value={vars.L3}
					onChange={(v) => set('L3', v)}
				/>
				<AdvancedVarInput
					label="L-4"
					value={vars.L4}
					onChange={(v) => set('L4', v)}
				/>
				<AdvancedVarInput
					label="c-sec"
					value={vars.cSec}
					onChange={(v) => set('cSec', v)}
					max={0.2}
				/>
				<AdvancedVarInput
					label="c-sec-f"
					value={vars.cSecF}
					onChange={(v) => set('cSecF', v)}
					max={0.2}
				/>
				<AdvancedVarInput
					label="L-sec"
					value={vars.LSec}
					onChange={(v) => set('LSec', v)}
				/>
				<AdvancedVarInput
					label="L-sec-f"
					value={vars.LSecF}
					onChange={(v) => set('LSecF', v)}
				/>
			</div>
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
	const [lightVars, setLightVars] = useState<AdvancedVars>(defaultLightVars)
	const [darkVars, setDarkVars] = useState<AdvancedVars>(defaultDarkVars)

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
		navigator.clipboard.writeText(JSON.stringify(editTheme, null, '\t'))
		toastSuccess('Copied theme JSON')
	}

	const copyAll = () => {
		navigator.clipboard.writeText(JSON.stringify(themeList, null, '\t'))
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
								'border-primary bg-primary/10 text-primary-foresoft'
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

				{/* Advanced: L/C variables */}
				<Collapsible className="mt-4">
					<CollapsibleTrigger asChild>
						<Button
							variant="ghost"
							className="gap-2 [&[data-state=open]>svg]:rotate-180"
						>
							Advanced: Lightness &amp; Chroma
							<ChevronDown className="size-4 transition-transform" />
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-3">
						<div className="grid gap-6 sm:grid-cols-2">
							<AdvancedVarsPanel
								label="Light Mode"
								vars={lightVars}
								onChange={setLightVars}
							/>
							<AdvancedVarsPanel
								label="Dark Mode"
								vars={darkVars}
								onChange={setDarkVars}
							/>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>

			{/* Showcase: light and dark side by side */}
			<div className="flex gap-4 max-sm:flex-col">
				<ThemeShowcase theme={editTheme} mode="light" vars={lightVars} />
				<ThemeShowcase theme={editTheme} mode="dark" vars={darkVars} />
			</div>

			{/* JSON output */}
			<div className="bg-card space-y-3 rounded-xl border p-4 shadow">
				<h2 className="text-lg font-semibold">Export</h2>
				<div className="flex gap-2">
					<Button variant="secondary" onClick={copyOne}>
						<Copy className="size-4" />
						Copy Selected Theme
					</Button>
					<Button variant="secondary" onClick={copyAll}>
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
