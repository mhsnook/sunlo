import { describe, expect, it } from 'vitest'
import { documentHref } from '../../shared/crew'
import { githubHref, parseRef } from './refs'

describe('parseRef', () => {
	it('reads a document link and a GitHub reference', () => {
		expect(parseRef(documentHref(3))).toEqual({ kind: 'doc', id: 3 })
		expect(parseRef('DOC:12')).toEqual({ kind: 'doc', id: 12 })
		expect(parseRef(githubHref(854))).toEqual({ kind: 'github', number: 854 })
	})

	it('leaves an ordinary URL, and a target that is not an id, alone', () => {
		expect(parseRef('https://sunlo.app/doc:3')).toBe(null)
		expect(parseRef('/room/product')).toBe(null)
		expect(parseRef('doc:')).toBe(null)
		expect(parseRef('doc:roadmap')).toBe(null)
		expect(parseRef('doc:3x')).toBe(null)
		expect(parseRef('github:85x')).toBe(null)
	})
})
