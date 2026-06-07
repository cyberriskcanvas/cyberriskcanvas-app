import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignore build artefacts
  { ignores: ['.next/**', 'node_modules/**', 'public/**'] },

  // Base TypeScript rules (recommended + type-checked)
  ...tseslint.configs.recommended,

  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // CommonJS files must use require()
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Type-aware parsing only for files covered by tsconfig.json — config
  // files and server.ts (excluded from the tsconfig project) fall back to
  // the project-less parser from the recommended config above.
  {
    ignores: ['eslint.config.mjs', 'postcss.config.cjs', 'server-prelude.cjs', 'server.ts'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
