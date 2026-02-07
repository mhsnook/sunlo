/** @type {import('prettier').Config} */
const prettierConfig = {
	useTabs: true,
	semi: false,
	singleQuote: true,
	trailingComma: 'es5',
	experimentalTernaries: true,
	plugins: [
		'@prettier/plugin-oxc',
		'prettier-plugin-tailwindcss',
		'prettier-plugin-sql',
	],
}

/** @type {import('prettier-plugin-sql').SqlBaseOptions} */
const prettierPluginSqlConfig = {
	// formatter: 'node-sql-parser',
	language: 'postgresql',
	// dialect: 'postgresql',
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

const config = {
	...prettierConfig,
	...prettierPluginSqlConfig,
}

export default config
