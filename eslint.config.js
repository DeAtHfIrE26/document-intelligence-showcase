import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-properties': ['error', {
        property: 'innerHTML',
        message: 'Build DOM nodes (see src/lib/dom.ts) so document text can never inject markup.',
      }],
    },
  },
);
