import type { CoachMessage, TextBlock, ToolResultBlock } from './protocol'

const MAX_MESSAGES = 60

// Consecutive user turns are merged, because a step that failed, or a final
// step with no content, leaves the transcript ending on a user message. A
// tool call left without a result (the tab closed mid-turn) gets one, because
// the API refuses a tool_use with no tool_result after it.
export function appendUserBlocks(
	transcript: Array<CoachMessage>,
	blocks: Array<TextBlock | ToolResultBlock>
): Array<CoachMessage> {
	const last = transcript.at(-1)
	if (last?.role === 'user')
		return [
			...transcript.slice(0, -1),
			{ role: 'user', content: [...last.content, ...blocks] },
		]
	const answered = new Set(
		blocks.flatMap((b) => (b.type === 'tool_result' ? [b.tool_use_id] : []))
	)
	const orphans: Array<ToolResultBlock> =
		last?.role === 'assistant'
			? last.content.flatMap((b) =>
					b.type === 'tool_use' && !answered.has(b.id)
						? [
								{
									type: 'tool_result' as const,
									tool_use_id: b.id,
									content: 'Interrupted before it finished.',
									is_error: true,
								},
							]
						: []
				)
			: []
	return [...transcript, { role: 'user', content: [...orphans, ...blocks] }]
}

// The newest messages, opening on a user message with text. The window's
// first message loses its tool results: the tool calls they answer fell
// outside the window, and the API refuses a tool_result without its call.
export function windowTranscript(
	transcript: Array<CoachMessage>,
	maxMessages = MAX_MESSAGES
): Array<CoachMessage> {
	for (
		let start = Math.max(0, transcript.length - maxMessages);
		start < transcript.length;
		start++
	) {
		const first = transcript[start]
		if (first.role !== 'user') continue
		if (start === 0) return transcript
		const text = first.content.filter((b) => b.type === 'text')
		if (!text.length) continue
		return [{ role: 'user', content: text }, ...transcript.slice(start + 1)]
	}
	return transcript.slice(-1)
}
