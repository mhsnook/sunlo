import { MAX_SVG_BYTES } from '../shared/crew'

export type CheckedSvg =
	| { ok: true; svg: string; width: number; height: number }
	| { ok: false; error: string }

// The Content-Security-Policy an SVG is served with: a sandboxed document
// with no origin, which runs no script and loads nothing but its own styles
// and data: pictures.
export const SVG_POLICY =
	"sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:"

// The longest side of an SVG's PNG rendering, in pixels.
const RENDER_SIDE = 1024

// Elements that run script, load a document, or embed HTML.
const REFUSED_ELEMENTS =
	/<\s*(?:[a-z][\w.-]*:)?(script|foreignobject|iframe|embed|object|handler|listener|link|meta|base|audio|video)\b/i
const TAG = /<[a-z][^>]*>/gi
// An event-handler attribute: onload=, onclick= and the rest. A browser
// takes a slash as well as a space before one.
const EVENT_ATTRIBUTE = /[\s/"']on[a-z-]+\s*=/i
const LINK_ATTRIBUTE =
	/(?:^|[\s/"'])(?:[a-z]+:)?href\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const SAFE_LINK = /^(#|data:image\/(png|jpeg|gif|webp);)/i
const CSS_URL = /url\(\s*(['"]?)([^'")]*)\1\s*\)/gi
// A DOCTYPE without an internal subset, which can declare nothing.
const PLAIN_DOCTYPE = /<!DOCTYPE[^>[]*>/gi

const decodeEntities = (text: string) =>
	text
		.replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) =>
			String.fromCodePoint(Math.min(Number.parseInt(hex, 16), 0x10ffff))
		)
		.replace(/&#(\d+);?/g, (_, decimal: string) =>
			String.fromCodePoint(Math.min(Number(decimal), 0x10ffff))
		)
		.replace(/&colon;/gi, ':')
		.replace(/&tab;|&newline;/gi, '')

// A browser ignores whitespace and control characters inside a URL scheme,
// so "java\tscript:" is still javascript:.
const squeezed = (text: string) =>
	Array.from(decodeEntities(text).toLowerCase().replace(/\s+/g, ''))
		.filter((char) => char.charCodeAt(0) > 0x1f)
		.join('')

// An SVG the room can keep and the app can show: one <svg> document with
// no script, no event handlers, no javascript: links, and no links to other
// files. It refuses rather than repairs, and says what to fix. The app also
// shows an SVG only through <img>, which runs no script; this check is the
// layer that holds when someone opens one on its own.
export function checkSvg(input: string): CheckedSvg {
	const svg = input.trim().replace(PLAIN_DOCTYPE, '')
	if (new TextEncoder().encode(svg).length > MAX_SVG_BYTES) {
		return {
			ok: false,
			error: `That SVG is over ${MAX_SVG_BYTES / 1000} KB. Simplify its paths.`,
		}
	}
	if (
		!/^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(svg) ||
		!/<\/svg>\s*$/i.test(svg)
	) {
		return {
			ok: false,
			error: 'An SVG starts with <svg> and ends with </svg>.',
		}
	}
	if (/<!DOCTYPE|<!ENTITY/i.test(svg)) {
		return { ok: false, error: 'Leave out DOCTYPE and ENTITY declarations.' }
	}
	const element = REFUSED_ELEMENTS.exec(svg)
	if (element) {
		return {
			ok: false,
			error: `Leave out <${element[1]}>: an SVG here has no script and embeds no other documents.`,
		}
	}
	const decoded = squeezed(svg)
	for (const scheme of ['javascript:', 'vbscript:', 'data:text/html']) {
		if (decoded.includes(scheme)) {
			return { ok: false, error: `Leave out ${scheme} links.` }
		}
	}
	if (/@import/i.test(decoded)) {
		return { ok: false, error: 'Leave out CSS @import.' }
	}
	for (const [tag] of svg.matchAll(TAG)) {
		if (EVENT_ATTRIBUTE.test(tag)) {
			return {
				ok: false,
				error: 'Leave out event-handler attributes such as onload and onclick.',
			}
		}
		for (const [, quoted] of tag.matchAll(LINK_ATTRIBUTE)) {
			const link = squeezed(quoted.replace(/^["']|["']$/g, ''))
			if (link && !SAFE_LINK.test(link)) {
				return {
					ok: false,
					error: `Links in an SVG point inside it (#id) or hold a data:image; this one does not: ${quoted.slice(0, 80)}`,
				}
			}
		}
	}
	for (const [, , link] of svg.matchAll(CSS_URL)) {
		if (!SAFE_LINK.test(squeezed(link))) {
			return {
				ok: false,
				error: `CSS url() in an SVG points inside it (#id) or holds a data:image; this one does not: ${link.slice(0, 80)}`,
			}
		}
	}
	return { ok: true, svg, ...svgSize(svg) }
}

// The size an SVG declares: its viewBox, else its width and height, else a
// square.
export function svgSize(svg: string): { width: number; height: number } {
	const root = /<svg[^>]*>/i.exec(svg)?.[0] ?? ''
	const attribute = (name: string) =>
		new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(root)?.[1]
	const box = attribute('viewBox')
		?.trim()
		.split(/[\s,]+/)
		.map(Number)
	if (box?.length === 4 && box[2] > 0 && box[3] > 0) {
		return { width: box[2], height: box[3] }
	}
	const width = Number.parseFloat(attribute('width') ?? '')
	const height = Number.parseFloat(attribute('height') ?? '')
	if (width > 0 && height > 0) return { width, height }
	return { width: RENDER_SIDE, height: RENDER_SIDE }
}

// The viewport an SVG renders in: its own shape, RENDER_SIDE on its long
// side.
export function svgViewport(size: { width: number; height: number }) {
	const scale = RENDER_SIDE / Math.max(size.width, size.height)
	return {
		width: Math.max(16, Math.round(size.width * scale)),
		height: Math.max(16, Math.round(size.height * scale)),
		deviceScaleFactor: 1,
	}
}

// A page that shows one SVG through <img>, which runs no script even in
// the rendering browser.
export function svgPage(svg: string) {
	const base64 = btoa(
		Array.from(new TextEncoder().encode(svg), (byte) =>
			String.fromCharCode(byte)
		).join('')
	)
	return `<!doctype html><html><body style="margin:0;height:100vh;background:#fff"><img alt="" src="data:image/svg+xml;base64,${base64}" style="display:block;width:100%;height:100%;object-fit:contain"></body></html>`
}
