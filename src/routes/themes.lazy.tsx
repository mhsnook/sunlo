import { createLazyFileRoute } from '@tanstack/react-router'
import { useState, type CSSProperties } from 'react'
import { themes as defaultThemes, type ThemeType } from '@/lib/deck-themes'
import { Button } from '@/components/ui/button'
import { Badge, LangBadge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { CardlikeFlashcard } from '@/components/ui/card-like'
import Callout from '@/components/ui/callout'
import {
	Copy,
	Plus,
	Trash2,
	Rocket,
	HouseHeart,
	Logs,
	Hourglass,
	WalletCards,
	X,
	Send,
	Star,
	Sparkles,
	Info,
	CheckCircle,
	AlertTriangle,
} from 'lucide-react'
import { toastSuccess } from '@/components/ui/sonner'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'

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

function FlashcardFormSample() {
	const [tags, setTags] = useState<Array<string>>(['greeting', 'beginner'])
	const [tagInput, setTagInput] = useState('')

	const addTag = () => {
		const t = tagInput.trim().toLowerCase()
		if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
		setTagInput('')
	}

	return (
		<CardlikeFlashcard>
			<CardHeader className="pb-2">
				<CardTitle className="text-lg">New Flashcard</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="space-y-1">
					<Label>Phrase</Label>
					<Input placeholder="வணக்கம்" />
				</div>
				<div className="space-y-1">
					<Label>Translation</Label>
					<Textarea placeholder="Hello / Greetings" className="min-h-[60px]" />
				</div>
				<div className="space-y-1">
					<Label>Tags</Label>
					<div className="flex gap-2">
						<Input
							placeholder="Add a tag..."
							value={tagInput}
							onChange={(e) => setTagInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault()
									addTag()
								}
							}}
							className="flex-1"
						/>
						<Button
							variant="soft"
							size="sm"
							className="shrink-0"
							onClick={addTag}
						>
							<Plus className="size-3" /> Add
						</Button>
					</div>
					<div className="flex flex-wrap gap-1 pt-1">
						{tags.map((tag) => (
							<Badge key={tag} variant="outline" size="lg">
								{tag}
								<button
									onClick={() =>
										setTags((prev) => prev.filter((t) => t !== tag))
									}
									className="text-muted-foreground hover:text-foreground ms-0.5 -me-1 rounded-full p-0.5 transition-colors"
								>
									<X className="size-3" />
								</button>
							</Badge>
						))}
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex gap-2 pt-0">
				<Button>
					<Send /> Submit
				</Button>
				<Button variant="neutral">Cancel</Button>
			</CardFooter>
		</CardlikeFlashcard>
	)
}

function InvertedShowcase() {
	return (
		<div className="bg-5-mhi-primary rounded-xl p-6 shadow-lg">
			<div className="mx-auto max-w-lg space-y-4">
				<div className="flex items-center gap-3">
					<div className="bg-0-mlo-primary flex size-10 items-center justify-center rounded-full">
						<Sparkles className="text-5-hi-primary size-5" />
					</div>
					<div>
						<h3 className="text-0-mlo-primary text-lg font-semibold">
							Streak Milestone
						</h3>
						<p className="text-1-mlo-primary text-sm">
							You&apos;ve studied 7 days in a row!
						</p>
					</div>
				</div>
				<Separator className="bg-0-mlo-primary opacity-20" />
				<div className="grid grid-cols-3 gap-3 text-center">
					{[
						{ label: 'Cards reviewed', value: '142' },
						{ label: 'Accuracy', value: '87%' },
						{ label: 'Streak', value: '7 days' },
					].map(({ label, value }) => (
						<div key={label} className="space-y-1">
							<p className="text-0-mlo-primary text-xl font-bold">{value}</p>
							<p className="text-2-lo-primary text-xs">{label}</p>
						</div>
					))}
				</div>
				<Button className="bg-0-mlo-primary text-5-hi-primary hover:bg-1-lo-primary w-full border-transparent shadow-md">
					<Star className="size-4" /> Keep it going!
				</Button>
			</div>
		</div>
	)
}

function LuminanceScale() {
	const stops = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
	return (
		<div className="space-y-2">
			<p className="text-sm font-medium">Luminance contrast scale</p>
			<div className="flex gap-1">
				{stops.map((l) => (
					<div key={l} className="flex-1 text-center">
						<div className={`bg-${l}-mid-primary mb-1 h-8 rounded`} />
						<span className="text-muted-foreground text-[10px]">{l}</span>
					</div>
				))}
			</div>
			<div className="flex gap-1">
				{(['lo', 'mlo', 'mid', 'mhi', 'hi'] as const).map((c) => (
					<div key={c} className="flex-1 text-center">
						<div className={`bg-5-${c}-primary mb-1 h-8 rounded`} />
						<span className="text-muted-foreground text-[10px]">{c}</span>
					</div>
				))}
			</div>
		</div>
	)
}

function HueSwatches() {
	const hues = [
		'primary',
		'accent',
		'neutral',
		'success',
		'warning',
		'danger',
		'info',
	] as const
	return (
		<div className="space-y-2">
			<p className="text-sm font-medium">Hue palette</p>
			<div className="flex flex-wrap gap-2">
				{hues.map((h) => (
					<div key={h} className="space-y-1 text-center">
						<div className="flex gap-0.5">
							<div className={`bg-2-mlo-${h} size-8 rounded`} />
							<div className={`bg-5-mid-${h} size-8 rounded`} />
							<div className={`bg-7-hi-${h} size-8 rounded`} />
						</div>
						<span className="text-muted-foreground text-[10px]">{h}</span>
					</div>
				))}
			</div>
		</div>
	)
}

function CalloutSamples() {
	return (
		<div className="space-y-2">
			<Callout Icon={Info} size="sm">
				<p className="text-sm font-medium">Default callout</p>
				<p className="text-sm opacity-80">
					Helpful context for the user about their learning progress.
				</p>
			</Callout>
			<Callout variant="problem" Icon={AlertTriangle} size="sm">
				<p className="text-sm font-medium">Problem callout</p>
				<p className="text-sm opacity-80">
					Something needs your attention before continuing.
				</p>
			</Callout>
			<Callout variant="ghost" Icon={CheckCircle} size="sm">
				<p className="text-sm font-medium">Ghost callout</p>
				<p className="text-sm opacity-80">A subtle informational message.</p>
			</Callout>
		</div>
	)
}

function MiniFlashcardPreview() {
	return (
		<CardlikeFlashcard className="max-w-sm">
			<CardContent className="space-y-2 p-4">
				<div className="flex items-start justify-between">
					<div>
						<p className="text-lg font-medium">வணக்கம்</p>
						<p className="text-muted-foreground text-sm">Hello / Greetings</p>
					</div>
					<LangBadge lang="tam" />
				</div>
				<Separator />
				<div className="flex flex-wrap gap-1">
					<Badge variant="outline" size="sm">
						greeting
					</Badge>
					<Badge variant="outline" size="sm">
						beginner
					</Badge>
				</div>
				<div className="flex gap-1 pt-1">
					<Button size="sm" variant="ghost">
						<Star /> Save
					</Button>
					<Button size="sm" variant="ghost">
						<Send /> Share
					</Button>
				</div>
			</CardContent>
		</CardlikeFlashcard>
	)
}

function InteractiveStates() {
	const [bookmarked, setBookmarked] = useState(false)
	const [rating, setRating] = useState<number | null>(null)

	return (
		<div className="space-y-3">
			<p className="text-sm font-medium">Interactive states</p>
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-sm">Toggle state:</span>
				<Button
					variant={bookmarked ? 'soft' : 'ghost'}
					size="sm"
					onClick={() => setBookmarked(!bookmarked)}
				>
					<Star className={bookmarked ? 'fill-current' : 'fill-transparent'} />
					{bookmarked ? 'Saved' : 'Save'}
				</Button>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-sm">Rating buttons:</span>
				<div className="inline-flex overflow-hidden rounded-2xl border">
					{['Again', 'Hard', 'Good', 'Easy'].map((label, i) => (
						<button
							key={label}
							onClick={() => setRating(i)}
							className={`px-3 py-1.5 text-sm font-medium transition-colors ${
								rating === i ?
									'bg-5-mhi-primary text-0-mlo-primary'
								:	'hover:bg-1-mlo-primary'
							} ${i > 0 ? 'border-s' : ''}`}
						>
							{label}
						</button>
					))}
				</div>
			</div>
		</div>
	)
}

function ThemeShowcase({ theme }: { theme: ThemeType }) {
	return (
		<div
			className="bg-background text-foreground space-y-4 rounded-xl p-4"
			style={hueVars(theme)}
		>
			{/* Row 1: Deck card + flashcard form side by side */}
			<div className="grid gap-4 sm:grid-cols-2">
				<MiniDeckCard />
				<FlashcardFormSample />
			</div>

			{/* Inverted showcase */}
			<InvertedShowcase />

			{/* Row 2: Mini flashcard + callouts */}
			<div className="grid gap-4 sm:grid-cols-2">
				<MiniFlashcardPreview />
				<CalloutSamples />
			</div>

			{/* Color system */}
			<div className="bg-card space-y-4 rounded-lg border p-4">
				<LuminanceScale />
				<Separator />
				<HueSwatches />
			</div>

			{/* Buttons, badges, text */}
			<ButtonSamples />
			<div className="grid gap-4 sm:grid-cols-3">
				<BadgeSamples />
				<TextSamples />
				<InputSample />
			</div>

			{/* Interactive states */}
			<InteractiveStates />
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
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-3xl font-bold">Theme Editor</h1>
					<p className="text-muted-foreground text-sm">
						OKLCH color system &mdash; edit themes and preview live
					</p>
				</div>
				<ThemeToggle />
			</div>

			{/* Theme picker */}
			<div className="flex flex-wrap gap-2">
				{themeList.map((t, i) => (
					<button
						key={`${t.name}-${i}`}
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
								background: `oklch(0.58 0.22 ${t.hue})`,
							}}
						/>
						{t.name}
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

			{/* Showcase */}
			<ThemeShowcase theme={editTheme} />

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
