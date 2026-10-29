import { describe, expect, it } from 'vitest'
import { endsWithEllipsis, handleOf, mentionedCrew } from '../../shared/crew'
import { crew, displayName } from '../../shared/crew'
import { clefPrompt, parseClefReply } from './clef'

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

describe('clefPrompt', () => {
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
