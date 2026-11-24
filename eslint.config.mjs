import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  // ESLint 9 skips .jsx unless a config names it; `next lint` covered it.
  { files: ['**/*.jsx'] },
  // ESLint 9 turns this on by default; ESLint 8 had it off.
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
  // eslint-config-next 15 only ships eslintrc-style configs, so it needs FlatCompat.
  ...compat.config({
    extends: ['next/core-web-vitals'],
    plugins: ['simple-import-sort'],
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
    overrides: [
      {
        files: ['**/*.js', '**/*.ts', '**/*.tsx'],
        rules: {
          'simple-import-sort/imports': [
            'error',
            {
              groups: [
                ['^react$', '^next', '^[a-z]'],
                ['^~', '^@'],
                ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
                ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
                ['^.+\\.s?css$'],
                ['^\\u0000'],
              ],
            },
          ],
        },
      },
    ],
  }),
];

export default eslintConfig;
