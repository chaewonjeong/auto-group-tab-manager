import APIUtils from '../api-utils.js';

global.chrome = {
  tabs: {
    query: jest.fn(),
    group: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
  tabGroups: {
    query: jest.fn(),
    update: jest.fn(),
    get: jest.fn(),
  },
  permissions: {
    contains: jest.fn(),
    request: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      getBytesInUse: jest.fn(),
    },
  },
  runtime: {
    getManifest: jest.fn(),
  },
  windows: {
    create: jest.fn(),
  },
};

describe('APIUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('safeTabsQuery', () => {
    it('탭 쿼리 성공 시 탭 목록을 반환해야 한다', async () => {
      const mockTabs = [{ id: 1 }, { id: 2 }];
      chrome.tabs.query.mockResolvedValue(mockTabs);
      const result = await APIUtils.safeTabsQuery({ active: true });
      expect(result).toEqual(mockTabs);
      expect(chrome.tabs.query).toHaveBeenCalledWith({ active: true });
    });
    it('API 오류 시 빈 배열을 반환해야 한다', async () => {
      chrome.tabs.query.mockRejectedValue(new Error('API Error'));
      const result = await APIUtils.safeTabsQuery();
      expect(result).toEqual([]);
    });
  });

  // ... (다른 메서드 테스트도 필요시 한글로 추가)
});
