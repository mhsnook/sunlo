'use strict'

// Diff two bundle measurements and render one fragment.
//
// Takes the JSON summaries written by measure-bundle.cjs, not the built
// directories — the report job never has either tree checked out.

const {
	readText,
	writeFragment,
	writeMissing,
	formatBytes,
	deltaLabel,
	sizeTable,
} = require('./delta.cjs')

const load = (file) => {
	const text = readText(file)
	return text ? JSON.parse(text) : null
}

// A missing measurement means a build failed. An EMPTY one is the same failure
// in disguise: a build that exits zero and writes nothing would otherwise
// report a triumphant −100%.
const empty = (m) => !m || !m.fileCount

/**
 * Compare eager chunks by identity, not size.
 *
 * This is the axis people miss. A chunk whose content hash is unchanged is
 * still in returning visitors' caches. A PR that adds 2 kB to one has really
 * cost every returning visitor the WHOLE chunk again, which may be 200 kB. So
 * report which chunks changed first, and their sizes second.
 */
function chunkSection(base, head) {
	const names = [
		...new Set([
			...Object.keys(base.eagerChunks),
			...Object.keys(head.eagerChunks),
		]),
	].toSorted()
	if (!names.length) return '_No chunks in the eager set._'

	const changed = []
	let cachedRaw = 0
	let cachedGz = 0
	let cachedCount = 0

	for (const n of names) {
		const b = base.eagerChunks[n]
		const h = head.eagerChunks[n]
		if (b && h && b.file === h.file) {
			cachedCount++
			cachedRaw += h.raw
			cachedGz += h.gz
		} else {
			changed.push({ n, b, h })
		}
	}

	if (!changed.length) {
		return (
			`✅ **Every eager chunk keeps its hash** — ${cachedCount} chunk(s) totalling ` +
			`${formatBytes(cachedRaw)} raw (${formatBytes(cachedGz)} gzipped), still cached for repeat visitors.`
		)
	}

	const rows = changed.map(({ n, b, h }) => {
		if (!b)
			return `- 🆕 \`${n}\` added — ${formatBytes(h.raw)} raw (${formatBytes(h.gz)} gz)`
		if (!h) return `- ❌ \`${n}\` removed — was ${formatBytes(b.raw)} raw`
		// deltaLabel supplies the direction emoji: a chunk that shrank must not
		// render as growth.
		return `- \`${n}\` — ${formatBytes(b.raw)} → ${formatBytes(h.raw)} raw, ${deltaLabel(h.raw, b.raw)}`
	})
	const stable = cachedCount
		? `\n\n${cachedCount} other chunk(s) keep their hash — ${formatBytes(cachedRaw)} raw (${formatBytes(cachedGz)} gz), still cached.`
		: ''
	return `**Chunks that changed — repeat visitors re-download these in full:**\n${rows.join('\n')}${stable}`
}

module.exports = function render({ head, base, out }) {
	const h = load(head)
	const b = load(base)

	if (empty(h) || empty(b)) {
		const which =
			empty(h) && empty(b)
				? 'Neither build produced a measurable bundle'
				: empty(h)
					? 'The PR build produced no measurable bundle'
					: 'The base build produced no measurable bundle'
		writeMissing(
			out,
			'40-bundle',
			'Bundle size',
			'bundle',
			`${which}, so there is nothing to compare.`
		)
		return
	}

	const markdown = [
		'#### Bundle size',
		'',
		'**Eager load** — the entry chunk plus every preload in `index.html` (what a first paint downloads)',
		'',
		sizeTable(h.js.raw, h.js.gz, b.js.raw, b.js.gz),
		'',
		'**Entry chunk** — your own code, re-downloaded on every deploy',
		'',
		sizeTable(h.entry.raw, h.entry.gz, b.entry.raw, b.entry.gz),
		'',
		'**CSS** — render-blocking on first paint',
		'',
		sizeTable(h.css.raw, h.css.gz, b.css.raw, b.css.gz),
		'',
		`**Lazy chunks** — ${h.lazy.count} file(s), ${formatBytes(h.lazy.gz)} gzipped · ` +
			`${deltaLabel(h.lazy.gz, b.lazy.gz)}. Fetched on demand, so this is context rather than first-paint cost.`,
		'',
		chunkSection(b, h),
	].join('\n')

	writeFragment(out, '40-bundle', markdown, { check: 'bundle' })
}
