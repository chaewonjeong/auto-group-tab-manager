import PresetService from '../preset-service.js';
import StorageUtils from '../../utils/storage-utils.js';

// Chrome API 모킹
global.chrome = {
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    group: jest.fn(),
  },
  tabGroups: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  windows: {
    create: jest.fn(),
  },
};

// StorageUtils 모킹
jest.mock('../../utils/storage-utils.js');

describe('PresetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('프리셋 이름 유효성 검증 정책', () => {
    test('유효한 프리셋 이름을 허용해야 함', () => {
      const result = PresetService.validatePresetName('work-setup', {});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('빈 문자열 이름을 거부해야 함', () => {
      const result = PresetService.validatePresetName('', {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('프리셋 이름은 비어있을 수 없습니다');
    });

    test('공백만 있는 이름을 거부해야 함', () => {
      const result = PresetService.validatePresetName('   ', {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('프리셋 이름은 비어있을 수 없습니다');
    });

    test('중복된 이름을 거부해야 함', () => {
      const existingPresets = { 'work-setup': {} };
      const result = PresetService.validatePresetName(
        'work-setup',
        existingPresets
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('이미 존재하는 프리셋 이름입니다');
    });

    test('특수문자가 포함된 이름을 거부해야 함', () => {
      const result = PresetService.validatePresetName('work/setup', {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        '프리셋 이름에는 특수문자를 사용할 수 없습니다'
      );
    });

    test('너무 긴 이름을 거부해야 함', () => {
      const longName = 'a'.repeat(51);
      const result = PresetService.validatePresetName(longName, {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        '프리셋 이름은 50자를 초과할 수 없습니다'
      );
    });
  });

  describe('프리셋 데이터 필터링 정책', () => {
    const mockTabs = [
      { url: 'https://google.com', title: 'Google', pinned: false, groupId: 1 },
      { url: 'https://github.com', title: 'GitHub', pinned: true, groupId: 2 },
      {
        url: 'chrome://extensions/',
        title: 'Extensions',
        pinned: false,
        groupId: -1,
      },
      { url: 'about:blank', title: 'New Tab', pinned: false, groupId: -1 },
    ];

    const mockGroups = [
      { id: 1, title: 'google', color: 'blue', collapsed: false },
      { id: 2, title: 'github', color: 'grey', collapsed: false },
    ];

    const mockSettings = {
      includeSystemTabs: false,
      includePinnedTabs: true,
      includeEmptyGroups: false,
    };

    test('시스템 탭을 제외해야 함', () => {
      const result = PresetService.filterPresetData(
        mockTabs,
        mockGroups,
        mockSettings
      );

      const systemUrls = result.tabs.map((tab) => tab.url);
      expect(systemUrls).not.toContain('chrome://extensions/');
      expect(systemUrls).not.toContain('about:blank');
    });

    test('고정 탭을 포함해야 함', () => {
      const result = PresetService.filterPresetData(
        mockTabs,
        mockGroups,
        mockSettings
      );

      const pinnedTab = result.tabs.find((tab) => tab.pinned);
      expect(pinnedTab).toBeDefined();
      expect(pinnedTab.url).toBe('https://github.com');
    });

    test('고정 탭 제외 설정 시 고정 탭을 제외해야 함', () => {
      const settings = { ...mockSettings, includePinnedTabs: false };
      const result = PresetService.filterPresetData(
        mockTabs,
        mockGroups,
        settings
      );

      const pinnedTab = result.tabs.find((tab) => tab.pinned);
      expect(pinnedTab).toBeUndefined();
    });

    test('빈 그룹을 제외해야 함', () => {
      const tabsWithoutGroup2 = mockTabs.filter((tab) => tab.groupId !== 2);
      const result = PresetService.filterPresetData(
        tabsWithoutGroup2,
        mockGroups,
        mockSettings
      );

      const group2 = result.groups.find((group) => group.id === 2);
      expect(group2).toBeUndefined();
    });

    test('유효한 탭과 그룹만 포함해야 함', () => {
      const result = PresetService.filterPresetData(
        mockTabs,
        mockGroups,
        mockSettings
      );

      expect(result.tabs).toHaveLength(2);
      expect(result.groups).toHaveLength(2);
      expect(result.tabs.every((tab) => tab.url.startsWith('https://'))).toBe(
        true
      );
    });
  });

  describe('복원 충돌 해결 정책', () => {
    test('동일한 URL의 탭이 있는 경우 기존 탭 유지', () => {
      const existingTabs = [
        { url: 'https://google.com', title: 'Google - Existing', id: 1 },
      ];
      const presetTabs = [
        { url: 'https://google.com', title: 'Google - Preset', id: 2 },
        { url: 'https://github.com', title: 'GitHub', id: 3 },
      ];

      const result = PresetService.resolveRestoreConflicts(
        existingTabs,
        presetTabs
      );

      expect(result.tabsToCreate).toHaveLength(1);
      expect(result.tabsToCreate[0].url).toBe('https://github.com');
      expect(result.conflictingTabs).toHaveLength(1);
      expect(result.conflictingTabs[0].existing.title).toBe(
        'Google - Existing'
      );
    });

    test('동일한 제목의 그룹이 있는 경우 병합', () => {
      const existingGroups = [{ title: 'work', color: 'blue', id: 1 }];
      const presetGroups = [
        { title: 'work', color: 'red', id: 2 },
        { title: 'personal', color: 'green', id: 3 },
      ];

      const result = PresetService.resolveRestoreConflicts(
        [],
        [],
        existingGroups,
        presetGroups
      );

      expect(result.groupsToCreate).toHaveLength(1);
      expect(result.groupsToCreate[0].title).toBe('personal');
      expect(result.conflictingGroups).toHaveLength(1);
      expect(result.conflictingGroups[0].existing.color).toBe('blue');
    });

    test('충돌 해결 정책 선택', () => {
      const conflicts = {
        tabsToCreate: [{ url: 'https://github.com' }],
        groupsToCreate: [{ title: 'work' }],
        conflictingTabs: [
          {
            existing: { url: 'https://google.com' },
            preset: { url: 'https://google.com' },
          },
        ],
        conflictingGroups: [
          {
            existing: { title: 'personal' },
            preset: { title: 'personal' },
          },
        ],
      };

      const policy = 'skip-existing';
      const result = PresetService.applyConflictResolutionPolicy(
        conflicts,
        policy
      );

      expect(result.tabsToCreate).toHaveLength(1);
      expect(result.groupsToCreate).toHaveLength(1);
      expect(result.tabsToSkip).toHaveLength(1);
      expect(result.groupsToSkip).toHaveLength(1);
    });
  });

  describe('프리셋 저장 정책', () => {
    test('저장할 데이터 결정', () => {
      const tabs = [
        { url: 'https://google.com', title: 'Google' },
        { url: 'chrome://extensions/', title: 'Extensions' },
      ];
      const groups = [{ title: 'work', color: 'blue' }];
      const settings = { includeSystemTabs: false };

      const result = PresetService.determineDataToSave(tabs, groups, settings);

      expect(result.shouldSave).toBe(true);
      expect(result.filteredTabs).toHaveLength(1);
      expect(result.filteredGroups).toHaveLength(1);
    });

    test('빈 데이터는 저장하지 않음', () => {
      const result = PresetService.determineDataToSave([], [], {});

      expect(result.shouldSave).toBe(false);
      expect(result.reason).toBe('저장할 탭이나 그룹이 없습니다');
    });

    test('프리셋 메타데이터 생성', () => {
      const presetData = {
        tabs: [{ url: 'https://google.com' }],
        groups: [{ title: 'work' }],
      };

      const result = PresetService.generatePresetMetadata(
        'work-setup',
        presetData
      );

      expect(result.name).toBe('work-setup');
      expect(result.createdAt).toBeDefined();
      expect(result.tabCount).toBe(1);
      expect(result.groupCount).toBe(1);
    });
  });

  describe('프리셋 복원 정책', () => {
    test('복원 모드 결정', () => {
      const settings = { defaultRestoreMode: 'new-window' };
      const userChoice = 'current-window';

      const result = PresetService.determineRestoreMode(settings, userChoice);
      expect(result).toBe('current-window');
    });

    test('기본 복원 모드 사용', () => {
      const settings = { defaultRestoreMode: 'new-window' };

      const result = PresetService.determineRestoreMode(settings);
      expect(result).toBe('new-window');
    });

    test('복원 전 검증', () => {
      const presetData = {
        tabs: [{ url: 'https://google.com' }],
        groups: [{ title: 'work' }],
      };

      const result = PresetService.validatePresetForRestore(presetData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('손상된 프리셋 데이터 검증', () => {
      const presetData = {
        tabs: [{ url: '' }], // 빈 URL
        groups: [{ title: '' }], // 빈 제목
      };

      const result = PresetService.validatePresetForRestore(presetData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('프리셋 관리 정책', () => {
    test('프리셋 삭제 가능 여부 확인', () => {
      const presetName = 'work-setup';
      const settings = { protectedPresets: ['default'] };

      const result = PresetService.canDeletePreset(presetName, settings);
      expect(result.canDelete).toBe(true);
    });

    test('보호된 프리셋 삭제 방지', () => {
      const presetName = 'default';
      const settings = { protectedPresets: ['default'] };

      const result = PresetService.canDeletePreset(presetName, settings);
      expect(result.canDelete).toBe(false);
      expect(result.reason).toBe('보호된 프리셋은 삭제할 수 없습니다');
    });

    test('프리셋 업데이트 가능 여부 확인', () => {
      const presetName = 'work-setup';
      const newData = { tabs: [], groups: [] };
      const settings = { allowEmptyPresets: false };

      const result = PresetService.canUpdatePreset(
        presetName,
        newData,
        settings
      );
      expect(result.canUpdate).toBe(false);
      expect(result.reason).toBe('빈 프리셋은 허용되지 않습니다');
    });
  });
});
