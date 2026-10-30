import { describe, expect, it } from 'vitest'
import { MAX_SVG_BYTES } from '../shared/crew'
import { checkSvg, svgPage, svgSize, svgViewport } from './svg'

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="g"><stop offset="0" stop-color="#f60"/></linearGradient></defs><style>.a{fill:url(#g)}</style><path class="a" d="M2 2h20v20H2z"/><use href="#g"/><text x="2" y="20">Bonjour &#8212; ok</text></svg>`

const refusal = (svg: string) => {
	const checked = checkSvg(svg)
	return checked.ok ? null : checked.error
}

describe('checkSvg', () => {
	it('keeps a clean SVG, with its size', () => {
		expect(checkSvg(icon)).toEqual({
			ok: true,
			svg: icon,
			width: 24,
			height: 24,
		})
	})

	it('keeps an XML declaration and strips a plain DOCTYPE', () => {
		const checked = checkSvg(
			`<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n${icon}`
		)
		expect(checked.ok && checked.svg).toBe(`<?xml version="1.0"?>\n\n${icon}`)
	})

	it('keeps an embedded raster picture', () => {
		expect(
			checkSvg(
				'<svg viewBox="0 0 2 2"><image href="data:image/png;base64,AAAA" width="2" height="2"/></svg>'
			).ok
		).toBe(true)
	})

	it('refuses anything that is not one <svg> document', () => {
		expect(refusal('<html><svg></svg></html>')).toContain('starts with <svg>')
		expect(refusal('<svg></svg><script>x</script>')).not.toBeNull()
		expect(refusal('hello')).not.toBeNull()
	})

	it('refuses script, in any case and namespace', () => {
		for (const svg of [
			'<svg><script>alert(1)</script></svg>',
			'<svg><SCRIPT href="x.js"/></svg>',
			'<svg><svg:script>alert(1)</svg:script></svg>',
		]) {
			expect(refusal(svg)).toContain('<')
		}
	})

	it('refuses embedded documents', () => {
		expect(
			refusal(
				'<svg><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject></svg>'
			)
		).toContain('foreignObject')
		expect(refusal('<svg><iframe src="x"/></svg>')).toContain('iframe')
	})

	it('refuses event handlers, however they are spaced', () => {
		for (const svg of [
			'<svg onload="alert(1)"></svg>',
			'<svg><rect width="1" ONCLICK = "x()"/></svg>',
			'<svg><rect/onmouseover="x()"/></svg>',
			'<svg><animate onbegin="x()"/></svg>',
		]) {
			expect(refusal(svg)).toContain('event-handler')
		}
	})

	it('refuses javascript: links, even disguised', () => {
		for (const svg of [
			'<svg><a href="javascript:alert(1)"><text>x</text></a></svg>',
			'<svg><a xlink:href="JaVaScRiPt:alert(1)"/></svg>',
			'<svg><a href="java&#x09;script:alert(1)"/></svg>',
			'<svg><a href="&#106;avascript:alert(1)"/></svg>',
			'<svg><a href="javascript&colon;alert(1)"/></svg>',
			'<svg><set attributeName="href" to="javascript:alert(1)"/></svg>',
		]) {
			expect(refusal(svg)).toContain('javascript:')
		}
	})

	it('refuses links to other files and other documents', () => {
		expect(
			refusal('<svg><image href="https://evil.example/x.png"/></svg>')
		).toContain('Links in an SVG')
		expect(
			refusal('<svg><image href="data:image/svg+xml;base64,AAAA"/></svg>')
		).toContain('Links in an SVG')
		expect(
			refusal('<svg><rect style="fill:url(https://evil.example/x)"/></svg>')
		).toContain('CSS url()')
		expect(refusal('<svg><style>@import "x.css";</style></svg>')).toContain(
			'@import'
		)
		expect(refusal('<svg><a href="data:text/html,<b>x</b>"/></svg>')).toContain(
			'data:text/html'
		)
	})

	it('refuses entity declarations', () => {
		expect(
			refusal('<!DOCTYPE svg [<!ENTITY x "y">]><svg>&x;</svg>')
		).not.toBeNull()
	})

	it('refuses an SVG that is too big', () => {
		const big = `<svg>${' '.repeat(MAX_SVG_BYTES)}</svg>`
		expect(refusal(big)).toContain('KB')
	})
})

describe('svgSize', () => {
	it('reads the viewBox first, then width and height', () => {
		expect(
			svgSize('<svg viewBox="0 0 300 150" width="10" height="10">')
		).toEqual({ width: 300, height: 150 })
		expect(svgSize('<svg width="64px" height="32">')).toEqual({
			width: 64,
			height: 32,
		})
		expect(svgSize('<svg>')).toEqual({ width: 1024, height: 1024 })
	})
})

describe('svgViewport and svgPage', () => {
	it('renders at 1024 on the long side, in the SVG’s shape', () => {
		expect(svgViewport({ width: 300, height: 150 })).toEqual({
			width: 1024,
			height: 512,
			deviceScaleFactor: 1,
		})
	})

	it('shows the SVG through <img>, never inline', () => {
		const page = svgPage(icon)
		expect(page).toContain('<img alt="" src="data:image/svg+xml;base64,')
		expect(page).not.toContain('<svg')
	})
})
