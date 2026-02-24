module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['backend', 'frontend', 'mobile', 'ci', 'docs', 'root'],
    ],
    'scope-empty': [2, 'never'],
  },
};
