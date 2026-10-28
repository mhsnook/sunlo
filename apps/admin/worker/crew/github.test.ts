import { describe, expect, it } from 'vitest'
import type { GithubDraftType } from '../../shared/crew'
import {
	describeIssueEdit,
	describeMilestoneEdit,
	draftText,
	filingReport,
	findPersonalData,
	githubClient,
	githubFor,
	ISSUE_LABEL,
	type PeopleIndex,
} from './github'

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

// Records each request and answers with what `reply` returns for its route.
function fakeGithub(reply: (route: string) => unknown) {
	const calls: Array<{ route: string; params: Record<string, unknown> }> = []
	const request = (route: string, params: Record<string, unknown>) => {
		calls.push({ route, params })
		return Promise.resolve({ data: reply(route) })
	}
	return {
		calls,
		client: githubClient(
			request as unknown as Parameters<typeof githubClient>[0],
			'mhsnook/sunlo'
		),
	}
}

const epic: GithubDraftType = {
	type: 'issue',
	title: 'Onboarding that keeps people',
	body: '- [ ] Ask for a username first\n- [ ] Start a deck in one tap',
	labels: ['epic'],
	milestone: 4,
	milestoneTitle: 'November',
}

describe('githubClient', () => {
	it('files an issue with the crew label and its milestone', async () => {
		const { calls, client } = fakeGithub(() => ({
			number: 900,
			title: epic.type === 'issue' ? epic.title : '',
			html_url: 'https://github.com/mhsnook/sunlo/issues/900',
		}))
		expect(await client.file(epic)).toEqual({
			number: 900,
			title: 'Onboarding that keeps people',
			url: 'https://github.com/mhsnook/sunlo/issues/900',
		})
		expect(calls[0].route).toBe('POST /repos/{owner}/{repo}/issues')
		expect(calls[0].params).toMatchObject({
			owner: 'mhsnook',
			repo: 'sunlo',
			labels: ['epic', ISSUE_LABEL],
			milestone: 4,
		})
	})

	it('files a milestone with its due date as a timestamp', async () => {
		const { calls, client } = fakeGithub(() => ({
			number: 5,
			title: 'December',
			html_url: 'https://github.com/mhsnook/sunlo/milestone/5',
		}))
		await client.file({
			type: 'milestone',
			title: 'December',
			description: 'Retention work',
			dueOn: '2026-12-20',
		})
		expect(calls[0].params).toMatchObject({
			title: 'December',
			due_on: '2026-12-20T12:00:00Z',
		})
	})

	it('reads a pull request as an issue, and says whether it merged', async () => {
		const { client } = fakeGithub(() => [
			{
				number: 812,
				title: 'Onboarding',
				state: 'closed',
				html_url: 'https://github.com/mhsnook/sunlo/pull/812',
				updated_at: '2026-10-28T09:00:00Z',
				labels: [{ name: 'epic' }, 'admin'],
				milestone: { number: 4, title: 'November' },
				pull_request: { merged_at: '2026-10-28T09:00:00Z' },
			},
		])
		const [pull] = await client.issues({ since: '2026-10-27T07:00:00Z' })
		expect(pull).toMatchObject({
			labels: ['epic', 'admin'],
			milestone: { number: 4, title: 'November' },
			pullRequest: { merged: true },
		})
	})
})

describe('filingReport', () => {
	const result = {
		number: 900,
		title: 'Onboarding that keeps people',
		url: 'https://github.com/mhsnook/sunlo/issues/900',
	}

	it('says the draft was filed as written', () => {
		const text = filingReport({ drafted: epic, filed: epic, result, by: 'sam' })
		expect(text).toContain('as you wrote it')
		expect(text).toContain('#900')
		expect(text).not.toContain('Your draft:')
	})

	it('gives both versions when the admin changed the draft', () => {
		const filed = { ...epic, title: 'Keep new learners' }
		const text = filingReport({ drafted: epic, filed, result, by: 'sam' })
		expect(text).toContain('after changing it')
		expect(text).toContain('"title": "Onboarding that keeps people"')
		expect(text).toContain('"title": "Keep new learners"')
		expect(text).toContain('note_writing_style')
	})
})

describe('the receipt lines', () => {
	it('names each part of an issue the edit changed', () => {
		expect(
			describeIssueEdit(812, { body: 'x', milestone: 4 }, 'November')
		).toBe('edited #812: body; to milestone "November"')
		expect(describeIssueEdit(812, { state: 'closed', labels: [] }, null)).toBe(
			'edited #812: labels to none; closed it'
		)
	})

	it('names each part of a milestone the edit changed', () => {
		expect(
			describeMilestoneEdit('November', {
				dueOn: '2026-11-30',
				state: 'closed',
			})
		).toBe('edited milestone "November": due 2026-11-30; closed it')
	})
})

describe('draftText', () => {
	it('checks every published field, labels included', () => {
		const found = findPersonalData(
			draftText({ ...epic, labels: ['epic', 'garlicface'] }),
			people
		)
		expect(found).toMatch(/garlicface/)
		expect(findPersonalData(draftText(epic), people)).toBeNull()
	})
})
