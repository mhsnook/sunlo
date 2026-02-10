import { createLazyFileRoute } from '@tanstack/react-router'
import { useState, type CSSProperties } from 'react'
import { themes as defaultThemes, type ThemeType } from '@/lib/deck-themes'
import { Copy, Plus, Trash2, Rocket, HouseHeart, Logs } from 'lucide-react'
import { toastSuccess } from '@/components/ui/sonner'

export const Route = createLazyFileRoute('/themes')({
	component: ThemesPage,
})

// Generate all CSS variables for a theme in a given mode, fully self-contained
function modeVars(theme: ThemeType, mode: 'light' | 'dark'): CSSProperties {
	const { hue: h, hueOff: hOff, hueAccent: hAccent } = theme

	if (mode === 'light') {
		return {
			'--h': h,
			'--h-off': hOff,
			'--h-accent': hAccent,
			'--c-hi': 0.22,
			'--c-lo': 0.04,
			'--L-1': 0.35,
			'--L-2': 0.45,
			'--L-3': 0.58,
			'--L-4': 0.9,
			'--c-sec': 0.008,
			'--L-sec': 0.97,
			'--c-sec-f': 0.03,
			'--L-sec-f': 0.22,
			'--background': `oklch(0.96 0.02 ${h})`,
			'--foreground': `oklch(0.30 0.06 ${h})`,
			'--card': 'oklch(1.00 0 0)',
			'--card-foreground': `oklch(0.15 0.02 ${hOff})`,
			'--border': `oklch(0.85 0.03 ${h})`,
			'--muted-foreground': `oklch(0.55 0.01 ${hOff})`,
			'--input': `oklch(0.93 0.005 ${hOff})`,
			'--destructive': 'oklch(0.63 0.26 25)',
			'--destructive-foreground': 'oklch(0.98 0.005 250)',
		} as CSSProperties
	}

	return {
		'--h': h,
		'--h-off': hOff,
		'--h-accent': hAccent,
		'--c-hi': 0.18,
		'--c-lo': 0.04,
		'--L-1': 0.95,
		'--L-2': 0.82,
		'--L-3': 0.5,
		'--L-4': 0.28,
		'--c-sec': 0.02,
		'--c-sec-f': 0.01,
		'--L-sec': 0.28,
		'--L-sec-f': 0.98,
		'--background': `oklch(0.22 0.03 ${h})`,
		'--foreground': `oklch(0.90 0.06 ${h})`,
		'--card': `oklch(0.20 0.05 ${hOff})`,
		'--card-foreground': `oklch(0.92 0.05 ${h})`,
		'--border': `oklch(0.42 0.04 ${h})`,
		'--muted-foreground': `oklch(0.70 0.01 ${hOff})`,
		'--input': `oklch(0.28 0.02 ${hOff})`,
		'--destructive': 'oklch(0.42 0.18 25)',
		'--destructive-foreground': 'oklch(0.98 0.005 250)',
	} as CSSProperties
}

// Small color swatch
function Swatch({ label, bg, fg }: { label: string; bg: string; fg?: string }) {
	return (
		<div className="flex items-center gap-2 text-xs">
			<div
				className="size-6 shrink-0 rounded border border-black/10"
				style={{ background: bg }}
			/>
			<span style={{ color: fg ?? 'var(--foreground)' }}>{label}</span>
		</div>
	)
}

// Mini deck card with dummy data — mirrors the structure from -deck-card.tsx
function MiniDeckCard() {
	return (
		<div
			className="overflow-hidden rounded border shadow"
			style={{
				background: 'var(--card)',
				color: 'var(--card-foreground)',
				borderColor: 'var(--border)',
			}}
		>
			<div
				className="flex items-center justify-between gap-3 p-3"
				style={{
					background:
						'linear-gradient(to bottom right, oklch(var(--L-3) var(--c-hi) var(--h) / 0.1), oklch(var(--L-2) var(--c-hi) var(--h) / 0.3))',
				}}
			>
				<span
					className="text-sm font-semibold"
					style={{ color: 'oklch(var(--L-2) var(--c-hi) var(--h))' }}
				>
					Sample Language
				</span>
				<button
					className="flex size-7 items-center justify-center rounded-xl shadow"
					style={{
						background: 'oklch(var(--L-2) var(--c-hi) var(--h))',
						color: 'white',
					}}
				>
					<Rocket className="size-3.5" />
				</button>
			</div>
			<div className="space-y-2 p-3">
				<div className="flex flex-wrap gap-1">
					<span
						className="rounded px-2 py-0.5 text-xs text-white shadow-xs"
						style={{
							background: 'oklch(var(--L-3) var(--c-hi) var(--h))',
						}}
					>
						4 due
					</span>
					<span
						className="rounded px-2 py-0.5 text-xs shadow-xs"
						style={{
							background: 'oklch(var(--L-sec) var(--c-sec) var(--h-off))',
							color: 'oklch(var(--L-sec-f) var(--c-sec-f) var(--h-off))',
						}}
					>
						12 active
					</span>
					<span
						className="rounded px-2 py-0.5 text-xs shadow-xs"
						style={{
							background:
								'oklch(var(--L-3) var(--c-hi) var(--h-accent) / 0.15)',
							color: 'oklch(var(--L-1) var(--c-lo) var(--h-accent))',
						}}
					>
						3 new
					</span>
				</div>
				<div className="flex gap-1.5">
					<button
						className="flex grow items-center justify-center gap-1 rounded-2xl px-3 py-1.5 text-xs font-medium shadow"
						style={{
							background: 'oklch(var(--L-sec) var(--c-sec) var(--h-off))',
							color: 'oklch(var(--L-sec-f) var(--c-sec-f) var(--h-off))',
						}}
					>
						<HouseHeart className="size-3" />
						Home
					</button>
					<button
						className="flex grow items-center justify-center gap-1 rounded-2xl px-3 py-1.5 text-xs font-medium shadow"
						style={{
							background: 'oklch(var(--L-sec) var(--c-sec) var(--h-off))',
							color: 'oklch(var(--L-sec-f) var(--c-sec-f) var(--h-off))',
						}}
					>
						<Logs className="size-3" />
						Feed
					</button>
				</div>
				<p
					className="border-t pt-1 text-[10px]"
					style={{
						color: 'var(--muted-foreground)',
						borderColor: 'var(--border)',
					}}
				>
					12 total cards &bull; 25% mastered
				</p>
			</div>
		</div>
	)
}

function ButtonRow() {
	return (
		<div className="flex flex-wrap gap-1.5">
			<button
				className="rounded-2xl px-3 py-1.5 text-xs font-medium text-white shadow"
				style={{
					background: 'oklch(var(--L-2) var(--c-hi) var(--h))',
				}}
			>
				Primary
			</button>
			<button
				className="rounded-2xl px-3 py-1.5 text-xs font-medium text-white shadow"
				style={{
					background: 'oklch(var(--L-2) var(--c-hi) var(--h-accent))',
				}}
			>
				Accent
			</button>
			<button
				className="rounded-2xl px-3 py-1.5 text-xs font-medium shadow"
				style={{
					background: 'oklch(var(--L-sec) var(--c-sec) var(--h-off))',
					color: 'oklch(var(--L-sec-f) var(--c-sec-f) var(--h-off))',
				}}
			>
				Secondary
			</button>
			<button
				className="rounded-2xl border px-3 py-1.5 text-xs font-medium shadow"
				style={{
					background: 'oklch(var(--L-3) var(--c-hi) var(--h) / 0.1)',
					color: 'oklch(var(--L-2) var(--c-hi) var(--h))',
					borderColor: 'oklch(var(--L-2) var(--c-hi) var(--h) / 0.4)',
				}}
			>
				Outline
			</button>
			<button
				className="rounded-2xl px-3 py-1.5 text-xs font-medium text-white shadow"
				style={{
					background: 'var(--destructive)',
				}}
			>
				Destructive
			</button>
		</div>
	)
}

function ColorSwatches() {
	return (
		<div className="grid grid-cols-2 gap-x-3 gap-y-1">
			<Swatch label="primary" bg="oklch(var(--L-3) var(--c-hi) var(--h))" />
			<Swatch
				label="primary-foresoft"
				bg="oklch(var(--L-2) var(--c-hi) var(--h))"
			/>
			<Swatch
				label="primary-invert"
				bg="oklch(var(--L-4) var(--c-hi) var(--h))"
			/>
			<Swatch
				label="primary-foreground"
				bg="oklch(var(--L-1) var(--c-lo) var(--h))"
			/>
			<Swatch
				label="accent"
				bg="oklch(var(--L-3) var(--c-hi) var(--h-accent))"
			/>
			<Swatch
				label="accent-foresoft"
				bg="oklch(var(--L-2) var(--c-hi) var(--h-accent))"
			/>
			<Swatch label="background" bg="var(--background)" />
			<Swatch label="foreground" bg="var(--foreground)" />
			<Swatch label="card" bg="var(--card)" />
			<Swatch label="border" bg="var(--border)" />
		</div>
	)
}

function TextSamples() {
	return (
		<div className="space-y-0.5 text-xs">
			<p style={{ color: 'var(--foreground)' }}>Foreground text</p>
			<p
				style={{
					color: 'oklch(var(--L-2) var(--c-hi) var(--h))',
				}}
			>
				Primary foresoft link text
			</p>
			<p
				style={{
					color: 'oklch(var(--L-3) var(--c-hi) var(--h))',
				}}
			>
				Primary color text
			</p>
			<p style={{ color: 'var(--muted-foreground)' }}>Muted foreground text</p>
			<p
				style={{
					color: 'oklch(var(--L-1) var(--c-lo) var(--h-accent))',
				}}
				className="font-semibold italic"
			>
				Accent language name
			</p>
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
	const vars = modeVars(theme, mode)

	return (
		<div
			className="flex-1 space-y-3 rounded-xl p-3"
			style={{
				...vars,
				background: 'var(--background)',
				color: 'var(--foreground)',
			}}
		>
			<p className="text-xs font-semibold tracking-wider uppercase opacity-60">
				{mode}
			</p>
			<MiniDeckCard />
			<ButtonRow />
			<ColorSwatches />
			<TextSamples />
		</div>
	)
}

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

function ThemesPage() {
	const [themeList, setThemeList] = useState<Array<ThemeType>>([
		...defaultThemes,
	])
	const [selectedIdx, setSelectedIdx] = useState(0)
	const [editTheme, setEditTheme] = useState<ThemeType>(
		() => themeList[0] ?? { name: 'new', hue: 300, hueOff: 270, hueAccent: 175 }
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
					OKLCH color system &mdash; edit themes and preview them in light and
					dark mode side by side
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

					<button
						onClick={applyChanges}
						className="bg-primary rounded-2xl px-6 py-2 text-sm font-medium text-white shadow transition hover:opacity-90"
					>
						Apply Changes to List
					</button>
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
					<button
						onClick={copyOne}
						className="bg-secondary text-secondary-foreground flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow transition hover:opacity-90"
					>
						<Copy className="size-4" />
						Copy Selected Theme
					</button>
					<button
						onClick={copyAll}
						className="bg-secondary text-secondary-foreground flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow transition hover:opacity-90"
					>
						<Copy className="size-4" />
						Copy All Themes
					</button>
				</div>
				<pre className="bg-muted text-foreground overflow-auto rounded-lg p-3 text-xs">
					{JSON.stringify(themeList, null, '\t')}
				</pre>
			</div>
		</div>
	)
}
