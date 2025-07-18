import SessionService from '../session-service.js';
import StorageUtils from '../../utils/storage-utils.js';

// Chrome API 모킹
global.chrome = {
  runtime: {
    onStartup: {
      addListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
  },
  windows: {
    create: jest.fn(),
  },
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
};

// StorageUtils 모킹
jest.mock('../../utils/storage-utils.js');

describe('SessionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('세션 저장 정책', () => {
    test('브라우저 종료 시 자동 저장이 활성화된 경우 저장해야 함', () => {
      const settings = { autoSave: true, saveOnBrowserClose: true };
      const result = SessionService.shouldSaveSession(
        'browser-close',
        settings
      );
      expect(result).toBe(true);
    });

    test('수동 저장이 활성화된 경우 수동 저장 허용', () => {
      const settings = { autoSave: true, manualSaveEnabled: true };
      const result = SessionService.shouldSaveSession('manual', settings);
      expect(result).toBe(true);
    });

    test('자동 저장이 비활성화된 경우 저장하지 않음', () => {
      const settings = { autoSave: false };
      const result = SessionService.shouldSaveSession(
        'browser-close',
        settings
      );
      expect(result).toBe(false);
    });

    test('알 수 없는 트리거의 경우 저장하지 않음', () => {
      const settings = { autoSave: true };
      const result = SessionService.shouldSaveSession(
        'unknown-trigger',
        settings
      );
      expect(result).toBe(false);
    });
  });

  describe('복원 모드 결정 정책', () => {
    test('시작 시 전체 복원 모드가 설정된 경우 full 모드 반환', () => {
      const settings = { restoreMode: 'full' };
      const result = SessionService.determineRestoreMode(settings, 'startup');
      expect(result).toBe('full');
    });

    test('시작 시 초기 설정 복원 모드가 설정된 경우 initial 모드 반환', () => {
      const settings = { restoreMode: 'initial' };
      const result = SessionService.determineRestoreMode(settings, 'startup');
      expect(result).toBe('initial');
    });

    test('수동 복원 시 설정에 관계없이 요청된 모드 반환', () => {
      const settings = { restoreMode: 'full' };
      const result = SessionService.determineRestoreMode(
        settings,
        'manual',
        'initial'
      );
      expect(result).toBe('initial');
    });

    test('설정이 없는 경우 기본값으로 initial 모드 반환', () => {
      const settings = {};
      const result = SessionService.determineRestoreMode(settings, 'startup');
      expect(result).toBe('initial');
    });
  });

  describe('복원 데이터 필터링 정책', () => {
    const mockSessionData = {
      tabs: [
        { url: 'https://google.com', title: 'Google' },
        { url: 'https://github.com', title: 'GitHub' },
      ],
      groups: [{ id: 1, title: 'work', color: 'blue' }],
    };

    const mockInitialPreset = {
      tabs: [
        { url: 'https://google.com', title: 'Google' },
        { url: 'https://stackoverflow.com', title: 'Stack Overflow' },
      ],
      groups: [
        { id: 1, title: 'work', color: 'blue' },
        { id: 2, title: 'dev', color: 'red' },
      ],
    };

    test('full 모드에서 세션 데이터와 누락된 초기 프리셋 항목을 모두 포함', () => {
      const result = SessionService.filterRestoreData(
        mockSessionData,
        mockInitialPreset,
        'full'
      );

      expect(result.sessionData).toEqual(mockSessionData);
      expect(result.missingFromInitial.tabs).toHaveLength(1);
      expect(result.missingFromInitial.tabs[0].url).toBe(
        'https://stackoverflow.com'
      );
      expect(result.missingFromInitial.groups).toHaveLength(1);
      expect(result.missingFromInitial.groups[0].title).toBe('dev');
    });

    test('initial 모드에서 초기 프리셋 데이터만 반환', () => {
      const result = SessionService.filterRestoreData(
        mockSessionData,
        mockInitialPreset,
        'initial'
      );

      expect(result.sessionData).toBeNull();
      expect(result.initialPreset).toEqual(mockInitialPreset);
    });

    test('세션 데이터가 없는 경우 초기 프리셋만 반환', () => {
      const result = SessionService.filterRestoreData(
        null,
        mockInitialPreset,
        'full'
      );

      expect(result.sessionData).toBeNull();
      expect(result.initialPreset).toEqual(mockInitialPreset);
      expect(result.missingFromInitial).toBeNull();
    });

    test('초기 프리셋이 없는 경우 세션 데이터만 반환', () => {
      const result = SessionService.filterRestoreData(
        mockSessionData,
        null,
        'full'
      );

      expect(result.sessionData).toEqual(mockSessionData);
      expect(result.initialPreset).toBeNull();
      expect(result.missingFromInitial).toBeNull();
    });
  });

  describe('세션 저장 시점 결정 정책', () => {
    test('브라우저 시작 시 복원 여부 결정', () => {
      const settings = { restoreOnStartup: true, restoreMode: 'full' };
      const result = SessionService.shouldRestoreOnStartup(settings);
      expect(result).toBe(true);
    });

    test('복원 설정이 비활성화된 경우 복원하지 않음', () => {
      const settings = { restoreOnStartup: false };
      const result = SessionService.shouldRestoreOnStartup(settings);
      expect(result).toBe(false);
    });

    test('확장 설치 시 초기 프리셋 저장 여부 결정', () => {
      const context = { reason: 'install', hasExistingTabs: true };
      const result = SessionService.shouldSaveInitialPreset(context);
      expect(result).toBe(true);
    });

    test('확장 업데이트 시 초기 프리셋 저장하지 않음', () => {
      const context = { reason: 'update' };
      const result = SessionService.shouldSaveInitialPreset(context);
      expect(result).toBe(false);
    });
  });

  describe('데이터 유효성 검증 정책', () => {
    test('유효한 세션 데이터 검증', () => {
      const validSessionData = {
        lastSaved: Date.now(),
        tabs: [{ url: 'https://google.com', title: 'Google' }],
        groups: [{ id: 1, title: 'work', color: 'blue' }],
      };

      const result = SessionService.validateSessionData(validSessionData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('잘못된 세션 데이터 검증', () => {
      const invalidSessionData = {
        // lastSaved 누락
        tabs: 'invalid', // 배열이 아님
        groups: [{ title: 'work' }], // id 누락
      };

      const result = SessionService.validateSessionData(invalidSessionData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('빈 세션 데이터 처리', () => {
      const result = SessionService.validateSessionData(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Session data is null or undefined');
    });
  });

  describe('충돌 해결 정책', () => {
    test('동일한 URL의 탭이 있는 경우 최신 것 유지', () => {
      const existingTabs = [
        { url: 'https://google.com', title: 'Google Old', lastAccessed: 1000 },
      ];
      const newTabs = [
        { url: 'https://google.com', title: 'Google New', lastAccessed: 2000 },
      ];

      const result = SessionService.resolveTabConflicts(existingTabs, newTabs);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Google New');
    });

    test('동일한 제목의 그룹이 있는 경우 병합', () => {
      const existingGroups = [{ title: 'work', color: 'blue', tabIds: [1, 2] }];
      const newGroups = [{ title: 'work', color: 'red', tabIds: [3, 4] }];

      const result = SessionService.resolveGroupConflicts(
        existingGroups,
        newGroups
      );
      expect(result).toHaveLength(1);
      expect(result[0].tabIds).toEqual([1, 2, 3, 4]);
      expect(result[0].color).toBe('blue'); // 기존 그룹 속성 유지
    });
  });
});
