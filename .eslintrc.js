module.exports = {
  ignorePatterns: [
    'dist/**/*.js'
  ],
  extends: [
    '@munierujp/eslint-config-typescript',
    'plugin:jest/recommended'
  ],
  parserOptions: {
    project: './tsconfig.json'
  },
  rules: {
    indent: ['error', 2],
    'unicorn/prefer-module': 'off'
  }
}
