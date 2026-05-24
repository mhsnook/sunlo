export default {
	'*.{js,jsx,ts,tsx,mjs,cjs,json,jsonc,css,md,html}': 'oxfmt',
	'*.{js,jsx,ts,tsx,mjs,cjs}': 'oxlint --fix',
	'*.sql': 'prettier --write',
	'**/*.{ts,tsx,js,jsx}': 'eslint --fix',
}
