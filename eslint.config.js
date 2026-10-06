import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const oneComponentPerFile = {
  meta: {
    type: 'suggestion',
    messages: { multiple: 'Move {{name}} to its own component file.' },
    schema: [],
  },
  create(context) {
    let firstComponent = null;
    function check(node) {
      const name = node.id?.name;
      const value = node.init;
      const component =
        typeof name === 'string' &&
        /^[A-Z]/.test(name) &&
        (node.type === 'FunctionDeclaration' ||
          value?.type === 'ArrowFunctionExpression' ||
          value?.type === 'FunctionExpression');
      if (!component) {
        return;
      }
      if (firstComponent) {
        context.report({ node, messageId: 'multiple', data: { name } });
      } else {
        firstComponent = name;
      }
    }
    return { FunctionDeclaration: check, VariableDeclarator: check };
  },
};

export default tseslint.config(
  {
    ignores: [
      '**/.playwright-cli/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/output/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      curly: 'error',
      eqeqeq: 'error',
      'no-console': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-const': 'error',
      yoda: 'error',
      'max-lines': ['error', { max: 250, skipBlankLines: false, skipComments: false }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: false, skipComments: false }],
    },
  },
  {
    files: ['sources/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2024 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      complexity: ['error', 15],
      'max-depth': ['error', 4],
      'max-params': ['error', 4],
      'max-statements': ['error', 40],
    },
  },
  {
    files: ['sources/**/*.tsx'],
    plugins: { project: { rules: { 'one-component-per-file': oneComponentPerFile } } },
    rules: { 'project/one-component-per-file': 'error' },
  },
  {
    // JSX branches describe visible UI states and inflate cyclomatic complexity more than
    // equivalent domain logic. Components still retain bounded, enforceable ceilings.
    files: ['sources/components/**/*.{ts,tsx}'],
    rules: {
      complexity: ['error', 40],
      'max-params': ['error', 5],
      'max-statements': ['error', 90],
    },
  },
  {
    files: ['vite.config.ts', 'playwright.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: [
      '**/*.{test,spec}.{ts,tsx,js,mjs,cjs}',
      'sources/test-setup.ts',
      'tests/**/*.{ts,tsx,js,mjs,cjs}',
    ],
    rules: {
      complexity: 'off',
      'max-statements': 'off',
    },
  },
);
