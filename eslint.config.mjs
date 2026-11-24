import nextVitals from 'eslint-config-next/core-web-vitals';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const eslintConfig = [
  // ESLint 9 skips .jsx unless a config names it; `next lint` covered it.
  { files: ['**/*.jsx'] },
  // ESLint 9 turns this on by default; ESLint 8 had it off.
  { linterOptions: { reportUnusedDisableDirectives: 'off' } },
  ...nextVitals,
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.ts', '**/*.tsx'],
    rules: {
      // New in eslint-config-next 16; off so the upgrade needs no code changes (7 and 4 reports).
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/incompatible-library': 'off',
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
];

export default eslintConfig;
