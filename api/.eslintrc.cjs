module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs', 'jest.config.js'],
  parser: '@typescript-eslint/parser',
  rules: {
    'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // CLI betikleri çıktıyı konsola yazar
      files: ['src/seed.ts', 'src/scripts/**/*.ts'],
      rules: { 'no-console': 'off' },
    },
    {
      files: ['**/*.test.ts'],
      env: { jest: true },
      rules: { '@typescript-eslint/no-explicit-any': 'off' },
    },
  ],
};
