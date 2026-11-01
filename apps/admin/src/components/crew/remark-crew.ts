import type { PhrasingContent, Root } from 'mdast'
import { SKIP, visit } from 'unist-util-visit'
import { isBlockKind, type BlockKind } from '../../../shared/blocks'
import { githubHref } from '../../lib/refs'

interface CrewBlock {
	type: 'crewBlock'
	data: {
		hName: 'figure'
		hProperties: { dataBlock: BlockKind | 'mermaid'; dataSource: string }
	}
}

declare module 'mdast' {
	interface RootContentMap {
		crewBlock: CrewBlock
	}
}

const mention = /(^|\s)(@[A-Za-z][\w-]*)/g
// "#854", but not the "#854" in "a#854", "&#854;" or a URL's "/#854".
const issueRef = /(^|[^\w&#/])#(\d+)(?![\w-])/g

// A fenced block in a component's language, or in mermaid, becomes a
// <figure> that CrewText draws as that component, an @mention in prose
// renders bold, and "#854" becomes a link to that issue or pull request.
// Code is never touched, so JSON in a block keeps its "@name".
export function remarkCrew() {
	return (tree: Root) => {
		visit(tree, 'code', (node, index, parent) => {
			if (!parent || index === undefined) return
			const lang = node.lang
			if (!lang || (lang !== 'mermaid' && !isBlockKind(lang))) return
			parent.children[index] = {
				type: 'crewBlock',
				data: {
					hName: 'figure',
					hProperties: { dataBlock: lang, dataSource: node.value },
				},
			}
		})
		visit(tree, 'text', (node, index, parent) => {
			if (!parent || index === undefined) return
			const parts = node.value.split(mention)
			if (parts.length === 1) return
			// split() with two groups yields [text, space, @name, text, ...].
			const nodes: Array<PhrasingContent> = []
			for (let i = 0; i < parts.length; i += 3) {
				const text = parts[i] + (parts[i + 1] ?? '')
				if (text) nodes.push({ type: 'text', value: text })
				const name = parts[i + 2]
				if (name) {
					nodes.push({
						type: 'strong',
						children: [{ type: 'text', value: name }],
					})
				}
			}
			parent.children.splice(index, 1, ...nodes)
			return [SKIP, index + nodes.length]
		})
		visit(tree, (node, index, parent) => {
			// A link's own text keeps its target.
			if (node.type === 'link' || node.type === 'linkReference') return SKIP
			if (node.type !== 'text' || !parent || index === undefined) return
			const parts = node.value.split(issueRef)
			if (parts.length === 1) return
			const nodes: Array<PhrasingContent> = []
			for (let i = 0; i < parts.length; i += 3) {
				const text = parts[i] + (parts[i + 1] ?? '')
				if (text) nodes.push({ type: 'text', value: text })
				const number = parts[i + 2]
				if (number) {
					nodes.push({
						type: 'link',
						url: githubHref(Number(number)),
						children: [{ type: 'text', value: `#${number}` }],
					})
				}
			}
			;(parent.children as Array<PhrasingContent>).splice(index, 1, ...nodes)
			return [SKIP, index + nodes.length]
		})
	}
}
