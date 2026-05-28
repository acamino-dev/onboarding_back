module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module',
  },
  extends: [
    'plugin:@typescript-eslint/recommended', // recommended rules from the @typescript-eslint/eslint-plugin
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: false,
        allowTypedFunctionExpressions: false,
        allowHigherOrderFunctions: false,
        allowDirectConstAssertionInArrowFunctions: false,
      },
    ],
  },
}
