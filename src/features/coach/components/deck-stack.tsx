import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useDeck, useDeckPids } from '@/features/deck/hooks'
import languages from '@/lib/languages'
import { cn } from '@/lib/utils'
import {
	FLIGHT_MS,
	inFlight,
	land,
	landAll,
	useFlights,
	type Flight,
} from '../deal'
import { usePhrasesByIds, type DeckMeter } from '../hooks'
import { DECK_TARGET } from '../protocol'
import { TagDot } from './tag-dot'

const PILE_MAX = 5
// The deck needs more phrases once fewer are fresh than this many days of
// new cards.
const FRESH_DAYS = 3
// Hand-dealt, not machine-stacked: each card under the top one sits a little
// askew.
const TILTS = [0, -2.5, 1.5, -1, 2.5]

type Stage = 'building' | 'ready' | 'active' | 'hungry'

const STAGES: Record<
	Exclude<Stage, 'building'>,
	{ label: string; className: string }
> = {
	ready: {
		label: 'Ready to start',
		className: 'bg-success-100 text-success-800',
	},
	active: { label: 'Active', className: 'bg-primary-100 text-primary-800' },
	hungry: {
		label: 'Needs more phrases',
		className: 'bg-warning-100 text-warning-800',
	},
}

function useDeckStage(lang: string, size: number): Stage {
	const { data: pids } = useDeckPids(lang)
	const { data: deck } = useDeck(lang)
	if (!pids?.reviewed.length) return size >= DECK_TARGET ? 'ready' : 'building'
	const enough = (deck?.daily_review_goal ?? 15) * FRESH_DAYS
	return pids.unreviewed_active.length < enough ? 'hungry' : 'active'
}

const reducedMotion = () =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The learner's deck as a pile of cards, newest on top. Cards the coach or
 * the learner adds fly in from the page (`dealIntoDeck`), and the count only
 * goes up as each one lands.
 */
export function DeckStack({ lang, deck }: { lang: string; deck: DeckMeter }) {
	const flights = useFlights()
	const flying = inFlight(flights, deck.statuses)
	const shown = deck.size - flying.size
	const top = usePhrasesByIds(
		deck.newest.filter((pid) => !flying.has(pid)).slice(0, PILE_MAX)
	)
	const stage = useDeckStage(lang, shown)
	const pileRef = useRef<HTMLButtonElement>(null)
	const slotRef = useRef<HTMLSpanElement>(null)
	const [fanned, setFanned] = useState(false)
	const lastShown = useRef(shown)

	useEffect(() => landAll, [])

	useEffect(() => {
		const before = lastShown.current
		lastShown.current = shown
		const pile = pileRef.current
		if (!pile || before === shown || reducedMotion()) return
		pile.animate(
			shown > before
				? [{ scale: 1 }, { scale: 1.06 }, { scale: 1 }]
				: [
						{ translate: '0' },
						{ translate: '-6px' },
						{ translate: '6px' },
						{ translate: '0' },
					],
			{ duration: 240, easing: 'ease-out' }
		)
	}, [shown])

	useEffect(() => {
		if (!fanned) return
		const close = (event: PointerEvent) => {
			if (!pileRef.current?.contains(event.target as Node)) setFanned(false)
		}
		document.addEventListener('pointerdown', close)
		return () => document.removeEventListener('pointerdown', close)
	}, [fanned])

	return (
		// The negative offsets match the scroll area's padding in coach-page.tsx,
		// so tiles scrolling under the stack do not show above it.
		<div className="bg-background sticky -top-4 z-10 -mt-4 shrink-0 pt-4 lg:-top-10 lg:-mt-10 lg:pt-10 @2xl:w-64">
			<section
				className="bg-card flex items-center gap-4 rounded border p-3 shadow-sm @2xl:flex-col-reverse @2xl:items-stretch @2xl:p-4"
				data-testid="coach-deck-meter"
				data-size={shown}
				data-stage={stage}
				aria-label="Your deck"
			>
				<button
					ref={pileRef}
					type="button"
					data-testid="coach-deck-stack"
					data-fanned={fanned || undefined}
					aria-expanded={fanned}
					aria-label="Newest phrases in your deck"
					disabled={!top.length}
					onClick={() => setFanned((open) => !open)}
					onKeyDown={(event) => {
						if (event.key === 'Escape') setFanned(false)
					}}
					className="focus-visible:ring-ring relative h-20 w-28 shrink-0 rounded-2xl outline-none focus-visible:ring-2 @2xl:h-32 @2xl:w-full"
				>
					<span ref={slotRef} aria-hidden className={cn(CARD, 'invisible')} />
					{top.length === 0 ? (
						<span
							className={cn(
								CARD,
								'text-muted-foreground items-center border-dashed text-center shadow-none'
							)}
						>
							Phrases you add land here
						</span>
					) : (
						top.map((phrase, depth) => (
							<span
								key={phrase.id}
								data-key={phrase.id}
								className={cn(
									CARD,
									'transition-transform duration-300 ease-out motion-reduce:transition-none'
								)}
								style={{
									zIndex: PILE_MAX - depth,
									transform: fanned
										? `translateY(calc(${depth} * (100% + 0.375rem))) rotate(${depth % 2 ? 1.5 : -1.5}deg)`
										: `translateY(-${depth * 4}px) rotate(${TILTS[depth]}deg)`,
								}}
							>
								<CardFace
									text={phrase.text}
									tag={phrase.tags[0]?.name ?? null}
								/>
							</span>
						))
					)}
				</button>

				<div className="flex min-w-0 flex-col items-start gap-1">
					<p className="text-muted-foreground text-sm">
						Your {languages[lang] ?? lang} deck
					</p>
					<p
						className="text-2xl font-bold tabular-nums"
						data-testid="coach-deck-count"
					>
						{shown}
						{shown < DECK_TARGET && (
							<span className="text-muted-foreground text-base font-normal">
								{' '}
								/ {DECK_TARGET}
							</span>
						)}
					</p>
					{stage !== 'building' && (
						<span
							data-testid="coach-deck-stage"
							className={cn(
								'rounded-full px-2 py-0.5 text-xs font-medium',
								STAGES[stage].className
							)}
						>
							{STAGES[stage].label}
						</span>
					)}
					{deck.tags.length > 0 && (
						<ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
							{deck.tags.map((tag) => (
								<li key={tag.name} className="flex items-center gap-1">
									<TagDot name={tag.name} />
									{tag.count} {tag.name}
								</li>
							))}
						</ul>
					)}
				</div>

				{createPortal(
					flights.map((flight) => (
						<Ghost key={flight.id} flight={flight} slot={slotRef} />
					)),
					document.body
				)}
			</section>
		</div>
	)
}

// The top-4 leaves room for the cards underneath to peek out above the top one.
const CARD =
	'bg-card absolute inset-x-0 top-4 bottom-0 flex flex-col items-start justify-center gap-1 overflow-hidden rounded border p-2 text-start shadow-sm @2xl:p-3'

function CardFace({ text, tag }: { text: string; tag: string | null }) {
	return (
		<>
			{tag && <TagDot name={tag} />}
			<span className="line-clamp-2 text-xs font-semibold @2xl:text-base">
				{text}
			</span>
		</>
	)
}

function Ghost({
	flight,
	slot,
}: {
	flight: Flight
	slot: RefObject<HTMLElement | null>
}) {
	const ref = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		const el = ref.current
		const box = slot.current?.getBoundingClientRect()
		if (!el || !box) return land(flight.id)
		el.style.width = `${box.width}px`
		el.style.height = `${box.height}px`
		const home = { x: box.left, y: box.top }
		const away = {
			x: flight.from.x - box.width / 2,
			y: flight.from.y - box.height / 2,
		}
		const [from, to] = flight.out ? [home, away] : [away, home]
		const arc = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 24 }
		const at = (point: { x: number; y: number }, pose: string) =>
			`translate(${point.x}px, ${point.y}px) ${pose}`
		const animation = el.animate(
			[
				{
					transform: at(from, 'rotate(-10deg) scale(1.15)'),
					opacity: flight.out ? 1 : 0,
				},
				{ transform: at(arc, 'rotate(8deg) scale(1.08)'), opacity: 1 },
				{
					transform: at(to, 'rotate(0deg) scale(1)'),
					opacity: flight.out ? 0 : 1,
				},
			],
			{
				duration: FLIGHT_MS,
				delay: flight.delay,
				easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)',
				fill: 'both',
			}
		)
		const done = () => land(flight.id)
		animation.finished.then(done, () => undefined)
		// A background tab can hold the animation; the note must still settle.
		const fallback = setTimeout(done, flight.delay + FLIGHT_MS + 500)
		return () => {
			clearTimeout(fallback)
			animation.cancel()
		}
	}, [flight, slot])

	return (
		// left-0, not start-0: the flight's translate is in viewport pixels
		// from the left edge, in either text direction.
		<div
			ref={ref}
			aria-hidden
			data-testid="coach-deck-flight"
			data-key={flight.pids[0]}
			className="bg-card pointer-events-none fixed top-0 left-0 z-50 flex flex-col items-start justify-center gap-1 rounded border p-3 opacity-0 shadow-lg"
		>
			<CardFace text={flight.text} tag={flight.tag} />
			{flight.pids.length > 1 && (
				<span className="bg-primary-600 absolute -end-2 -top-2 rounded-full px-1.5 text-xs font-bold text-white">
					{flight.pids.length}
				</span>
			)}
		</div>
	)
}
