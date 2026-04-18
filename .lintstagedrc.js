export default {
	'*.{js,jsx,ts,tsx,mjs,cjs,json,jsonc,css,md,html}': ['oxfmt', 'oxlint --fix'],
	'*.sql': ['prettier --write'],
	'**/*.{ts,tsx,js,jsx}': 'eslint --fix',
}
