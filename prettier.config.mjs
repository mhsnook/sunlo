/**
 * Prettier only formats SQL here. JS/TS/JSX/CSS/MD/JSON are formatted by oxfmt.
 *
 * @type {import('prettier').Config & import('prettier-plugin-sql').SqlBaseOptions}
 */
const config = {
	useTabs: true,
	plugins: ['prettier-plugin-sql'],
	language: 'postgresql',
	keywordCase: 'lower',
	dataTypeCase: 'lower',
	functionCase: 'lower',
	identifierCase: 'lower',
	indentStyle: 'standard',
	logicalOperatorNewline: 'before',
	expressionWidth: 64,
	denseOperators: false,
	database: 'postgresql',
}

export default config
