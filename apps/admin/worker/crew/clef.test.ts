import { describe, expect, it } from 'vitest'
import {
	endsWithEllipsis,
	fixedRouting,
	handleOf,
	mentionedCrew,
	mentionsEveryone,
} from '../../shared/crew'
import { crew, displayName } from '../../shared/crew'
import { clefPrompt, parseClefReply, toEveryone } from './clef'

describe('the fixed CLEF rules', () => {
	it.each(['more coming...', 'more coming…', 'more coming...  '])(
		'treats %j as stacked',
		(text) => expect(endsWithEllipsis(text)).toBe(true)
	)

	it('does not stack an ellipsis in the middle', () => {
		expect(endsWithEllipsis('well... ok')).toBe(false)
	})

	it('finds crew mentions by name, in roster order, ignoring case and strangers', () => {
		const learnership = handleOf('learnership-1').toUpperCase()
		expect(
			mentionedCrew(`@${learnership} and @${handleOf('command-2')}, ask @em`)
		).toEqual(['command-2', 'learnership-1'])
	})

	it('reads a seat key as its agent', () => {
		expect(mentionedCrew('over to @product-1.')).toEqual(['product-1'])
	})

	it('reads a room’s name as the officer who runs it', () => {
		expect(mentionedCrew('@Library and @product')).toEqual([
			'product-1',
			'library-1',
		])
		expect(
			mentionedCrew(`@command, and @${handleOf('command-1')} again`)
		).toEqual(['command-1'])
	})

	it('reads a name with an apostrophe, its handle, and a possessive', () => {
		const withApostrophe = crew['product-1'].name
		expect(withApostrophe).toMatch(/'/)
		expect(mentionedCrew(`ask @${withApostrophe}`)).toEqual(['product-1'])
		expect(mentionedCrew(`ask @${handleOf('product-1')}`)).toEqual([
			'product-1',
		])
		expect(
			mentionedCrew(`@${handleOf('product-2')}'s view, and @library’s`)
		).toEqual(['product-2', 'library-1'])
	})

	it.each(['@channel', '@crew', '@everyone', '@all', '@All:', "@everyone's"])(
		'reads %j as a message to everyone',
		(handle) => {
			expect(mentionsEveryone(`${handle} what is next?`)).toBe(true)
			expect(fixedRouting(`${handle} what is next?`)).toBeNull()
		}
	)

	it.each(['hey everyone', 'sam@all.io', '@allison', '@all-hands', 'crew'])(
		'does not read %j as an @everyone',
		(text) => expect(mentionsEveryone(text)).toBe(false)
	)

	it('leaves the agents of an @everyone to CLEF, even beside a name', () => {
		expect(fixedRouting(`@everyone and @${handleOf('command-2')}`)).toBeNull()
	})

	it('stacks an @everyone that ends in an ellipsis', () => {
		expect(fixedRouting('@everyone more coming...')?.kind).toBe('stack')
	})

	it('does not read the domain of an email address as a mention', () => {
		expect(
			mentionedCrew(`write to sam@product.io and @${handleOf('command-2')}`)
		).toEqual(['command-2'])
	})
})

describe('parseClefReply', () => {
	it('reads a room’s name as the officer who runs it', () => {
		expect(
			parseClefReply('{"kind":"route","agents":["product"]}', [
				'command-1',
				'product-1',
			])
		).toEqual({ kind: 'route', agents: ['product-1'], by: 'model' })
	})

	it('routes to the named active agents', () => {
		expect(
			parseClefReply('{"kind":"route","agents":["product-1"]}', ['product-1'])
		).toEqual({ kind: 'route', agents: ['product-1'], by: 'model' })
	})

	it('reads JSON wrapped in prose', () => {
		expect(
			parseClefReply('Sure: {"kind":"room","agents":[]} done', ['product-1'])
		).toEqual({ kind: 'room', agents: [], by: 'model' })
	})

	it('accepts an already-parsed object', () => {
		expect(
			parseClefReply({ kind: 'route', agents: ['product-1'] }, ['product-1'])
				.kind
		).toBe('route')
	})

	it('drops agents that are not active, and routes to the only active one', () => {
		expect(
			parseClefReply('{"kind":"route","agents":["library"]}', ['product-1'])
		).toEqual({ kind: 'route', agents: ['product-1'], by: 'model' })
	})

	it('sends a message the model gives to several agents to the Command room’s principal alone', () => {
		expect(
			parseClefReply(
				'{"kind":"route","agents":["command-1","command-2","product-1"]}',
				['command-1', 'command-2', 'product-1']
			)
		).toEqual({ kind: 'route', agents: ['command-1'], by: 'model' })
		expect(
			parseClefReply('{"kind":"route","agents":["command-2","product-1"]}', [
				'command-1',
				'command-2',
				'product-1',
			])
		).toEqual({ kind: 'route', agents: ['command-1'], by: 'model' })
	})

	it('sends a route to an agent it cannot wake to the Command room’s principal', () => {
		expect(
			parseClefReply('{"kind":"route","agents":["library"]}', [
				'command-1',
				'product-1',
			])
		).toEqual({ kind: 'route', agents: ['command-1'], by: 'model' })
	})

	it('keeps one clear agent', () => {
		expect(
			parseClefReply('{"kind":"route","agents":["command-2"]}', [
				'command-1',
				'command-2',
			])
		).toEqual({ kind: 'route', agents: ['command-2'], by: 'model' })
	})

	it('wakes every active agent an "everyone" names, in roster order', () => {
		expect(
			parseClefReply(
				'{"kind":"everyone","agents":["product-1","command-2","library-1","product"]}',
				['command-1', 'command-2', 'product-1']
			)
		).toEqual({
			kind: 'everyone',
			agents: ['command-2', 'product-1'],
			by: 'model',
		})
	})

	it('keeps one agent of an "everyone" without the fallback', () => {
		expect(
			parseClefReply('{"kind":"everyone","agents":["product-2"]}', [
				'command-1',
				'product-2',
			])
		).toEqual({ kind: 'everyone', agents: ['product-2'], by: 'model' })
	})

	it('leaves an "everyone" that names nobody active in the room', () => {
		for (const reply of [
			'{"kind":"everyone","agents":[]}',
			'{"kind":"everyone","agents":["library-1"]}',
			'{"kind":"everyone"}',
		]) {
			expect(parseClefReply(reply, ['command-1', 'product-1'])).toEqual({
				kind: 'room',
				agents: [],
				by: 'model',
			})
		}
	})

	it('reads a route for an @everyone as the agents it names, with no fallback', () => {
		expect(
			parseClefReply(
				'{"kind":"route","agents":["command-2","product-1"]}',
				['command-1', 'command-2', 'product-1'],
				true
			)
		).toEqual({
			kind: 'everyone',
			agents: ['command-2', 'product-1'],
			by: 'model',
		})
		expect(
			parseClefReply('{"kind":"room","agents":[]}', ['command-1'], true)
		).toEqual({ kind: 'room', agents: [], by: 'model' })
	})

	it('leaves anything unclear in the room', () => {
		for (const reply of [undefined, 'no idea', '{"kind":"maybe"}', '{bad']) {
			expect(parseClefReply(reply, ['product-1'])).toEqual({
				kind: 'room',
				agents: [],
				by: 'model',
			})
		}
	})
})

describe('toEveryone', () => {
	it('wakes the agents CLEF names and the ones the message names', () => {
		expect(
			toEveryone(
				{ kind: 'everyone', agents: ['product-1'], by: 'model' },
				`@everyone, and @${handleOf('command-2')}?`
			)
		).toEqual({
			kind: 'everyone',
			agents: ['command-2', 'product-1'],
			by: 'model',
		})
	})

	it('leaves an @everyone CLEF needs nobody for in the room', () => {
		expect(
			toEveryone({ kind: 'room', agents: [], by: 'model' }, '@all fyi')
		).toEqual({ kind: 'room', agents: [], by: 'model' })
	})
})

describe('clefPrompt', () => {
	it('offers the "everyone" kind, and asks for it on an @everyone', () => {
		const plain = clefPrompt('hi all', ['command-1', 'product-1'], [])[0]
		expect(plain.content).toContain('- "everyone":')
		expect(plain.content).toContain(
			'{"kind":"everyone","agents":["command-1","product-1"]}'
		)
		expect(plain.content).toContain('A "route" names exactly one agent.')
		expect(plain.content).not.toContain('reply "everyone"')
		const forced = clefPrompt('@all hi', ['product-1'], [], true)[0]
		expect(forced.content).toContain(
			'This message is written to the whole team: reply "everyone".'
		)
	})

	it('replays an "everyone" correction as its reply', () => {
		const messages = clefPrompt(
			'team, thoughts?',
			['command-1', 'product-1'],
			[
				{
					text: 'hey everyone, numbers?',
					routing: { kind: 'everyone', agents: ['command-2', 'product-1'] },
				},
			]
		)
		expect(messages[2].content).toBe(
			'{"kind":"everyone","agents":["command-2","product-1"]}'
		)
	})

	it('puts corrections between the instructions and the message', () => {
		const messages = clefPrompt(
			'what next?',
			['product-1'],
			[{ text: 'note to self', routing: { kind: 'room', agents: [] } }]
		)
		expect(messages.map((m) => m.role)).toEqual([
			'system',
			'user',
			'assistant',
			'user',
		])
		expect(messages[0].content).toContain(
			`"product-1" (${displayName('product-1')}, Product manager)`
		)
		expect(messages[2].content).toBe('{"kind":"room","agents":[]}')
		expect(messages.at(-1)?.content).toBe('what next?')
	})
})
