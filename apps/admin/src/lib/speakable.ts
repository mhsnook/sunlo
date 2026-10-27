import type { Nodes } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { isBlockKind } from '../../shared/blocks'
import { MAX_SPEECH_CHARS } from '../../shared/crew'

// An agent's markdown as words to read aloud: no markup, no code, a short
// mention in place of each chart or table, cut at a sentence end to fit
// the voice model's limit.
export function speakable(markdown: string) {
	const text = spoken(fromMarkdown(markdown))
		.replace(/\n{2,}/g, '\n')
		.trim()
	if (text.length <= MAX_SPEECH_CHARS) return text
	const cut = text.slice(0, MAX_SPEECH_CHARS)
	const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'))
	return end > 0 ? cut.slice(0, end + 1) : cut
}

function spoken(node: Nodes): string {
	switch (node.type) {
		case 'text':
		case 'inlineCode':
			return node.value
		case 'code':
			return node.lang && isBlockKind(node.lang)
				? `\nThere is a ${node.lang} in the message.\n`
				: ''
		case 'table':
			return '\nThere is a table in the message.\n'
		case 'break':
			return '\n'
		case 'paragraph':
		case 'heading':
		case 'listItem':
		case 'blockquote':
			return `\n${node.children.map(spoken).join('')}\n`
		// Images, HTML and rules have no words, and no children.
		default:
			return 'children' in node ? node.children.map(spoken).join('') : ''
	}
}
