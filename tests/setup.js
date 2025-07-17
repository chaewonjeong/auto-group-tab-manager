/**
 * Jest 테스트 환경 설정
 * Chrome Extension API Mock 및 전역 설정
 */

// Chrome API Mock 생성
const mockChrome = {
  runtime: {
    getManifest: jest.fn(() => ({
      name: 'Tab Group Manager',
      version: '1.0.0',
      manifest_version: 3,
    })),
    onInstalled: {
      addListener: jest.fn(),
    },
    onStartup: {
      addListener: jest.fn(),
    },
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
  tabs: {
    query: jest.fn(async () => []),
    create: jest.fn(async (props) => ({
      id: Math.floor(Math.random() * 1000),
      url: props.url,
      title: 'Test Tab',
      windowId: 1,
      groupId: -1,
    })),
    update: jest.fn(async () => true),
    remove: jest.fn(async () => true),
    group: jest.fn(async (options) => {
      if (options.groupId) {
        return options.groupId;
      }
      return Math.floor(Math.random() * 100);
    }),
    onCreated: {
      addListener: jest.fn(),
    },
    onUpdated: {
      addListener: jest.fn(),
    },
    onRemoved: {
      addListener: jest.fn(),
    },
  },
  tabGroups: {
    query: jest.fn(async () => []),
    get: jest.fn(async (id) => ({
      id,
      title: 'test-group',
      color: 'blue',
      collapsed: false,
    })),
    update: jest.fn(async () => true),
    TAB_GROUP_ID_NONE: -1,
    onCreated: {
      addListener: jest.fn(),
    },
    onUpdated: {
      addListener: jest.fn(),
    },
    onRemoved: {
      addListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn(async (keys) => {
        if (typeof keys === 'string') {
          return { [keys]: null };
        }
        if (Array.isArray(keys)) {
          const result = {};
          keys.forEach((key) => (result[key] = null));
          return result;
        }
        return {};
      }),
      set: jest.fn(async () => true),
      clear: jest.fn(async () => true),
      getBytesInUse: jest.fn(async () => 0),
      QUOTA_BYTES: 5242880,
    },
    sync: {
      get: jest.fn(async (keys) => {
        if (typeof keys === 'string') {
          return { [keys]: null };
        }
        if (Array.isArray(keys)) {
          const result = {};
          keys.forEach((key) => (result[key] = null));
          return result;
        }
        return {};
      }),
      set: jest.fn(async () => true),
      clear: jest.fn(async () => true),
      getBytesInUse: jest.fn(async () => 0),
      QUOTA_BYTES: 102400,
    },
  },
  permissions: {
    contains: jest.fn(async () => true),
    request: jest.fn(async () => true),
  },
  windows: {
    create: jest.fn(async (createData) => ({
      id: Math.floor(Math.random() * 10),
      ...createData,
    })),
    get: jest.fn(async (windowId) => ({
      id: windowId,
      focused: true,
      type: 'normal',
    })),
  },
};

// 전역 Chrome API 설정
global.chrome = mockChrome;

// URL 클래스 전역 설정 (Node.js 환경에서 사용)
global.URL = URL;

// Console 설정
global.console = console;

// 테스트 유틸리티 함수들
global.testUtils = {
  /**
   * Chrome API Mock 초기화
   */
  resetMocks: () => {
    Object.values(mockChrome).forEach((api) => {
      if (typeof api === 'object' && api !== null) {
        Object.values(api).forEach((method) => {
          if (typeof method === 'function' && method.mockReset) {
            method.mockReset();
          }
        });
      }
    });
  },

  /**
   * 테스트용 탭 데이터 생성
   */
  createMockTab: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    url: 'https://example.com',
    title: 'Test Tab',
    windowId: 1,
    groupId: -1,
    active: false,
    pinned: false,
    ...overrides,
  }),

  /**
   * 테스트용 탭 그룹 데이터 생성
   */
  createMockTabGroup: (overrides = {}) => ({
    id: Math.floor(Math.random() * 100),
    title: 'test-group',
    color: 'blue',
    collapsed: false,
    windowId: 1,
    ...overrides,
  }),

  /**
   * 비동기 함수 테스트 헬퍼
   */
  expectAsync: async (asyncFn, expectedResult) => {
    const result = await asyncFn();
    expect(result).toEqual(expectedResult);
  },
};

// Jest 설정
jest.setTimeout(10000);

// 각 테스트 전에 Mock 초기화
beforeEach(() => {
  global.testUtils.resetMocks();
});

// 테스트 완료 후 정리
afterEach(() => {
  jest.clearAllMocks();
});

console.log('Jest 테스트 환경 설정 완료');
