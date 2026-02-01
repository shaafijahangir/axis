module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['backend', 'frontend', 'ci', 'docs', 'root'],
    ],
    'scope-empty': [2, 'never'],
  },
};
