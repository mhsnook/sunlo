/** @type {import('prettier').Config} */
const prettierConfig = {
	useTabs: true,
	semi: false,
	singleQuote: true,
	trailingComma: 'es5',
	experimentalTernaries: true,
	plugins: ['prettier-plugin-tailwindcss', 'prettier-plugin-sql'],
}

/** @type {import('prettier-plugin-sql').SqlBaseOptions} */
const prettierPluginSqlConfig = {
	language: 'postgresql',
	keywordCase: 'lower',
	denseOperators: false,
	indentStyle: 'standard',
}

const config = {
	...prettierConfig,
	...prettierPluginSqlConfig,
}

export default config
