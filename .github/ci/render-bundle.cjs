'use strict'

// Diff two bundle measurements and render one fragment.
//
// Takes the JSON summaries written by measure-bundle.cjs, not the built
// directories — the report job never has either tree checked out.

const fs = require('fs')
const path = require('path')
const { formatBytes, deltaLabel, sizeTable } = require('./delta.cjs')

const load = (p) =>
	fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null

// Two builds of the same commit differ by a few bytes per chunk. Below this,
// call it unchanged rather than teaching people that the number is noise.
const NOISE_FLOOR = 512

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
	].sort()
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
	fs.mkdirSync(out, { recursive: true })
	const h = load(head)
	const b = load(base)

	// A missing measurement means a build failed. Say so rather than rendering
	// a delta against zeros, which would read as "the whole bundle is new".
	//
	// An EMPTY measurement is the same failure wearing a disguise: a build that
	// exits zero and writes nothing would otherwise report a triumphant −100%.
	const empty = (m) => !m || !m.fileCount
	if (empty(h) || empty(b)) {
		const which =
			empty(h) && empty(b)
				? 'Neither build produced a measurable bundle'
				: empty(h)
					? 'The PR build produced no measurable bundle'
					: 'The base build produced no measurable bundle'
		fs.writeFileSync(
			path.join(out, '40-bundle.md'),
			`#### Bundle size\n\n⚠️ ${which}, so there is nothing to compare. Check the job log.`
		)
		fs.writeFileSync(
			path.join(out, '40-bundle.json'),
			JSON.stringify({ check: 'bundle', missing: true }, null, 2)
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

	// Below the noise floor, report the eager delta as zero. Two builds of the
	// same commit differ by a few bytes, and a budget that trips on those
	// teaches people the number means nothing.
	const gzDelta = h.js.gz - b.js.gz
	fs.writeFileSync(path.join(out, '40-bundle.md'), markdown)
	fs.writeFileSync(
		path.join(out, '40-bundle.json'),
		JSON.stringify(
			{
				check: 'bundle',
				eagerRawDelta: h.js.raw - b.js.raw,
				eagerGzDelta: Math.abs(gzDelta) < NOISE_FLOOR ? 0 : gzDelta,
				eagerGzBase: b.js.gz,
				entryGzDelta: h.entry.gz - b.entry.gz,
				lazyGzDelta: h.lazy.gz - b.lazy.gz,
			},
			null,
			2
		)
	)
}

module.exports.chunkSection = chunkSection
module.exports.NOISE_FLOOR = NOISE_FLOOR
