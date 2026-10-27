import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/core'

export const ISSUE_LABEL = 'from-crew'
export const ISSUES_PER_RUN = 2
export const ISSUES_PER_DAY = 5
export const COMMENTS_PER_RUN = 3

export type GitHubIssue = { number: number; title: string; url: string }

// Null when the GitHub App secrets are not set: agents then get no
// GitHub tools at all.
export function githubFor(env: Env) {
	if (
		!env.GITHUB_APP_ID ||
		!env.GITHUB_APP_INSTALLATION_ID ||
		!env.GITHUB_APP_PRIVATE_KEY
	) {
		return null
	}
	if (env.GITHUB_APP_PRIVATE_KEY.includes('BEGIN RSA PRIVATE KEY')) {
		throw new Error(
			'GITHUB_APP_PRIVATE_KEY is in PKCS#1 format; Workers need PKCS#8 (apps/admin/README.md, "Filing GitHub issues")'
		)
	}
	const octokit = new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: env.GITHUB_APP_ID,
			installationId: env.GITHUB_APP_INSTALLATION_ID,
			privateKey: env.GITHUB_APP_PRIVATE_KEY,
		},
	})
	const [owner, repo] = env.GITHUB_REPO.split('/')

	return {
		async fileIssue(title: string, body: string): Promise<GitHubIssue> {
			const { data } = await octokit.request(
				'POST /repos/{owner}/{repo}/issues',
				{ owner, repo, title, body, labels: [ISSUE_LABEL] }
			)
			return { number: data.number, title: data.title, url: data.html_url }
		},
		async commentOnIssue(issueNumber: number, body: string) {
			const { data } = await octokit.request(
				'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
				{ owner, repo, issue_number: issueNumber, body }
			)
			return data.html_url
		},
		async issueState(issueNumber: number) {
			const { data } = await octokit.request(
				'GET /repos/{owner}/{repo}/issues/{issue_number}',
				{ owner, repo, issue_number: issueNumber }
			)
			return data.state
		},
	}
}

// Lower-cased, as findPersonalData compares them.
export type PeopleIndex = {
	usernames: Set<string>
	uids: Set<string>
}

const EMAIL_PATTERN = /[^\s@<>()"']+@[^\s@<>()"']+\.[^\s@<>()"']+/
const UUID_PATTERN =
	/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

// The repo is public, so an issue must not identify a Sunlo user. Returns
// a description of the first thing that would, or null when the text is
// clean.
export function findPersonalData(text: string, people: PeopleIndex) {
	const email = text.match(EMAIL_PATTERN)
	if (email) return `an email address (${email[0]})`
	for (const uuid of text.match(UUID_PATTERN) ?? []) {
		if (people.uids.has(uuid.toLowerCase())) return `a user id (${uuid})`
	}
	const lowered = text.toLowerCase()
	for (const username of people.usernames) {
		const pattern = new RegExp(
			`(^|[^\\p{L}\\p{N}])${escapeRegExp(username)}($|[^\\p{L}\\p{N}])`,
			'u'
		)
		if (pattern.test(lowered)) return `the username "${username}"`
	}
	return null
}

function escapeRegExp(text: string) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
