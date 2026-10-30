import puppeteer, {
	type Browser,
	type BrowserWorker,
} from '@cloudflare/puppeteer'

export const frames = {
	phone: { width: 390, height: 844, deviceScaleFactor: 2 },
	desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
} as const
export type Frame = keyof typeof frames

export type Shot = { image: Uint8Array; mimeType: 'image/png' | 'image/jpeg' }
export type Page = { url: string } | { html: string }

// A Durable Object row holds at most 2 MB.
const MAX_PNG_BYTES = 1_800_000
const LOAD_TIMEOUT_MS = 20_000

// One browser session for every shot, closed when they are done. Each page
// is one viewport of `frame`, not the whole scrolling page.
export async function screenshots(
	binding: BrowserWorker,
	shots: Array<{ page: Page; frame: Frame }>
): Promise<Array<Shot>> {
	const browser = await puppeteer.launch(binding)
	try {
		return await Promise.all(shots.map((shot) => screenshot(browser, shot)))
	} finally {
		await browser.close()
	}
}

async function screenshot(
	browser: Browser,
	{ page: target, frame }: { page: Page; frame: Frame }
): Promise<Shot> {
	const page = await browser.newPage()
	try {
		await page.setViewport(frames[frame])
		const options = {
			waitUntil: 'networkidle0',
			timeout: LOAD_TIMEOUT_MS,
		} as const
		if ('url' in target) await page.goto(target.url, options)
		else await page.setContent(target.html, options)
		const png = await page.screenshot({ type: 'png' })
		if (png.byteLength <= MAX_PNG_BYTES) {
			return { image: png, mimeType: 'image/png' }
		}
		const jpeg = await page.screenshot({ type: 'jpeg', quality: 85 })
		return { image: jpeg, mimeType: 'image/jpeg' }
	} finally {
		await page.close()
	}
}

export const toBase64 = (bytes: Uint8Array) => {
	let binary = ''
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
	}
	return btoa(binary)
}
