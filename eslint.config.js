const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        node: true,
        console: true,
        process: true,
        module: true,
        require: true,
        __dirname: true,
        setTimeout: true,
        clearTimeout: true,
        Promise: true,
        fetch: true,
        AbortController: true,
        Buffer: true,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'no-misleading-character-class': 'off',
    },
  },
];
