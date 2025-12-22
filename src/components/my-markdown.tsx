import { Blockquote } from './ui/blockquote'
import ReactMarkdown from 'react-markdown'

const components = { blockquote: Blockquote }

export function Markdown({
	children,
	...props
}: {
	children: string
	props?: unknown
}) {
	return (
		<ReactMarkdown skipHtml components={components} {...props}>
			{children}
		</ReactMarkdown>
	)
}
