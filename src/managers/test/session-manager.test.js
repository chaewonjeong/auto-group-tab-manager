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

describe('SessionManager', () => {
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

  describe('restoreSession', () => {
    test('전체 복원 모드에서 세션을 복원해야 한다', async () => {
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
      chrome.windows.create.mockResolvedValue({ id: 1 });
      chrome.tabGroups.create.mockResolvedValue({ id: 1 });
      chrome.tabs.create.mockResolvedValue({ id: 1 });

      // When
      await SessionManager.restoreSession('full');

      // Then
      expect(chrome.windows.create).toHaveBeenCalled();
      expect(chrome.tabGroups.create).toHaveBeenCalledWith({
        windowId: 1,
      });
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://google.com',
        pinned: false,
        windowId: 1,
      });
    });

    test('복원할 데이터가 없으면 아무것도 하지 않아야 한다', async () => {
      // Given
      mockStorageUtils.loadData.mockResolvedValue(null);

      // When
      await SessionManager.restoreSession('full');

      // Then
      expect(chrome.windows.create).not.toHaveBeenCalled();
    });
  });

  describe('initializeSessionListeners', () => {
    test('브라우저 시작 이벤트 리스너를 등록해야 한다', () => {
      // When
      SessionManager.initializeSessionListeners();

      // Then
      expect(chrome.runtime.onStartup.addListener).toHaveBeenCalled();
      expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    });
  });

  describe('getSessionInfo', () => {
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
