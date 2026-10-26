import { describe, expect, it } from 'vitest'
import { findPersonalData, githubFor, type PeopleIndex } from './github'

const people: PeopleIndex = {
	usernames: new Set(['ana', 'garlicface', 'best frin']),
	uids: new Set(['cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18']),
}

describe('findPersonalData', () => {
	it('passes text that only has counts and patterns', () => {
		expect(
			findPersonalData(
				'3 of 4 new users stopped at the language picker on Oct 22.',
				people
			)
		).toBeNull()
	})

	it('catches any email address', () => {
		expect(findPersonalData('Reported by someone@example.com', people)).toMatch(
			/email address/
		)
	})

	it("catches a user's id, but not other ids", () => {
		expect(
			findPersonalData('uid CF1F69CE-10FA-4059-8FD4-3C6DCEF9BA18', people)
		).toMatch(/user id/)
		expect(
			findPersonalData('phrase 0b1c2d3e-0000-4000-8000-000000000000', people)
		).toBeNull()
	})

	it('catches a username as a whole word, in any case', () => {
		expect(findPersonalData('GarlicFace reviewed 9 cards', people)).toMatch(
			/garlicface/
		)
		expect(findPersonalData('then Best Frin stopped', people)).toMatch(
			/best frin/
		)
	})

	it('ignores a username inside another word', () => {
		expect(
			findPersonalData('the banana phrase has no translation', people)
		).toBeNull()
	})
})

describe('githubFor', () => {
	const env = {
		GITHUB_REPO: 'mhsnook/sunlo',
		GITHUB_APP_ID: '123',
		GITHUB_APP_INSTALLATION_ID: '456',
	} as unknown as Env

	it('is null until every GitHub App secret is set', () => {
		expect(githubFor(env)).toBeNull()
	})

	it('names the fix for a PKCS#1 key', () => {
		expect(() =>
			githubFor({
				...env,
				GITHUB_APP_PRIVATE_KEY:
					'-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----',
			})
		).toThrow(/PKCS#8/)
	})
})
