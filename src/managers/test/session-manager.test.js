// StorageUtils 모킹
const mockStorageUtils = {
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
  loadData: jest.fn(),
  saveData: jest.fn(),
};

// 모듈 모킹
jest.doMock('../../utils/storage-utils.js', () => ({
  default: mockStorageUtils,
}));

// 모킹 후 모듈 import
const SessionManager = require('../session-manager.js').default;

describe('SessionManager (리팩토링된 순수 기능)', () => {
  beforeEach(() => {
    // Chrome API 모킹 설정
    global.chrome = {
      tabs: {
        query: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        group: jest.fn(),
      },
      tabGroups: {
        query: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      windows: {
        create: jest.fn(),
        getCurrent: jest.fn(),
      },
      runtime: {
        onStartup: {
          addListener: jest.fn(),
        },
        onInstalled: {
          addListener: jest.fn(),
        },
      },
      storage: {
        local: {
          set: jest.fn().mockResolvedValue(),
          get: jest.fn().mockResolvedValue({}),
          clear: jest.fn().mockResolvedValue(),
          getBytesInUse: jest.fn().mockResolvedValue(0),
          QUOTA_BYTES: 5242880,
        },
      },
    };

    // StorageUtils 모킹 초기화
    mockStorageUtils.loadSettings.mockResolvedValue({
      restoreMode: 'full',
      autoGrouping: true,
    });
    mockStorageUtils.saveSettings.mockResolvedValue();
    mockStorageUtils.loadData.mockResolvedValue({});
    mockStorageUtils.saveData.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveCurrentSession', () => {
    test('현재 세션의 모든 탭과 그룹을 저장해야 한다', async () => {
      // Given
      const mockTabs = [
        {
          id: 1,
          url: 'https://google.com',
          title: 'Google',
          pinned: false,
          groupId: 1,
        },
        {
          id: 2,
          url: 'https://github.com',
          title: 'GitHub',
          pinned: true,
          groupId: 2,
        },
      ];
      const mockGroups = [
        { id: 1, title: 'google', color: 'blue', collapsed: false },
        { id: 2, title: 'github', color: 'grey', collapsed: false },
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabGroups.query.mockResolvedValue(mockGroups);

      // When
      await SessionManager.saveCurrentSession();

      // Then
      expect(mockStorageUtils.saveData).toHaveBeenCalledWith('session', {
        lastSaved: expect.any(Number),
        tabs: mockTabs,
        groups: mockGroups,
      });
    });

    test('세션 저장 중 오류가 발생해도 예외를 던지지 않아야 한다', async () => {
      // Given
      chrome.tabs.query.mockRejectedValue(new Error('Query failed'));

      // When & Then
      await expect(SessionManager.saveCurrentSession()).resolves.not.toThrow();
    });
  });

  describe('saveInitialPreset', () => {
    test('초기 프리셋을 저장해야 한다', async () => {
      // Given
      const mockTabs = [
        {
          id: 1,
          url: 'https://google.com',
          title: 'Google',
          pinned: false,
          groupId: 1,
        },
      ];
      const mockGroups = [
        { id: 1, title: 'google', color: 'blue', collapsed: false },
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabGroups.query.mockResolvedValue(mockGroups);

      // When
      await SessionManager.saveInitialPreset();

      // Then
      expect(mockStorageUtils.saveData).toHaveBeenCalledWith('initialPreset', {
        savedAt: expect.any(Number),
        tabs: mockTabs,
        groups: mockGroups,
      });
    });
  });

  describe('loadSessionData', () => {
    test('세션 데이터를 로드해야 한다', async () => {
      // Given
      const sessionData = {
        tabs: [
          {
            id: 1,
            url: 'https://google.com',
            title: 'Google',
            pinned: false,
            groupId: 1,
          },
        ],
        groups: [{ id: 1, title: 'google', color: 'blue', collapsed: false }],
      };

      mockStorageUtils.loadData.mockResolvedValue(sessionData);

      // When
      const result = await SessionManager.loadSessionData('session');

      // Then
      expect(result).toEqual(sessionData);
      expect(mockStorageUtils.loadData).toHaveBeenCalledWith('session');
    });

    test('로드 실패 시 null을 반환해야 한다', async () => {
      // Given
      mockStorageUtils.loadData.mockRejectedValue(new Error('Load failed'));

      // When
      const result = await SessionManager.loadSessionData('session');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('saveSessionData', () => {
    test('세션 데이터를 저장해야 한다', async () => {
      // Given
      const sessionData = { tabs: [], groups: [] };

      // When
      await SessionManager.saveSessionData('session', sessionData);

      // Then
      expect(mockStorageUtils.saveData).toHaveBeenCalledWith(
        'session',
        sessionData
      );
    });

    test('저장 실패 시 예외를 던져야 한다', async () => {
      // Given
      const sessionData = { tabs: [], groups: [] };
      mockStorageUtils.saveData.mockRejectedValue(new Error('Save failed'));

      // When & Then
      await expect(
        SessionManager.saveSessionData('session', sessionData)
      ).rejects.toThrow('Save failed');
    });
  });

  describe('restoreTabsAndGroups', () => {
    test('탭과 그룹을 복원해야 한다', async () => {
      // Given
      const data = {
        tabs: [
          {
            id: 1,
            url: 'https://google.com',
            title: 'Google',
            pinned: false,
            groupId: 1,
          },
        ],
        groups: [{ id: 1, title: 'google', color: 'blue', collapsed: false }],
      };
      const windowId = 1;

      chrome.tabGroups.create.mockResolvedValue({ id: 10 });
      chrome.tabGroups.update.mockResolvedValue();
      chrome.tabs.create.mockResolvedValue({ id: 20 });
      chrome.tabs.group.mockResolvedValue();

      // When
      await SessionManager.restoreTabsAndGroups(data, windowId);

      // Then
      expect(chrome.tabGroups.create).toHaveBeenCalledWith({ windowId });
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(10, {
        title: 'google',
        color: 'blue',
        collapsed: false,
      });
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://google.com',
        pinned: false,
        windowId,
      });
      expect(chrome.tabs.group).toHaveBeenCalledWith({
        tabIds: [20],
        groupId: 10,
      });
    });
  });

  describe('initializeSessionListeners', () => {
    test('제공된 콜백으로 이벤트 리스너를 등록해야 한다', () => {
      // Given
      const onStartupCallback = jest.fn();
      const onInstalledCallback = jest.fn();

      // When
      SessionManager.initializeSessionListeners(
        onStartupCallback,
        onInstalledCallback
      );

      // Then
      expect(chrome.runtime.onStartup.addListener).toHaveBeenCalledWith(
        onStartupCallback
      );
      expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledWith(
        onInstalledCallback
      );
    });

    test('콜백이 제공되지 않으면 리스너를 등록하지 않아야 한다', () => {
      // When
      SessionManager.initializeSessionListeners();

      // Then
      expect(chrome.runtime.onStartup.addListener).not.toHaveBeenCalled();
      expect(chrome.runtime.onInstalled.addListener).not.toHaveBeenCalled();
    });
  });

  describe('getSessionInfo', () => {
    test('세션 정보를 반환해야 한다', async () => {
      // Given
      const sessionData = {
        lastSaved: 1234567890,
        tabs: [{ url: 'https://google.com' }],
        groups: [{ title: 'google' }],
      };
      const initialPreset = {
        savedAt: 1234567890,
        tabs: [{ url: 'https://github.com' }],
        groups: [{ title: 'github' }],
      };

      mockStorageUtils.loadData
        .mockResolvedValueOnce(sessionData)
        .mockResolvedValueOnce(initialPreset);

      // When
      const info = await SessionManager.getSessionInfo();

      // Then
      expect(info).toEqual({
        hasSession: true,
        hasInitialPreset: true,
        sessionLastSaved: 1234567890,
        initialPresetSavedAt: 1234567890,
        sessionTabCount: 1,
        sessionGroupCount: 1,
        initialPresetTabCount: 1,
        initialPresetGroupCount: 1,
      });
    });

    test('세션 데이터가 없으면 적절한 기본값을 반환해야 한다', async () => {
      // Given
      mockStorageUtils.loadData.mockResolvedValue(null);

      // When
      const info = await SessionManager.getSessionInfo();

      // Then
      expect(info).toEqual({
        hasSession: false,
        hasInitialPreset: false,
        sessionLastSaved: null,
        initialPresetSavedAt: null,
        sessionTabCount: 0,
        sessionGroupCount: 0,
        initialPresetTabCount: 0,
        initialPresetGroupCount: 0,
      });
    });
  });

  describe('clearSession', () => {
    test('세션 데이터를 삭제해야 한다', async () => {
      // When
      await SessionManager.clearSession();

      // Then
      expect(mockStorageUtils.saveData).toHaveBeenCalledWith('session', null);
    });
  });

  describe('clearInitialPreset', () => {
    test('초기 프리셋 데이터를 삭제해야 한다', async () => {
      // When
      await SessionManager.clearInitialPreset();

      // Then
      expect(mockStorageUtils.saveData).toHaveBeenCalledWith(
        'initialPreset',
        null
      );
    });
  });
});
