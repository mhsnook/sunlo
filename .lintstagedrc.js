export default {
	'*.{js,jsx,ts,tsx,mjs,cjs,json,jsonc,css,md,html}':
		'oxfmt --no-error-on-unmatched-pattern',
	'*.{js,jsx,ts,tsx,mjs,cjs}': 'oxlint --fix',
	'*.sql': 'prettier --write',
	'**/*.{ts,tsx,js,jsx}': 'eslint --fix',
}
