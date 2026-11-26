import { cn } from '@/lib/utils'

// Stock colours, so a tag keeps its colour in both modes.
const TAG_DOTS = [
	'bg-amber-500',
	'bg-rose-500',
	'bg-teal-500',
	'bg-sky-500',
	'bg-violet-500',
	'bg-lime-500',
]

export function TagDot({ name }: { name: string }) {
	let hash = 0
	for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
	return (
		<span
			aria-hidden
			className={cn(
				'size-2 shrink-0 rounded-full',
				TAG_DOTS[hash % TAG_DOTS.length]
			)}
		/>
	)
}
