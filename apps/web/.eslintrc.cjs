/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  settings: {
    next: {
      rootDir: ['apps/web/'], // Ensures Next.js plugin works in monorepo
    },
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
  ],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  rules: {
    // ==== TypeScript ====
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',

    // ==== React ====
    'react/react-in-jsx-scope': 'off',
    'react/jsx-key': 'warn',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // ==== Accessibility ====
    'jsx-a11y/label-has-associated-control': 'warn',
    'jsx-a11y/heading-has-content': 'warn',

    // ==== General ====
    'react/no-unescaped-entities': 'warn',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  },
  ignorePatterns: [
    '.next/',
    'node_modules/',
    'dist/',
    'out/',
    '*.config.js',
    '*.config.cjs',
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // Resolve eslint-config-next react-hooks conflict
        'react-hooks/rules-of-hooks': 'off',
        'react-hooks/exhaustive-deps': 'off',
      },
    },
  ],
};
