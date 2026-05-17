import { configPkg } from '@adonisjs/eslint-config';

export default [
  ...configPkg({
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }),
  {
    files: ['ui/hooks/**'],
    rules: {
      '@unicorn/filename-case': ['error', { cases: { kebabCase: true } }],
    },
  },
  {
    files: ['ui/interceptors.ts'],
    rules: {
      // _uid and _fetch use underscore-prefix as a private/saved-original convention
      '@typescript-eslint/naming-convention': 'off',
    },
  },
];
