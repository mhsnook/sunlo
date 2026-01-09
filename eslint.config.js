import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import oxlint from 'eslint-plugin-oxlint'

export default [
	{
		ignores: ['dist/', 'src-tauri/'],
	},
	{
		files: ['src/**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tseslint.parser,
			parserOptions: { project: ['./tsconfig.app.json'] },
			globals: { ...globals.browser },
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
		},
		rules: {
			// JavaScript recommended rules
			...js.configs.recommended.rules,

			// TypeScript recommended rules
			...tseslint.plugin.configs['recommended'].rules,
			...tseslint.plugin.configs['recommended-requiring-type-checking'].rules,

			...reactHooks.configs.recommended.rules,
			'react-refresh/only-export-components': ['off'],
			'@typescript-eslint/only-throw-error': [
				'error',
				{
					allow: ['Redirect'],
					allowThrowingAny: false,
					allowThrowingUnknown: false,
				},
			],
		},
	},
	{
		files: ['vite.config.ts'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			parser: tseslint.parser,
			parserOptions: {
				project: ['./tsconfig.node.json'],
				tsconfigRootDir: '.',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			...js.configs.recommended.rules,
			...tseslint.plugin.configs['recommended'].rules,
			...tseslint.plugin.configs['recommended-requiring-type-checking'].rules,
		},
	},
	...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
]
