import { describe, expect, it } from 'vitest'
import { githubHref, parseRef } from './refs'

describe('parseRef', () => {
	it('reads a document link and a GitHub reference', () => {
		expect(parseRef('doc:3')).toEqual({ kind: 'doc', id: 3 })
		expect(parseRef(githubHref(854))).toEqual({ kind: 'github', number: 854 })
	})

	it('leaves an ordinary URL alone', () => {
		expect(parseRef('https://github.com/mhsnook/sunlo/pull/854')).toBe(null)
		expect(parseRef('github:')).toBe(null)
		expect(parseRef('github:85x')).toBe(null)
	})
})
