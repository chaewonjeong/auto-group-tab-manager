import SettingsService from '../settings-service.js';

describe('SettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('설정 변경 시 적용 정책', () => {
    test('자동 그룹화 활성화 시 기존 탭 그룹화', () => {
      const key = 'autoGrouping';
      const oldValue = false;
      const newValue = true;
      const context = { hasExistingTabs: true };

      const result = SettingsService.applySettingChange(
        key,
        oldValue,
        newValue,
        context
      );
      expect(result.action).toBe('group-existing-tabs');
      expect(result.message).toContain('기존 탭들을 그룹화합니다');
      expect(result.shouldNotify).toBe(true);
    });

    test('자동 그룹화 비활성화 시 모든 그룹 해제', () => {
      const key = 'autoGrouping';
      const oldValue = true;
      const newValue = false;
      const context = { hasGroupedTabs: true };

      const result = SettingsService.applySettingChange(
        key,
        oldValue,
        newValue,
        context
      );
      expect(result.action).toBe('ungroup-all-tabs');
      expect(result.message).toContain('모든 탭 그룹이 해제됩니다');
      expect(result.confirmRequired).toBe(true);
    });

    test('제외 도메인 추가 시 해당 도메인 탭 그룹 해제', () => {
      const key = 'excludedDomains';
      const oldValue = ['localhost'];
      const newValue = ['localhost', 'github.com'];
      const context = {
        affectedTabs: [
          { id: 1, url: 'https://github.com/user/repo', groupId: 1 },
          { id: 2, url: 'https://github.com/other/repo', groupId: 1 },
        ],
      };

      const result = SettingsService.applySettingChange(
        key,
        oldValue,
        newValue,
        context
      );
      expect(result.action).toBe('ungroup-excluded-domains');
      expect(result.affectedTabIds).toEqual([1, 2]);
      expect(result.message).toContain(
        'github.com 도메인의 탭들이 그룹에서 해제됩니다'
      );
    });

    test('제외 도메인 제거 시 해당 도메인 탭 그룹화', () => {
      const key = 'excludedDomains';
      const oldValue = ['localhost', 'github.com'];
      const newValue = ['localhost'];
      const context = {
        affectedTabs: [
          { id: 1, url: 'https://github.com/user/repo', groupId: -1 },
          { id: 2, url: 'https://github.com/other/repo', groupId: -1 },
        ],
      };

      const result = SettingsService.applySettingChange(
        key,
        oldValue,
        newValue,
        context
      );
      expect(result.action).toBe('group-newly-included-domains');
      expect(result.affectedTabIds).toEqual([1, 2]);
      expect(result.message).toContain(
        'github.com 도메인의 탭들이 그룹화됩니다'
      );
    });

    test('세션 복원 모드 변경 시 다음 시작부터 적용', () => {
      const key = 'restoreMode';
      const oldValue = 'initial';
      const newValue = 'full';

      const result = SettingsService.applySettingChange(
        key,
        oldValue,
        newValue
      );
      expect(result.action).toBe('update-setting');
      expect(result.applyTiming).toBe('next-startup');
      expect(result.message).toContain('다음 브라우저 시작부터 적용됩니다');
    });

    test('알 수 없는 설정 키는 기본 처리', () => {
      const key = 'unknownSetting';
      const oldValue = 'old';
      const newValue = 'new';

      const result = SettingsService.applySettingChange(
        key,
        oldValue,
        newValue
      );
      expect(result.action).toBe('update-setting');
      expect(result.message).toBe('설정이 업데이트되었습니다');
    });
  });

  describe('설정 충돌 해결 정책', () => {
    test('동시 설정 변경 시 최신 값 우선', () => {
      const conflicts = [
        { key: 'autoGrouping', value: true, timestamp: 1000, source: 'popup' },
        {
          key: 'autoGrouping',
          value: false,
          timestamp: 2000,
          source: 'options',
        },
      ];

      const result = SettingsService.resolveSettingConflicts(conflicts);
      expect(result.resolvedValue).toBe(false);
      expect(result.winningSource).toBe('options');
      expect(result.resolution).toBe('latest-timestamp');
    });

    test('우선순위가 있는 소스의 경우 우선순위 적용', () => {
      const conflicts = [
        {
          key: 'excludedDomains',
          value: ['a.com'],
          timestamp: 2000,
          source: 'popup',
        },
        {
          key: 'excludedDomains',
          value: ['b.com'],
          timestamp: 1000,
          source: 'system',
        },
      ];
      const priorities = { system: 1, options: 2, popup: 3 };

      const result = SettingsService.resolveSettingConflicts(
        conflicts,
        priorities
      );
      expect(result.resolvedValue).toEqual(['b.com']);
      expect(result.winningSource).toBe('system');
      expect(result.resolution).toBe('source-priority');
    });

    test('배열 설정의 경우 병합 가능', () => {
      const conflicts = [
        {
          key: 'excludedDomains',
          value: ['a.com'],
          timestamp: 1000,
          source: 'popup',
        },
        {
          key: 'excludedDomains',
          value: ['b.com'],
          timestamp: 2000,
          source: 'options',
        },
      ];
      const mergeableKeys = ['excludedDomains'];

      const result = SettingsService.resolveSettingConflicts(
        conflicts,
        {},
        mergeableKeys
      );
      expect(result.resolvedValue).toEqual(['a.com', 'b.com']);
      expect(result.resolution).toBe('merged');
    });
  });

  describe('설정 유효성 검증 정책', () => {
    test('자동 그룹화 설정 검증', () => {
      const result = SettingsService.validateSetting('autoGrouping', true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('잘못된 자동 그룹화 설정 거부', () => {
      const result = SettingsService.validateSetting('autoGrouping', 'invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('autoGrouping은 boolean 값이어야 합니다');
    });

    test('제외 도메인 목록 검증', () => {
      const result = SettingsService.validateSetting('excludedDomains', [
        'google.com',
        'github.com',
      ]);
      expect(result.isValid).toBe(true);
    });

    test('잘못된 도메인 형식 거부', () => {
      const result = SettingsService.validateSetting('excludedDomains', [
        'invalid-domain',
        'google.com',
      ]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'invalid-domain은 유효한 도메인이 아닙니다'
      );
    });

    test('세션 복원 모드 검증', () => {
      const result = SettingsService.validateSetting('restoreMode', 'full');
      expect(result.isValid).toBe(true);
    });

    test('잘못된 복원 모드 거부', () => {
      const result = SettingsService.validateSetting('restoreMode', 'invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'restoreMode는 full 또는 initial이어야 합니다'
      );
    });
  });

  describe('설정 마이그레이션 정책', () => {
    test('구버전 설정을 신버전으로 마이그레이션', () => {
      const oldSettings = {
        version: '1.0',
        enableAutoGrouping: true, // 구버전 키
        domainBlacklist: ['localhost'], // 구버전 키
      };

      const result = SettingsService.migrateSettings(oldSettings);
      expect(result.version).toBe('2.0');
      expect(result.autoGrouping).toBe(true);
      expect(result.excludedDomains).toEqual(['localhost']);
      expect(result.enableAutoGrouping).toBeUndefined();
      expect(result.domainBlacklist).toBeUndefined();
    });

    test('이미 최신 버전인 경우 변경하지 않음', () => {
      const currentSettings = {
        version: '2.0',
        autoGrouping: true,
        excludedDomains: ['localhost'],
      };

      const result = SettingsService.migrateSettings(currentSettings);
      expect(result).toEqual(currentSettings);
    });

    test('버전 정보가 없는 경우 기본값으로 초기화', () => {
      const invalidSettings = {
        someRandomKey: 'value',
      };

      const result = SettingsService.migrateSettings(invalidSettings);
      expect(result.version).toBe('2.0');
      expect(result.autoGrouping).toBe(true);
      expect(result.excludedDomains).toEqual([]);
    });
  });

  describe('설정 백업 및 복원 정책', () => {
    test('중요한 설정 변경 전 백업 생성', () => {
      const key = 'excludedDomains';
      const currentValue = ['google.com'];
      const newValue = [];

      const result = SettingsService.shouldBackupBeforeChange(
        key,
        currentValue,
        newValue
      );
      expect(result.shouldBackup).toBe(true);
      expect(result.reason).toBe('중요한 설정 변경으로 인한 백업');
    });

    test('사소한 설정 변경은 백업하지 않음', () => {
      const key = 'showNotifications';
      const currentValue = true;
      const newValue = false;

      const result = SettingsService.shouldBackupBeforeChange(
        key,
        currentValue,
        newValue
      );
      expect(result.shouldBackup).toBe(false);
    });

    test('설정 복원 시 유효성 검증', () => {
      const backupData = {
        version: '2.0',
        autoGrouping: true,
        excludedDomains: ['google.com'],
        timestamp: Date.now(),
      };

      const result = SettingsService.validateBackupData(backupData);
      expect(result.isValid).toBe(true);
      expect(result.canRestore).toBe(true);
    });

    test('손상된 백업 데이터 거부', () => {
      const corruptedBackup = {
        version: '2.0',
        autoGrouping: 'invalid',
        excludedDomains: 'not-an-array',
      };

      const result = SettingsService.validateBackupData(corruptedBackup);
      expect(result.isValid).toBe(false);
      expect(result.canRestore).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('설정 변경 영향 분석 정책', () => {
    test('자동 그룹화 비활성화의 영향 분석', () => {
      const change = { key: 'autoGrouping', from: true, to: false };
      const context = {
        currentGroupCount: 5,
        currentTabCount: 20,
        groupedTabCount: 15,
      };

      const result = SettingsService.analyzeSettingImpact(change, context);
      expect(result.severity).toBe('high');
      expect(result.affectedFeatures).toContain('automatic-tab-grouping');
      expect(result.affectedTabCount).toBe(15);
      expect(result.reversible).toBe(true);
    });

    test('제외 도메인 추가의 영향 분석', () => {
      const change = {
        key: 'excludedDomains',
        from: ['localhost'],
        to: ['localhost', 'github.com'],
      };
      const context = {
        affectedTabs: [
          { url: 'https://github.com/repo1' },
          { url: 'https://github.com/repo2' },
        ],
      };

      const result = SettingsService.analyzeSettingImpact(change, context);
      expect(result.severity).toBe('medium');
      expect(result.affectedTabCount).toBe(2);
      expect(result.affectedDomains).toEqual(['github.com']);
    });

    test('사소한 설정 변경의 영향 분석', () => {
      const change = { key: 'showNotifications', from: true, to: false };
      const context = {};

      const result = SettingsService.analyzeSettingImpact(change, context);
      expect(result.severity).toBe('low');
      expect(result.affectedTabCount).toBe(0);
      expect(result.requiresConfirmation).toBe(false);
    });
  });
});
