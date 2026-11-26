import * as v from 'valibot'
import { blockErrors } from '../../shared/blocks'

export const Text = v.pipe(v.string(), v.trim(), v.minLength(1))
const Label = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(24))
export const Options = v.pipe(v.array(Label), v.minLength(2), v.maxLength(3))

export const toActions = (options: Array<string>) =>
	options.map((label, index) => ({ id: `option-${index + 1}`, label }))

// A look tool's harness prompt runs with the agent's own instructions and
// tools, and those instructions say to look at an image with look_at_image.
// Without this, the model calls a tool from inside the look, and Flue
// refuses the same tool calling itself.
export function answerFromAttached(count: number) {
	const pictures =
		count === 1
			? 'The picture is attached to this message, so you are looking at it now.'
			: 'The pictures are attached to this message, so you are looking at them now.'
	return `${pictures} Answer from what you see, without calling any tool. If no picture reached you, say so plainly instead of guessing.`
}

// Throwing from a tool hands the message to the model, which fixes the
// block and calls the tool again; nothing is posted or saved with a broken
// block.
export function assertBlocks(
	text: string,
	outcome: 'posted' | 'saved' = 'posted'
) {
	const errors = blockErrors(text)
	if (errors.length) {
		throw new Error(`Nothing was ${outcome}. ${errors.join(' ')}`)
	}
}
