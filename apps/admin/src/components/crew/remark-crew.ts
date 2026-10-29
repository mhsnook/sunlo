import type { PhrasingContent, Root } from 'mdast'
import { SKIP, visit } from 'unist-util-visit'
import { isBlockKind, type BlockKind } from '../../../shared/blocks'

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

// A fenced block in a component's language, or in mermaid, becomes a
// <figure> that CrewText draws as that component, and an @mention in prose
// renders bold. Code is never touched, so JSON in a block keeps its "@name".
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
	}
}
