// StorageUtils 모킹
const mockStorageUtils = {
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
  loadData: jest.fn(),
  saveData: jest.fn(),
  savePreset: jest.fn(),
  loadPresets: jest.fn(),
  loadPreset: jest.fn(),
  deletePreset: jest.fn(),
};

// 모듈 모킹
jest.doMock('../../utils/storage-utils.js', () => ({
  default: mockStorageUtils,
}));

// 모킹 후 모듈 import
const PresetManager = require('../preset-manager.js').default;

describe('PresetManager', () => {
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
        sendMessage: jest.fn(),
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
    mockStorageUtils.savePreset.mockResolvedValue(true);
    mockStorageUtils.loadPresets.mockResolvedValue({});
    mockStorageUtils.loadPreset.mockResolvedValue(null);
    mockStorageUtils.deletePreset.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveCurrentAsPreset', () => {
    test('현재 탭 상태를 프리셋으로 저장해야 한다', async () => {
      // Given
      const presetName = 'work-setup';
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
      const result = await PresetManager.saveCurrentAsPreset(presetName);

      // Then
      expect(result).toBe(true);
      expect(mockStorageUtils.savePreset).toHaveBeenCalledWith(presetName, {
        tabs: mockTabs,
        groups: mockGroups,
      });
    });

    test('프리셋 저장 중 오류가 발생하면 false를 반환해야 한다', async () => {
      // Given
      chrome.tabs.query.mockRejectedValue(new Error('Query failed'));

      // When
      const result = await PresetManager.saveCurrentAsPreset('test');

      // Then
      expect(result).toBe(false);
    });
  });

  describe('loadPreset', () => {
    test('프리셋을 로드해야 한다', async () => {
      // Given
      const presetName = 'work-setup';
      const mockPreset = {
        name: 'work-setup',
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

      mockStorageUtils.loadPreset.mockResolvedValue(mockPreset);

      // When
      const result = await PresetManager.loadPreset(presetName);

      // Then
      expect(result).toEqual(mockPreset);
      expect(mockStorageUtils.loadPreset).toHaveBeenCalledWith(presetName);
    });

    test('존재하지 않는 프리셋을 로드하면 null을 반환해야 한다', async () => {
      // Given
      mockStorageUtils.loadPreset.mockResolvedValue(null);

      // When
      const result = await PresetManager.loadPreset('non-existent');

      // Then
      expect(result).toBeNull();
    });
  });

  describe('restorePreset', () => {
    test('프리셋을 새 윈도우에서 복원해야 한다', async () => {
      // Given
      const presetName = 'work-setup';
      const mockPreset = {
        name: 'work-setup',
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

      mockStorageUtils.loadPreset.mockResolvedValue(mockPreset);
      chrome.windows.create.mockResolvedValue({ id: 1 });
      chrome.tabGroups.create.mockResolvedValue({ id: 1 });
      chrome.tabs.create.mockResolvedValue({ id: 1 });

      // When
      const result = await PresetManager.restorePreset(presetName);

      // Then
      expect(result).toBe(true);
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

    test('고정 탭 정보를 포함하여 복원해야 한다', async () => {
      // Given
      const presetName = 'pinned-setup';
      const mockPreset = {
        name: 'pinned-setup',
        tabs: [
          {
            id: 1,
            url: 'https://google.com',
            title: 'Google',
            pinned: true,
            groupId: 1,
          },
        ],
        groups: [{ id: 1, title: 'google', color: 'blue', collapsed: false }],
      };

      mockStorageUtils.loadPreset.mockResolvedValue(mockPreset);
      chrome.windows.create.mockResolvedValue({ id: 1 });
      chrome.tabGroups.create.mockResolvedValue({ id: 1 });
      chrome.tabs.create.mockResolvedValue({ id: 1 });

      // When
      await PresetManager.restorePreset(presetName);

      // Then
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://google.com',
        pinned: true,
        windowId: 1,
      });
    });

    test('존재하지 않는 프리셋 복원 시 false를 반환해야 한다', async () => {
      // Given
      mockStorageUtils.loadPreset.mockResolvedValue(null);

      // When
      const result = await PresetManager.restorePreset('non-existent');

      // Then
      expect(result).toBe(false);
      expect(chrome.windows.create).not.toHaveBeenCalled();
    });
  });

  describe('getAllPresets', () => {
    test('모든 프리셋 목록을 반환해야 한다', async () => {
      // Given
      const mockPresets = {
        'work-setup': {
          name: 'work-setup',
          tabs: [{ url: 'https://google.com' }],
          groups: [{ title: 'google' }],
        },
        'dev-setup': {
          name: 'dev-setup',
          tabs: [{ url: 'https://github.com' }],
          groups: [{ title: 'github' }],
        },
      };

      mockStorageUtils.loadPresets.mockResolvedValue(mockPresets);

      // When
      const result = await PresetManager.getAllPresets();

      // Then
      expect(result).toEqual(mockPresets);
    });

    test('프리셋이 없으면 빈 객체를 반환해야 한다', async () => {
      // Given
      mockStorageUtils.loadPresets.mockResolvedValue({});

      // When
      const result = await PresetManager.getAllPresets();

      // Then
      expect(result).toEqual({});
    });
  });

  describe('deletePreset', () => {
    test('프리셋을 삭제해야 한다', async () => {
      // Given
      const presetName = 'work-setup';
      mockStorageUtils.deletePreset.mockResolvedValue(true);

      // When
      const result = await PresetManager.deletePreset(presetName);

      // Then
      expect(result).toBe(true);
      expect(mockStorageUtils.deletePreset).toHaveBeenCalledWith(presetName);
    });

    test('존재하지 않는 프리셋 삭제 시 false를 반환해야 한다', async () => {
      // Given
      mockStorageUtils.deletePreset.mockResolvedValue(false);

      // When
      const result = await PresetManager.deletePreset('non-existent');

      // Then
      expect(result).toBe(false);
    });
  });

  describe('validatePresetData', () => {
    test('유효한 프리셋 데이터를 검증해야 한다', () => {
      // Given
      const validPreset = {
        name: 'test-preset',
        tabs: [
          {
            url: 'https://google.com',
            title: 'Google',
            pinned: false,
            groupId: 1,
          },
        ],
        groups: [{ id: 1, title: 'google', color: 'blue', collapsed: false }],
      };

      // When
      const result = PresetManager.validatePresetData(validPreset);

      // Then
      expect(result).toBe(true);
    });

    test('잘못된 프리셋 데이터를 거부해야 한다', () => {
      // Given
      const invalidPreset = {
        name: 'test-preset',
        // tabs와 groups가 없음
      };

      // When
      const result = PresetManager.validatePresetData(invalidPreset);

      // Then
      expect(result).toBe(false);
    });

    test('빈 이름의 프리셋을 거부해야 한다', () => {
      // Given
      const invalidPreset = {
        name: '',
        tabs: [],
        groups: [],
      };

      // When
      const result = PresetManager.validatePresetData(invalidPreset);

      // Then
      expect(result).toBe(false);
    });
  });

  describe('getPresetInfo', () => {
    test('프리셋 정보를 반환해야 한다', async () => {
      // Given
      const presetName = 'work-setup';
      const mockPreset = {
        name: 'work-setup',
        tabs: [{ url: 'https://google.com' }, { url: 'https://github.com' }],
        groups: [{ title: 'google' }, { title: 'github' }],
        createdAt: 1234567890,
        updatedAt: 1234567890,
      };

      mockStorageUtils.loadPreset.mockResolvedValue(mockPreset);

      // When
      const result = await PresetManager.getPresetInfo(presetName);

      // Then
      expect(result).toEqual({
        name: 'work-setup',
        tabCount: 2,
        groupCount: 2,
        createdAt: 1234567890,
        updatedAt: 1234567890,
        exists: true,
      });
    });

    test('존재하지 않는 프리셋 정보 요청 시 기본값을 반환해야 한다', async () => {
      // Given
      mockStorageUtils.loadPreset.mockResolvedValue(null);

      // When
      const result = await PresetManager.getPresetInfo('non-existent');

      // Then
      expect(result).toEqual({
        name: 'non-existent',
        tabCount: 0,
        groupCount: 0,
        createdAt: null,
        updatedAt: null,
        exists: false,
      });
    });
  });
});
