import { describe, expect, it } from 'vitest'
import { endsWithEllipsis, mentionedCrew } from '../../shared/crew'
import { clefPrompt, parseClefReply } from './clef'

describe('the fixed CLEF rules', () => {
	it.each(['more coming...', 'more coming…', 'more coming...  '])(
		'treats %j as stacked',
		(text) => expect(endsWithEllipsis(text)).toBe(true)
	)

	it('does not stack an ellipsis in the middle', () => {
		expect(endsWithEllipsis('well... ok')).toBe(false)
	})

	it('finds crew mentions in roster order, ignoring case and strangers', () => {
		expect(mentionedCrew('@Monitor and @product, ask @em')).toEqual([
			'product',
			'monitor',
		])
	})

	it('does not read the domain of an email address as a mention', () => {
		expect(mentionedCrew('write to sam@product.io and @data')).toEqual(['data'])
	})
})

describe('parseClefReply', () => {
	it('routes to the named active agents', () => {
		expect(
			parseClefReply('{"kind":"route","agents":["product"]}', ['product'])
		).toEqual({ kind: 'route', agents: ['product'], by: 'model' })
	})

	it('reads JSON wrapped in prose', () => {
		expect(
			parseClefReply('Sure: {"kind":"room","agents":[]} done', ['product'])
		).toEqual({ kind: 'room', agents: [], by: 'model' })
	})

	it('accepts an already-parsed object', () => {
		expect(
			parseClefReply({ kind: 'route', agents: ['product'] }, ['product']).kind
		).toBe('route')
	})

	it('drops agents that are not active, and routes to the only active one', () => {
		expect(
			parseClefReply('{"kind":"route","agents":["library"]}', ['product'])
		).toEqual({ kind: 'route', agents: ['product'], by: 'model' })
	})

	it('sends a message the model gives to several agents to Riker alone', () => {
		expect(
			parseClefReply('{"kind":"route","agents":["riker","data","product"]}', [
				'riker',
				'data',
				'product',
			])
		).toEqual({ kind: 'route', agents: ['riker'], by: 'model' })
		expect(
			parseClefReply('{"kind":"route","agents":["data","product"]}', [
				'riker',
				'data',
				'product',
			])
		).toEqual({ kind: 'route', agents: ['riker'], by: 'model' })
	})

	it('sends a route to an agent it cannot wake to Riker', () => {
		expect(
			parseClefReply('{"kind":"route","agents":["library"]}', [
				'riker',
				'product',
			])
		).toEqual({ kind: 'route', agents: ['riker'], by: 'model' })
	})

	it('keeps one clear agent', () => {
		expect(
			parseClefReply('{"kind":"route","agents":["data"]}', ['riker', 'data'])
		).toEqual({ kind: 'route', agents: ['data'], by: 'model' })
	})

	it('leaves anything unclear in the room', () => {
		for (const reply of [undefined, 'no idea', '{"kind":"maybe"}', '{bad']) {
			expect(parseClefReply(reply, ['product'])).toEqual({
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
			['product'],
			[{ text: 'note to self', routing: { kind: 'room', agents: [] } }]
		)
		expect(messages.map((m) => m.role)).toEqual([
			'system',
			'user',
			'assistant',
			'user',
		])
		expect(messages[0].content).toContain('"product" (Product manager)')
		expect(messages[2].content).toBe('{"kind":"room","agents":[]}')
		expect(messages.at(-1)?.content).toBe('what next?')
	})
})
