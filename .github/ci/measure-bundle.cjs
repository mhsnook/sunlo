'use strict'

// Measure a built output directory into a small JSON summary.
//
//   node measure-bundle.cjs dist /tmp/out/bundle.json
//
// This runs in the build job, next to the dist/ it reads. The report job then
// diffs two summaries, so it never needs either tree — which is what lets the
// head and base builds happen once each, in parallel, on separate runners.

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// Strip the content hash, so the same logical chunk is comparable across two
// builds. Vite on rolldown emits exactly 8 characters after a dash, which turns
// `react-vendor-DrYEQZM-.js` into the stable key `react-vendor.js`.
//
// Each accepted hash length is EXACT. A range such as `{8,20}` lets the match
// start at an earlier dash: in `react-vendor-DrYEQZM-.js` the substring
// `vendor-DrYEQZM-` is itself inside the range, so the key collapses to
// `react.js` — the vendor group's name is lost and two vendor chunks can share
// one key, which is precisely the identity comparison this check exists for.
// Hashes themselves contain dashes, so the 8-character class has to allow them.
const STRIP_HASH =
	/[-.](?:[A-Za-z0-9_-]{8}|[A-Za-z0-9]{16}|[a-f0-9]{20})(\.[a-z0-9]+)$/

const sizeOf = (file) => {
	const buf = fs.readFileSync(file)
	return { raw: buf.length, gz: zlib.gzipSync(buf).length }
}

const add = (total, one) => ({
	raw: total.raw + one.raw,
	gz: total.gz + one.gz,
})

/** Every file under a directory, recursively. Empty when the directory is absent. */
function walk(dir) {
	if (!fs.existsSync(dir)) return []
	const out = []
	for (const entry of fs.readdirSync(dir, {
		withFileTypes: true,
		recursive: true,
	})) {
		if (entry.isFile())
			out.push(path.join(entry.parentPath ?? entry.path, entry.name))
	}
	return out
}

/**
 * Measure the eager-load set: everything index.html references directly, which
 * is what a first paint must download. Lazy chunks are reported separately, not
 * folded in — they are the part of the bundle a user may never fetch, and one
 * combined total hides the number that matters.
 *
 * Sunlo is a Vite SPA, so `dist/index.html` is the entry point and lists the
 * entry script plus every `modulepreload` chunk — the same set the retired
 * `bundle-size` job measured.
 */
function measure(dist) {
	const indexPath = path.join(dist, 'index.html')
	if (!fs.existsSync(indexPath)) {
		throw new Error(
			`no index.html in ${dist} — adapt measure() to this project's output`
		)
	}
	const html = fs.readFileSync(indexPath, 'utf8')
	const eager = [
		...new Set(
			[...html.matchAll(/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)].map(
				(m) => m[0]
			)
		),
	]
	const isEager = new Set(eager.map((rel) => path.join(dist, rel)))

	const result = {
		js: { raw: 0, gz: 0 },
		css: { raw: 0, gz: 0 },
		entry: { raw: 0, gz: 0 },
		lazy: { raw: 0, gz: 0, count: 0 },
		// Every eager chunk, keyed by its hash-stripped name. Identity matters as
		// much as size: a chunk whose hash is unchanged is still in returning
		// visitors' caches.
		eagerChunks: {},
		fileCount: 0,
	}

	for (const rel of eager) {
		const file = path.join(dist, rel)
		const one = sizeOf(file)
		const name = path.basename(rel)
		result.fileCount++

		if (name.endsWith('.css')) {
			// Render-blocking on first paint, so part of the eager cost — but on
			// its own axis, because it moves when design changes, not logic.
			result.css = add(result.css, one)
		} else {
			result.js = add(result.js, one)
			if (/^index[-.]/.test(name)) result.entry = one
		}
		result.eagerChunks[name.replace(STRIP_HASH, '$1')] = { file: name, ...one }
	}

	// Lazy chunks: everything else the build emitted that a browser could fetch.
	for (const file of walk(dist)) {
		if (isEager.has(file)) continue
		if (!/\.(js|css)$/.test(file)) continue
		if (file.endsWith('.map')) continue
		// `add` returns a fresh {raw, gz}, so carry the count across it — reading
		// `result.lazy.count++` off the replacement object yields NaN.
		const count = result.lazy.count + 1
		result.lazy = { ...add(result.lazy, sizeOf(file)), count }
		result.fileCount++
	}

	return result
}

module.exports = { measure, walk, sizeOf, STRIP_HASH }

if (require.main === module) {
	const [dist, out] = process.argv.slice(2)
	if (!dist || !out) {
		console.error('usage: measure-bundle.cjs <dist-dir> <output.json>')
		process.exit(2)
	}
	const result = measure(dist)
	fs.mkdirSync(path.dirname(out), { recursive: true })
	fs.writeFileSync(out, JSON.stringify(result, null, 2))
	console.log(
		`${dist}: ${(result.js.gz / 1024).toFixed(2)} kB JS + ` +
			`${(result.css.gz / 1024).toFixed(2)} kB CSS eager, gzipped ` +
			`(${Object.keys(result.eagerChunks).length} eager chunk(s), ` +
			`${result.lazy.count} lazy)`
	)
}
