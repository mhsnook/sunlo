import { MAX_SVG_BYTES } from '../shared/crew'
import { toBase64 } from './images'

export type CheckedSvg =
	| { ok: true; svg: string; width: number; height: number }
	| { ok: false; error: string }

// The Content-Security-Policy an SVG is served with: a sandboxed document
// with no origin, which runs no script and loads nothing but its own styles
// and data: pictures.
export const SVG_POLICY =
	"sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:"

const RENDER_SIDE = 1024

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

// Lower case: SVG names are case-sensitive, but an HTML parser folds them,
// so the check compares them folded.
const ELEMENTS = new Set(
	[
		'svg',
		'g',
		'defs',
		'symbol',
		'use',
		'title',
		'desc',
		'metadata',
		'switch',
		'view',
		'a',
		'style',
		'path',
		'rect',
		'circle',
		'ellipse',
		'line',
		'polyline',
		'polygon',
		'text',
		'tspan',
		'textPath',
		'image',
		'linearGradient',
		'radialGradient',
		'stop',
		'pattern',
		'clipPath',
		'mask',
		'marker',
		'filter',
		'feBlend',
		'feColorMatrix',
		'feComponentTransfer',
		'feComposite',
		'feConvolveMatrix',
		'feDiffuseLighting',
		'feDisplacementMap',
		'feDistantLight',
		'feDropShadow',
		'feFlood',
		'feFuncA',
		'feFuncB',
		'feFuncG',
		'feFuncR',
		'feGaussianBlur',
		'feImage',
		'feMerge',
		'feMergeNode',
		'feMorphology',
		'feOffset',
		'fePointLight',
		'feSpecularLighting',
		'feSpotLight',
		'feTile',
		'feTurbulence',
		'animate',
		'animateMotion',
		'animateTransform',
		'set',
		'mpath',
	].map((name) => name.toLowerCase())
)

const ATTRIBUTES = new Set(
	[
		// Core and structure.
		'id',
		'class',
		'style',
		'lang',
		'tabindex',
		'role',
		'focusable',
		'version',
		'baseProfile',
		'viewBox',
		'preserveAspectRatio',
		'xmlns',
		'xmlns:xlink',
		'xml:space',
		'xml:lang',
		'href',
		'xlink:href',
		'xlink:title',
		// Geometry.
		'x',
		'y',
		'x1',
		'y1',
		'x2',
		'y2',
		'cx',
		'cy',
		'r',
		'rx',
		'ry',
		'fx',
		'fy',
		'fr',
		'width',
		'height',
		'd',
		'points',
		'pathLength',
		'transform',
		'transform-origin',
		'transform-box',
		// Text.
		'dx',
		'dy',
		'rotate',
		'textLength',
		'lengthAdjust',
		'startOffset',
		'method',
		'spacing',
		'side',
		// Paint servers, clips, masks and markers.
		'offset',
		'gradientUnits',
		'gradientTransform',
		'spreadMethod',
		'patternUnits',
		'patternContentUnits',
		'patternTransform',
		'clipPathUnits',
		'maskUnits',
		'maskContentUnits',
		'markerUnits',
		'markerWidth',
		'markerHeight',
		'refX',
		'refY',
		'orient',
		// Filters.
		'filterUnits',
		'primitiveUnits',
		'in',
		'in2',
		'result',
		'stdDeviation',
		'edgeMode',
		'mode',
		'operator',
		'k1',
		'k2',
		'k3',
		'k4',
		'type',
		'values',
		'tableValues',
		'slope',
		'intercept',
		'amplitude',
		'exponent',
		'kernelMatrix',
		'order',
		'divisor',
		'bias',
		'targetX',
		'targetY',
		'preserveAlpha',
		'surfaceScale',
		'diffuseConstant',
		'specularConstant',
		'specularExponent',
		'kernelUnitLength',
		'scale',
		'xChannelSelector',
		'yChannelSelector',
		'radius',
		'azimuth',
		'elevation',
		'pointsAtX',
		'pointsAtY',
		'pointsAtZ',
		'limitingConeAngle',
		'z',
		'baseFrequency',
		'numOctaves',
		'seed',
		'stitchTiles',
		// Animation.
		'attributeName',
		'attributeType',
		'begin',
		'dur',
		'end',
		'min',
		'max',
		'restart',
		'repeatCount',
		'repeatDur',
		'calcMode',
		'keyTimes',
		'keySplines',
		'keyPoints',
		'from',
		'to',
		'by',
		'additive',
		'accumulate',
		'path',
		// Presentation attributes.
		'alignment-baseline',
		'baseline-shift',
		'clip',
		'clip-path',
		'clip-rule',
		'color',
		'color-interpolation',
		'color-interpolation-filters',
		'color-rendering',
		'cursor',
		'direction',
		'display',
		'dominant-baseline',
		'enable-background',
		'fill',
		'fill-opacity',
		'fill-rule',
		'filter',
		'flood-color',
		'flood-opacity',
		'font',
		'font-family',
		'font-size',
		'font-size-adjust',
		'font-stretch',
		'font-style',
		'font-variant',
		'font-weight',
		'image-rendering',
		'letter-spacing',
		'lighting-color',
		'marker',
		'marker-end',
		'marker-mid',
		'marker-start',
		'mask',
		'mask-type',
		'mix-blend-mode',
		'opacity',
		'overflow',
		'paint-order',
		'pointer-events',
		'shape-rendering',
		'stop-color',
		'stop-opacity',
		'stroke',
		'stroke-dasharray',
		'stroke-dashoffset',
		'stroke-linecap',
		'stroke-linejoin',
		'stroke-miterlimit',
		'stroke-opacity',
		'stroke-width',
		'text-anchor',
		'text-decoration',
		'text-rendering',
		'unicode-bidi',
		'vector-effect',
		'visibility',
		'white-space',
		'word-spacing',
		'writing-mode',
	].map((name) => name.toLowerCase())
)

const LINK_ATTRIBUTES = new Set(['href', 'xlink:href'])
const ANIMATIONS = new Set(['animate', 'set', 'animatemotion'])
const SAFE_LINK = /^(#|data:image\/(png|jpeg|gif|webp);)/i
// XML knows only these entities without a DTD, and the check refuses a
// DTD, so anything else after & is either an error or an HTML-only entity
// such as &colon; that a browser would decode.
const ENTITY = /&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/giy
// A scheme at the start of a value or of a token in it: "https:",
// "data:", "url(ftp:". Whitespace was taken out of the scheme first.
const SCHEME = /(?:^|[\s,;("'])[a-z][a-z0-9+.-]*:/
const NAME = /[a-z_][\w.:-]*/iy
const ATTRIBUTE = /([a-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/iy

const decodeEntities = (text: string) =>
	text
		.replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
			String.fromCodePoint(Math.min(Number.parseInt(hex, 16), 0x10ffff))
		)
		.replace(/&#(\d+);/g, (_, decimal: string) =>
			String.fromCodePoint(Math.min(Number(decimal), 0x10ffff))
		)
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&')

// A browser drops tabs, newlines and control characters anywhere in a URL,
// so "java\tscript:" is still javascript:.
const unbroken = (text: string) =>
	Array.from(text.toLowerCase())
		.filter((char) => char.charCodeAt(0) > 0x1f && char !== '\u007f')
		.join('')
		.trim()

class Refused extends Error {}
function refuse(error: string): never {
	throw new Refused(error)
}

// Every & starts one of the entities XML knows.
function checkEntities(text: string) {
	for (let at = text.indexOf('&'); at !== -1; at = text.indexOf('&', at + 1)) {
		ENTITY.lastIndex = at
		if (!ENTITY.test(text)) {
			refuse(
				`Write a bare & as &amp;, and use only &amp; &lt; &gt; &quot; &apos; and numeric entities: ${text.slice(at, at + 20)}`
			)
		}
	}
}

// Each url() in CSS, or in a presentation attribute such as
// fill="url(#g)", reads its argument as CSS does, quotes and all.
function checkCssUrls(css: string) {
	const lower = css.toLowerCase()
	for (
		let at = lower.indexOf('url(');
		at !== -1;
		at = lower.indexOf('url(', at + 4)
	) {
		let end = at + 4
		while (/\s/.test(css[end] ?? '')) end++
		let link: string
		const quote = css[end]
		if (quote === '"' || quote === "'") {
			const close = css.indexOf(quote, end + 1)
			if (close === -1) refuse('A CSS url() has no closing quote.')
			link = css.slice(end + 1, close)
		} else {
			const close = css.indexOf(')', end)
			link = css.slice(end, close === -1 ? undefined : close)
		}
		if (!SAFE_LINK.test(unbroken(link))) {
			refuse(
				`CSS url() in an SVG points inside it (#id) or holds a data:image; this one does not: ${link.slice(0, 80)}`
			)
		}
	}
}

function checkCss(css: string) {
	if (css.includes('\\')) {
		refuse('Leave out backslash escapes in CSS.')
	}
	const lower = unbroken(css)
	if (lower.includes('@import')) refuse('Leave out CSS @import.')
	if (lower.includes('image-set')) refuse('Leave out CSS image-set().')
	checkCssUrls(css)
}

function checkAttribute(element: string, name: string, raw: string) {
	const attribute = name.toLowerCase()
	if (attribute.startsWith('on')) {
		refuse('Leave out event-handler attributes such as onload and onclick.')
	}
	if (!ATTRIBUTES.has(attribute) && !/^(data|aria)-[\w.-]+$/.test(attribute)) {
		refuse(
			`Leave out the ${name} attribute on <${element}>: an SVG here keeps to drawing attributes, without editor metadata.`
		)
	}
	checkEntities(raw)
	const value = decodeEntities(raw)
	if (attribute === 'xmlns' && value !== SVG_NAMESPACE) {
		refuse(`The xmlns of an SVG here is ${SVG_NAMESPACE}.`)
	}
	if (attribute === 'xmlns:xlink') {
		if (value !== XLINK_NAMESPACE) {
			refuse(`xmlns:xlink is ${XLINK_NAMESPACE}.`)
		}
		return
	}
	if (attribute === 'xmlns') return
	if (attribute === 'style') {
		checkCss(value)
		return
	}
	const link = unbroken(value)
	if (LINK_ATTRIBUTES.has(attribute)) {
		if (link && !SAFE_LINK.test(link)) {
			refuse(
				`Links in an SVG point inside it (#id) or hold a data:image; this one does not: ${value.slice(0, 80)}`
			)
		}
		return
	}
	if (
		attribute === 'attributename' &&
		ANIMATIONS.has(element.toLowerCase()) &&
		/^(xlink:)?href$/.test(link)
	) {
		refuse(`Leave out <${element}> that changes a link.`)
	}
	if (value.includes('\\')) {
		refuse(`Leave out backslashes in the ${name} attribute.`)
	}
	checkCssUrls(value)
	if (SCHEME.test(link)) {
		refuse(
			`Leave out URLs in attributes (only href takes a link, to #id or a data:image): ${name}="${value.slice(0, 80)}"`
		)
	}
}

type Parsed = { root: Record<string, string> }

// Reads the document as XML, strictly: anything it cannot read, it refuses.
// That makes the result the same whether a browser parses the SVG as XML
// (opened on its own) or as HTML (pasted into a page).
function parse(svg: string): Parsed {
	let at = 0
	const stack: Array<string> = []
	let root: Record<string, string> | null = null
	let rootClosed = false
	let styleText: Array<string> | null = null
	const skipSpace = () => {
		while (/\s/.test(svg[at] ?? '')) at++
	}
	const text = (end: number) => {
		const chunk = svg.slice(at, end)
		if (rootClosed || !root) {
			if (chunk.trim()) refuse('An SVG starts with <svg> and ends with </svg>.')
		} else {
			checkEntities(chunk)
			styleText?.push(decodeEntities(chunk))
		}
		at = end
	}
	while (at < svg.length) {
		const open = svg.indexOf('<', at)
		if (open === -1) {
			text(svg.length)
			break
		}
		text(open)
		if (svg.startsWith('<!--', at)) {
			const end = svg.indexOf('-->', at + 4)
			// An HTML parser ends a comment early at <!--> or --!>, so a
			// comment that holds -- or starts with > reads differently there.
			if (end === -1 || /^-?>|--/.test(svg.slice(at + 4, end))) {
				refuse('Close each comment with --> and leave -- out of it.')
			}
			at = end + 3
			continue
		}
		if (svg.startsWith('<![CDATA[', at)) {
			const end = svg.indexOf(']]>', at)
			if (end === -1 || !root || rootClosed) {
				refuse('Keep CDATA sections inside <svg> and close them with ]]>.')
			}
			styleText?.push(svg.slice(at + 9, end))
			at = end + 3
			continue
		}
		if (svg.startsWith('<?', at)) {
			const end = svg.indexOf('?>', at)
			if (
				at !== 0 ||
				end === -1 ||
				!/^<\?xml\s+version\s*=/.test(svg.slice(0, end))
			) {
				refuse(
					'Leave out processing instructions; an SVG may start with <?xml version="1.0"?> and nothing else.'
				)
			}
			at = end + 2
			continue
		}
		if (svg.startsWith('<!', at)) {
			refuse('Leave out DOCTYPE and ENTITY declarations.')
		}
		if (svg.startsWith('</', at)) {
			at += 2
			NAME.lastIndex = at
			const name = NAME.exec(svg)?.[0]
			if (!name || name !== stack.at(-1)) {
				refuse(`</${name ?? ''}> does not close the element open there.`)
			}
			at += name.length
			skipSpace()
			if (svg[at] !== '>') refuse(`</${name}> has no >.`)
			at++
			stack.pop()
			if (name.toLowerCase() === 'style') styleText = finishStyle(styleText)
			if (!stack.length) rootClosed = true
			continue
		}
		at++
		NAME.lastIndex = at
		const name = NAME.exec(svg)?.[0]
		if (!name) refuse(`I cannot read the tag at: ${svg.slice(at - 1, at + 30)}`)
		if (rootClosed || (!root && name.toLowerCase() !== 'svg')) {
			refuse('An SVG starts with <svg> and ends with </svg>.')
		}
		if (name.includes(':') || !ELEMENTS.has(name.toLowerCase())) {
			refuse(
				`Leave out <${name}>: an SVG here holds drawing elements only, with no script and no other documents.`
			)
		}
		if (styleText) refuse(`<style> holds CSS only, not <${name}>.`)
		at += name.length
		const attributes = new Map<string, string>()
		let selfClosing = false
		let separated = false
		for (;;) {
			const before = at
			skipSpace()
			if (at > before) separated = true
			if (svg.startsWith('/>', at)) {
				selfClosing = true
				at += 2
				break
			}
			if (svg[at] === '>') {
				at++
				break
			}
			// An HTML parser reads a slash between attributes as a space.
			if (svg[at] === '/') {
				at++
				separated = true
				continue
			}
			ATTRIBUTE.lastIndex = at
			const match = ATTRIBUTE.exec(svg)
			if (!match || !separated) {
				refuse(
					`I cannot read the attributes of <${name}>; quote every value: ${svg.slice(at, at + 40)}`
				)
			}
			const [whole, attribute, double, single] = match
			const raw = double ?? single
			if (attributes.has(attribute.toLowerCase())) {
				refuse(`<${name}> has ${attribute} twice.`)
			}
			checkAttribute(name, attribute, raw)
			attributes.set(attribute.toLowerCase(), decodeEntities(raw))
			at += whole.length
			separated = false
		}
		root ??= Object.fromEntries(attributes)
		if (selfClosing) {
			if (!stack.length) rootClosed = true
		} else {
			stack.push(name)
			if (name.toLowerCase() === 'style') styleText = []
		}
	}
	if (!root || !rootClosed) {
		refuse('An SVG starts with <svg> and ends with </svg>.')
	}
	return { root: root }
}

function finishStyle(css: Array<string> | null) {
	checkCss((css ?? []).join(''))
	return null
}

// An SVG the room can keep and the app can show: one <svg> document of
// drawing elements and attributes, with no script, no event handlers, and no
// links to other files. It refuses rather than repairs, and says what to
// fix. The app also shows an SVG only through <img>, which runs no script;
// this check is the layer that holds when someone opens one on its own.
export function checkSvg(input: string): CheckedSvg {
	const svg = input
		.trim()
		.replace(/^((?:<\?xml[^>]*\?>)?\s*)<!DOCTYPE[^>[]*>/i, '$1')
	if (new TextEncoder().encode(svg).length > MAX_SVG_BYTES) {
		return {
			ok: false,
			error: `That SVG is over ${MAX_SVG_BYTES / 1_000_000} MB. Simplify its paths.`,
		}
	}
	// The parse refuses HTML-only entities such as &colon;; decoding them
	// here first names the link they hide.
	const squeezed = unbroken(
		decodeEntities(svg)
			.replace(/&colon;/gi, ':')
			.replace(/&tab;|&newline;/gi, '')
	).replace(/\s+/g, '')
	for (const scheme of ['javascript:', 'vbscript:', 'data:text/html']) {
		if (squeezed.includes(scheme)) {
			return { ok: false, error: `Leave out ${scheme} links.` }
		}
	}
	try {
		const { root } = parse(svg)
		return { ok: true, svg, ...sizeOf(root) }
	} catch (error) {
		if (error instanceof Refused) return { ok: false, error: error.message }
		throw error
	}
}

function sizeOf(root: Record<string, string>) {
	const box = root.viewbox
		?.trim()
		.split(/[\s,]+/)
		.map(Number)
	if (box?.length === 4 && box[2] > 0 && box[3] > 0) {
		return { width: box[2], height: box[3] }
	}
	const width = Number.parseFloat(root.width ?? '')
	const height = Number.parseFloat(root.height ?? '')
	if (width > 0 && height > 0) return { width, height }
	return { width: RENDER_SIDE, height: RENDER_SIDE }
}

export function svgSize(svg: string): { width: number; height: number } {
	const tag = /<svg(?:[^>"']|"[^"]*"|'[^']*')*>/i.exec(svg)?.[0] ?? ''
	const root: Record<string, string> = {}
	for (const [, name, double, single] of tag.matchAll(
		/\s([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
	)) {
		root[name.toLowerCase()] = double ?? single
	}
	return sizeOf(root)
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
	const base64 = toBase64(new TextEncoder().encode(svg))
	return `<!doctype html><html><body style="margin:0;height:100vh;background:#fff"><img alt="" src="data:image/svg+xml;base64,${base64}" style="display:block;width:100%;height:100%;object-fit:contain"></body></html>`
}
