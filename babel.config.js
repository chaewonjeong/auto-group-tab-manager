/**
 * Babel 설정 파일
 * Jest 테스트 환경에서 ES6+ 문법을 지원하기 위한 설정
 */

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: '16',
        },
        modules: 'commonjs',
      },
    ],
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
            modules: 'commonjs',
          },
        ],
      ],
    },
  },
};
