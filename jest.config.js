/**
 * Jest 설정 파일
 * Chrome Extension 테스트를 위한 환경 구성
 */

module.exports = {
  // 테스트 환경 설정
  testEnvironment: 'jsdom',

  // 테스트 파일 패턴
  testMatch: [
    '**/tests/**/*.test.js',
    '**/src/**/*.test.js',
    '**/__tests__/**/*.js',
  ],

  // 모듈 경로 매핑
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },

  // 설정 파일
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // 커버리지 설정
  collectCoverage: false, // 기본적으로 비활성화, 필요시 --coverage 플래그 사용
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // 변환 설정
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // 모듈 파일 확장자
  moduleFileExtensions: ['js', 'json'],

  // 테스트 타임아웃
  testTimeout: 10000,

  // 전역 변수 설정
  globals: {
    chrome: true,
    browser: true,
  },

  // 테스트 환경 변수
  testEnvironmentOptions: {
    url: 'chrome-extension://test-extension-id/',
  },

  // 무시할 패턴
  testPathIgnorePatterns: ['/node_modules/', '/coverage/', '/dist/', '/build/'],

  // 모듈 경로 무시 패턴
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/build/',
  ],

  // 상세 출력
  verbose: true,

  // 병렬 실행 설정 (Chrome Extension 테스트의 안정성을 위해 제한)
  maxWorkers: 2,

  // 테스트 실행 전후 정리
  clearMocks: true,
  restoreMocks: true,

  // 에러 출력 설정
  errorOnDeprecated: true,
};
