/**
 * Demo test helper functions
 * This file will be stripped from production builds by vite-plugin-strip-test-code
 */

export function demoExpect(value: any, expected: any, label?: string) {
	const prefix = label ? `[TEST: ${label}]` : '[TEST]'
	console.log(`${prefix} Checking:`, value, '===', expected)

	if (value !== expected) {
		throw new Error(
			`${prefix} Expected ${JSON.stringify(expected)} but got ${JSON.stringify(value)}`,
		)
	}

	console.log(`${prefix} ✓ Passed`)
}

export function demoExpectTruthy(value: any, label?: string) {
	const prefix = label ? `[TEST: ${label}]` : '[TEST]'
	console.log(`${prefix} Checking truthy:`, value)

	if (!value) {
		throw new Error(`${prefix} Expected truthy value but got ${JSON.stringify(value)}`)
	}

	console.log(`${prefix} ✓ Passed`)
}

// Expose to window for Playwright tests
if (typeof window !== 'undefined') {
	// @ts-expect-error - attaching to global window
	window.__demoTestHelpers = {
		demoExpect,
		demoExpectTruthy,
	}

	console.log('[TEST] Demo test helpers loaded and attached to window')
}
