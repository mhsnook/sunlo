export default {
	'*.{js,jsx,ts,tsx,json,css,md}': ['prettier --write', 'oxlint --fix'],
	// This function receives the staged filenames and passes them to tsc.
	// This ensures tsc only checks the staged files, but still uses
	// the tsconfig.json for configuration.
	'**/*.{ts,tsx,js,jsx}': 'eslint --fix',
}
