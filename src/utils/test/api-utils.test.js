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

  describe('safeTabGroupsQuery', () => {
    it('탭 그룹 쿼리 성공 시 그룹 목록을 반환해야 한다', async () => {
      const mockGroups = [{ id: 1, title: 'test' }];
      chrome.tabGroups.query.mockResolvedValue(mockGroups);
      const result = await APIUtils.safeTabGroupsQuery({ windowId: 1 });
      expect(result).toEqual(mockGroups);
      expect(chrome.tabGroups.query).toHaveBeenCalledWith({ windowId: 1 });
    });
    it('API 오류 시 빈 배열을 반환해야 한다', async () => {
      chrome.tabGroups.query.mockRejectedValue(new Error('API Error'));
      const result = await APIUtils.safeTabGroupsQuery();
      expect(result).toEqual([]);
    });
  });

  describe('safeTabGroupCreate', () => {
    it('탭 그룹 생성 성공 시 그룹 ID를 반환해야 한다', async () => {
      const mockGroupId = 123;
      chrome.tabs.group.mockResolvedValue(mockGroupId);
      const result = await APIUtils.safeTabGroupCreate({ tabIds: [1, 2] });
      expect(result).toBe(mockGroupId);
      expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [1, 2] });
    });
    it('API 오류 시 null을 반환해야 한다', async () => {
      chrome.tabs.group.mockRejectedValue(new Error('API Error'));
      const result = await APIUtils.safeTabGroupCreate({ tabIds: [1] });
      expect(result).toBeNull();
    });
  });

  describe('safeTabGroupUpdate', () => {
    it('탭 그룹 업데이트 성공 시 true를 반환해야 한다', async () => {
      chrome.tabGroups.update.mockResolvedValue();
      const result = await APIUtils.safeTabGroupUpdate(1, {
        title: 'new title',
      });
      expect(result).toBe(true);
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(1, {
        title: 'new title',
      });
    });
    it('API 오류 시 false를 반환해야 한다', async () => {
      chrome.tabGroups.update.mockRejectedValue(new Error('API Error'));
      const result = await APIUtils.safeTabGroupUpdate(1, { title: 'test' });
      expect(result).toBe(false);
    });
  });

  describe('safeTabGroupGet', () => {
    it('탭 그룹 조회 성공 시 그룹 정보를 반환해야 한다', async () => {
      const mockGroup = { id: 1, title: 'test', color: 'blue' };
      chrome.tabGroups.get.mockResolvedValue(mockGroup);
      const result = await APIUtils.safeTabGroupGet(1);
      expect(result).toEqual(mockGroup);
      expect(chrome.tabGroups.get).toHaveBeenCalledWith(1);
    });
    it('API 오류 시 null을 반환해야 한다', async () => {
      chrome.tabGroups.get.mockRejectedValue(new Error('API Error'));
      const result = await APIUtils.safeTabGroupGet(1);
      expect(result).toBeNull();
    });
  });

  describe('safeTabCreate', () => {
    it('탭 생성 성공 시 탭 정보를 반환해야 한다', async () => {
      const mockTab = { id: 1, url: 'https://example.com' };
      chrome.tabs.create.mockResolvedValue(mockTab);
      const result = await APIUtils.safeTabCreate({
        url: 'https://example.com',
      });
      expect(result).toEqual(mockTab);
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://example.com',
      });
    });
    it('API 오류 시 null을 반환해야 한다', async () => {
      chrome.tabs.create.mockRejectedValue(new Error('API Error'));
      const result = await APIUtils.safeTabCreate({
        url: 'https://example.com',
      });
      expect(result).toBeNull();
    });
  });

  describe('safeTabUpdate', () => {
    it('탭 업데이트 성공 시 true를 반환해야 한다', async () => {
      chrome.tabs.update.mockResolvedValue();
      const result = await APIUtils.safeTabUpdate(1, { active: true });
      expect(result).toBe(true);
      expect(chrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
    });
    it('API 오류 시 false를 반환해야 한다', async () => {
      chrome.tabs.update.mockRejectedValue(new Error('API Error'));
      const result = await APIUtils.safeTabUpdate(1, { active: true });
      expect(result).toBe(false);
    });
  });

  describe('safeTabRemove', () => {
    it('탭 제거 성공 시 true를 반환해야 한다', async () => {
      chrome.tabs.remove.mockResolvedValue();
      const result = await APIUtils.safeTabRemove([1, 2]);
      expect(result).toBe(true);
      expect(chrome.tabs.remove).toHaveBeenCalledWith([1, 2]);
    });
    it('API 오류 시 false를 반환해야 한다', async () => {
      chrome.tabs.remove.mockRejectedValue(new Error('API Error'));
      const result = await APIUtils.safeTabRemove(1);
      expect(result).toBe(false);
    });
  });

  describe('safeWindowCreate', () => {
    it('윈도우 생성 성공 시 윈도우 정보를 반환해야 한다', async () => {
      const mockWindow = { id: 1, type: 'normal' };
      chrome.windows.create.mockResolvedValue(mockWindow);
      const result = await APIUtils.safeWindowCreate({ type: 'normal' });
      expect(result).toEqual(mockWindow);
      expect(chrome.windows.create).toHaveBeenCalledWith({ type: 'normal' });
    });
    it('API 오류 시 null을 반환해야 한다', async () => {
      chrome.windows.create.mockRejectedValue(new Error('API Error'));
      const result = await APIUtils.safeWindowCreate({});
      expect(result).toBeNull();
    });
  });

  describe('safePermissionsContains', () => {
    it('권한 확인 성공 시 결과를 반환해야 한다', async () => {
      chrome.permissions.contains.mockResolvedValue(true);
      const result = await APIUtils.safePermissionsContains({
        permissions: ['tabs'],
      });
      expect(result).toBe(true);
      expect(chrome.permissions.contains).toHaveBeenCalledWith({
        permissions: ['tabs'],
      });
    });
    it('API 오류 시 false를 반환해야 한다', async () => {
      chrome.permissions.contains.mockRejectedValue(new Error('API Error'));
      const result = await APIUtils.safePermissionsContains({
        permissions: ['tabs'],
      });
      expect(result).toBe(false);
    });
  });

  describe('safePermissionsRequest', () => {
    it('권한 요청 성공 시 결과를 반환해야 한다', async () => {
      chrome.permissions.request.mockResolvedValue(true);
      const result = await APIUtils.safePermissionsRequest({
        permissions: ['tabs'],
      });
      expect(result).toBe(true);
      expect(chrome.permissions.request).toHaveBeenCalledWith({
        permissions: ['tabs'],
      });
    });
    it('API 오류 시 false를 반환해야 한다', async () => {
      chrome.permissions.request.mockRejectedValue(new Error('API Error'));
      const result = await APIUtils.safePermissionsRequest({
        permissions: ['tabs'],
      });
      expect(result).toBe(false);
    });
  });

  describe('getCurrentActiveTab', () => {
    it('활성 탭이 있으면 해당 탭을 반환해야 한다', async () => {
      const mockTab = { id: 1, active: true };
      chrome.tabs.query.mockResolvedValue([mockTab]);
      const result = await APIUtils.getCurrentActiveTab();
      expect(result).toEqual(mockTab);
      expect(chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true,
      });
    });
    it('활성 탭이 없으면 null을 반환해야 한다', async () => {
      chrome.tabs.query.mockResolvedValue([]);
      const result = await APIUtils.getCurrentActiveTab();
      expect(result).toBeNull();
    });
  });

  describe('getAllTabs', () => {
    it('모든 탭을 반환해야 한다', async () => {
      const mockTabs = [{ id: 1 }, { id: 2 }];
      chrome.tabs.query.mockResolvedValue(mockTabs);
      const result = await APIUtils.getAllTabs();
      expect(result).toEqual(mockTabs);
      expect(chrome.tabs.query).toHaveBeenCalledWith({});
    });
  });

  describe('getTabsInWindow', () => {
    it('특정 윈도우의 탭들을 반환해야 한다', async () => {
      const mockTabs = [{ id: 1, windowId: 123 }];
      chrome.tabs.query.mockResolvedValue(mockTabs);
      const result = await APIUtils.getTabsInWindow(123);
      expect(result).toEqual(mockTabs);
      expect(chrome.tabs.query).toHaveBeenCalledWith({ windowId: 123 });
    });
  });

  describe('getUngroupedTabs', () => {
    beforeEach(() => {
      // TAB_GROUP_ID_NONE 모킹
      chrome.tabGroups.TAB_GROUP_ID_NONE = -1;
    });

    it('그룹화되지 않은 탭들을 반환해야 한다', async () => {
      const mockTabs = [
        { id: 1, groupId: -1 },
        { id: 2, groupId: 1 },
        { id: 3, groupId: -1 },
      ];
      chrome.tabs.query.mockResolvedValue(mockTabs);
      const result = await APIUtils.getUngroupedTabs();
      expect(result).toEqual([
        { id: 1, groupId: -1 },
        { id: 3, groupId: -1 },
      ]);
    });

    it('특정 윈도우의 그룹화되지 않은 탭들을 반환해야 한다', async () => {
      const mockTabs = [{ id: 1, groupId: -1, windowId: 123 }];
      chrome.tabs.query.mockResolvedValue(mockTabs);
      const result = await APIUtils.getUngroupedTabs(123);
      expect(result).toEqual(mockTabs);
      expect(chrome.tabs.query).toHaveBeenCalledWith({ windowId: 123 });
    });
  });

  describe('getTabsInGroup', () => {
    it('특정 그룹의 탭들을 반환해야 한다', async () => {
      const mockTabs = [{ id: 1, groupId: 123 }];
      chrome.tabs.query.mockResolvedValue(mockTabs);
      const result = await APIUtils.getTabsInGroup(123);
      expect(result).toEqual(mockTabs);
      expect(chrome.tabs.query).toHaveBeenCalledWith({ groupId: 123 });
    });
  });

  describe('testAPIConnectivity', () => {
    it('모든 API가 정상일 때 성공 결과를 반환해야 한다', async () => {
      chrome.tabs.query.mockResolvedValue([]);
      chrome.tabGroups.query.mockResolvedValue([]);
      chrome.storage.local.get.mockResolvedValue({});
      chrome.permissions.contains.mockResolvedValue(true);
      chrome.runtime.getManifest.mockReturnValue({ name: 'Test Extension' });

      const result = await APIUtils.testAPIConnectivity();

      expect(result).toEqual({
        tabs: true,
        tabGroups: true,
        storage: true,
        permissions: true,
        runtime: true,
        errors: [],
      });
    });

    it('API 오류가 있을 때 오류 정보를 포함해야 한다', async () => {
      // safeTabsQuery가 내부적으로 오류를 처리하므로 직접 testAPIConnectivity에서 오류를 발생시켜야 함
      const originalSafeTabsQuery = APIUtils.safeTabsQuery;
      APIUtils.safeTabsQuery = jest
        .fn()
        .mockRejectedValue(new Error('Tabs API Error'));

      chrome.tabGroups.query.mockResolvedValue([]);
      chrome.storage.local.get.mockResolvedValue({});
      chrome.permissions.contains.mockResolvedValue(true);
      chrome.runtime.getManifest.mockReturnValue({ name: 'Test Extension' });

      const result = await APIUtils.testAPIConnectivity();

      expect(result.tabs).toBe(false);
      expect(result.tabGroups).toBe(true);
      expect(result.errors).toContain('Tabs API: Tabs API Error');

      // 원래 함수 복원
      APIUtils.safeTabsQuery = originalSafeTabsQuery;
    });
  });
});
