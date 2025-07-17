import StorageUtils from '../storage-utils.js';

// Chrome Storage API Mock 설정
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
      getBytesInUse: jest.fn(),
      QUOTA_BYTES: 5242880, // 5MB
    },
  },
};

describe('StorageUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveSettings', () => {
    it('설정을 성공적으로 저장해야 한다', async () => {
      const mockSettings = {
        autoGrouping: true,
        excludedDomains: ['localhost'],
      };

      chrome.storage.local.set.mockResolvedValue();
      const result = await StorageUtils.saveSettings(mockSettings);

      expect(result).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        settings: mockSettings,
      });
    });

    it('저장 실패 시 false를 반환해야 한다', async () => {
      const mockSettings = { autoGrouping: true };
      chrome.storage.local.set.mockRejectedValue(new Error('Storage Error'));

      const result = await StorageUtils.saveSettings(mockSettings);

      expect(result).toBe(false);
    });
  });

  describe('loadSettings', () => {
    it('저장된 설정을 성공적으로 로드해야 한다', async () => {
      const mockSettings = {
        autoGrouping: true,
        excludedDomains: ['localhost'],
      };

      chrome.storage.local.get.mockResolvedValue({ settings: mockSettings });
      const result = await StorageUtils.loadSettings();

      expect(result).toEqual(mockSettings);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('settings');
    });

    it('설정이 없으면 null을 반환해야 한다', async () => {
      chrome.storage.local.get.mockResolvedValue({});
      const result = await StorageUtils.loadSettings();

      expect(result).toBeNull();
    });

    it('로드 실패 시 null을 반환해야 한다', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage Error'));
      const result = await StorageUtils.loadSettings();

      expect(result).toBeNull();
    });
  });

  describe('savePreset', () => {
    it('프리셋을 성공적으로 저장해야 한다', async () => {
      const presetName = 'work-setup';
      const presetData = {
        groups: [{ name: 'google', tabs: ['https://gmail.com'] }],
      };

      chrome.storage.local.get.mockResolvedValue({ presets: {} });
      chrome.storage.local.set.mockResolvedValue();

      const result = await StorageUtils.savePreset(presetName, presetData);

      expect(result).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        presets: {
          [presetName]: {
            name: presetName,
            ...presetData,
            createdAt: expect.any(Number),
            updatedAt: expect.any(Number),
          },
        },
      });
    });

    it('기존 프리셋이 있을 때 새 프리셋을 추가해야 한다', async () => {
      const existingPresets = {
        'existing-preset': { name: 'existing-preset' },
      };
      const newPresetName = 'new-preset';
      const newPresetData = { groups: [] };

      chrome.storage.local.get.mockResolvedValue({
        presets: existingPresets,
      });
      chrome.storage.local.set.mockResolvedValue();

      const result = await StorageUtils.savePreset(
        newPresetName,
        newPresetData
      );

      expect(result).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        presets: {
          ...existingPresets,
          [newPresetName]: {
            name: newPresetName,
            ...newPresetData,
            createdAt: expect.any(Number),
            updatedAt: expect.any(Number),
          },
        },
      });
    });

    it('저장 실패 시 false를 반환해야 한다', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage Error'));
      const result = await StorageUtils.savePreset('test', {});

      expect(result).toBe(false);
    });
  });

  describe('loadPresets', () => {
    it('모든 프리셋을 성공적으로 로드해야 한다', async () => {
      const mockPresets = {
        preset1: { name: 'preset1' },
        preset2: { name: 'preset2' },
      };

      chrome.storage.local.get.mockResolvedValue({ presets: mockPresets });
      const result = await StorageUtils.loadPresets();

      expect(result).toEqual(mockPresets);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('presets');
    });

    it('프리셋이 없으면 빈 객체를 반환해야 한다', async () => {
      chrome.storage.local.get.mockResolvedValue({});
      const result = await StorageUtils.loadPresets();

      expect(result).toEqual({});
    });

    it('로드 실패 시 빈 객체를 반환해야 한다', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage Error'));
      const result = await StorageUtils.loadPresets();

      expect(result).toEqual({});
    });
  });

  describe('loadPreset', () => {
    it('특정 프리셋을 성공적으로 로드해야 한다', async () => {
      const mockPreset = { name: 'work-setup', groups: [] };
      const mockPresets = { 'work-setup': mockPreset };

      chrome.storage.local.get.mockResolvedValue({ presets: mockPresets });
      const result = await StorageUtils.loadPreset('work-setup');

      expect(result).toEqual(mockPreset);
    });

    it('존재하지 않는 프리셋에 대해 null을 반환해야 한다', async () => {
      chrome.storage.local.get.mockResolvedValue({ presets: {} });
      const result = await StorageUtils.loadPreset('non-existent');

      expect(result).toBeNull();
    });

    it('로드 실패 시 null을 반환해야 한다', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage Error'));
      const result = await StorageUtils.loadPreset('test');

      expect(result).toBeNull();
    });
  });

  describe('deletePreset', () => {
    it('프리셋을 성공적으로 삭제해야 한다', async () => {
      const mockPresets = {
        preset1: { name: 'preset1' },
        preset2: { name: 'preset2' },
      };

      chrome.storage.local.get.mockResolvedValue({ presets: mockPresets });
      chrome.storage.local.set.mockResolvedValue();

      const result = await StorageUtils.deletePreset('preset1');

      expect(result).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        presets: { preset2: { name: 'preset2' } },
      });
    });

    it('존재하지 않는 프리셋 삭제 시 false를 반환해야 한다', async () => {
      chrome.storage.local.get.mockResolvedValue({ presets: {} });
      const result = await StorageUtils.deletePreset('non-existent');

      expect(result).toBe(false);
    });

    it('삭제 실패 시 false를 반환해야 한다', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage Error'));
      const result = await StorageUtils.deletePreset('test');

      expect(result).toBe(false);
    });
  });

  describe('saveSession', () => {
    it('세션을 성공적으로 저장해야 한다', async () => {
      const mockSessionData = {
        groups: [{ id: 1, name: 'google' }],
        tabs: [{ id: 1, url: 'https://google.com' }],
      };

      chrome.storage.local.set.mockResolvedValue();
      const result = await StorageUtils.saveSession(mockSessionData);

      expect(result).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        session: {
          ...mockSessionData,
          lastSaved: expect.any(Number),
        },
      });
    });

    it('저장 실패 시 false를 반환해야 한다', async () => {
      chrome.storage.local.set.mockRejectedValue(new Error('Storage Error'));
      const result = await StorageUtils.saveSession({});

      expect(result).toBe(false);
    });
  });

  describe('loadSession', () => {
    it('세션을 성공적으로 로드해야 한다', async () => {
      const mockSession = {
        groups: [],
        tabs: [],
        lastSaved: Date.now(),
      };

      chrome.storage.local.get.mockResolvedValue({ session: mockSession });
      const result = await StorageUtils.loadSession();

      expect(result).toEqual(mockSession);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('session');
    });

    it('세션이 없으면 null을 반환해야 한다', async () => {
      chrome.storage.local.get.mockResolvedValue({});
      const result = await StorageUtils.loadSession();

      expect(result).toBeNull();
    });

    it('로드 실패 시 null을 반환해야 한다', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage Error'));
      const result = await StorageUtils.loadSession();

      expect(result).toBeNull();
    });
  });

  describe('saveDomainColors', () => {
    it('도메인 색상 매핑을 성공적으로 저장해야 한다', async () => {
      const mockColorMapping = {
        'google.com': 'blue',
        'github.com': 'grey',
      };

      chrome.storage.local.set.mockResolvedValue();
      const result = await StorageUtils.saveDomainColors(mockColorMapping);

      expect(result).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        domainColors: mockColorMapping,
      });
    });

    it('저장 실패 시 false를 반환해야 한다', async () => {
      chrome.storage.local.set.mockRejectedValue(new Error('Storage Error'));
      const result = await StorageUtils.saveDomainColors({});

      expect(result).toBe(false);
    });
  });

  describe('loadDomainColors', () => {
    it('도메인 색상 매핑을 성공적으로 로드해야 한다', async () => {
      const mockColorMapping = {
        'google.com': 'blue',
        'github.com': 'grey',
      };

      chrome.storage.local.get.mockResolvedValue({
        domainColors: mockColorMapping,
      });
      const result = await StorageUtils.loadDomainColors();

      expect(result).toEqual(mockColorMapping);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('domainColors');
    });

    it('매핑이 없으면 빈 객체를 반환해야 한다', async () => {
      chrome.storage.local.get.mockResolvedValue({});
      const result = await StorageUtils.loadDomainColors();

      expect(result).toEqual({});
    });

    it('로드 실패 시 빈 객체를 반환해야 한다', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage Error'));
      const result = await StorageUtils.loadDomainColors();

      expect(result).toEqual({});
    });
  });

  describe('clearAllData', () => {
    it('모든 데이터를 성공적으로 삭제해야 한다', async () => {
      chrome.storage.local.clear.mockResolvedValue();
      const result = await StorageUtils.clearAllData();

      expect(result).toBe(true);
      expect(chrome.storage.local.clear).toHaveBeenCalled();
    });

    it('삭제 실패 시 false를 반환해야 한다', async () => {
      chrome.storage.local.clear.mockRejectedValue(new Error('Storage Error'));
      const result = await StorageUtils.clearAllData();

      expect(result).toBe(false);
    });
  });

  describe('getStorageUsage', () => {
    it('저장소 사용량을 성공적으로 반환해야 한다', async () => {
      const mockUsage = 1024; // 1KB
      chrome.storage.local.getBytesInUse.mockResolvedValue(mockUsage);

      const result = await StorageUtils.getStorageUsage();

      expect(result).toEqual({
        bytesInUse: mockUsage,
        quota: chrome.storage.local.QUOTA_BYTES,
        percentUsed: (mockUsage / chrome.storage.local.QUOTA_BYTES) * 100,
      });
      expect(chrome.storage.local.getBytesInUse).toHaveBeenCalled();
    });

    it('사용량 조회 실패 시 기본값을 반환해야 한다', async () => {
      chrome.storage.local.getBytesInUse.mockRejectedValue(
        new Error('Storage Error')
      );

      const result = await StorageUtils.getStorageUsage();

      expect(result).toEqual({
        bytesInUse: 0,
        quota: 0,
        percentUsed: 0,
      });
    });
  });
});
