module.exports = {
  env: {
    commonjs: true,
    es6: true,
    mocha: true,
    node: true
  },
  extends: [
    'standard',
    'plugin:chai-friendly/recommended'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  plugins: [
    'chai-friendly'
  ],
  rules: {
  }
}
