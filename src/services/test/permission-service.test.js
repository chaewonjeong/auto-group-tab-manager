import PermissionService from '../permission-service.js';

// Chrome API 모킹
global.chrome = {
  permissions: {
    contains: jest.fn(),
    request: jest.fn(),
    onAdded: {
      addListener: jest.fn(),
    },
    onRemoved: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    create: jest.fn(),
  },
  runtime: {
    sendMessage: jest.fn(),
  },
};

describe('PermissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('권한 요청 시점 결정 정책', () => {
    test('로컬 파일 감지 시 권한 요청해야 함', () => {
      const context = {
        trigger: 'file-url-detected',
        url: 'file:///Users/test/document.html',
        hasPermission: false,
      };
      const settings = { autoRequestPermissions: true };

      const result = PermissionService.shouldRequestPermission(
        'file-url',
        context,
        settings
      );
      expect(result.shouldRequest).toBe(true);
      expect(result.reason).toBe('로컬 파일 접근을 위해 권한이 필요합니다');
    });

    test('이미 권한이 있는 경우 요청하지 않음', () => {
      const context = {
        trigger: 'file-url-detected',
        url: 'file:///Users/test/document.html',
        hasPermission: true,
      };
      const settings = { autoRequestPermissions: true };

      const result = PermissionService.shouldRequestPermission(
        'file-url',
        context,
        settings
      );
      expect(result.shouldRequest).toBe(false);
      expect(result.reason).toBe('이미 권한을 보유하고 있습니다');
    });

    test('자동 권한 요청이 비활성화된 경우 요청하지 않음', () => {
      const context = {
        trigger: 'file-url-detected',
        url: 'file:///Users/test/document.html',
        hasPermission: false,
      };
      const settings = { autoRequestPermissions: false };

      const result = PermissionService.shouldRequestPermission(
        'file-url',
        context,
        settings
      );
      expect(result.shouldRequest).toBe(false);
      expect(result.reason).toBe('자동 권한 요청이 비활성화되어 있습니다');
    });

    test('수동 요청인 경우 항상 허용', () => {
      const context = {
        trigger: 'manual-request',
        hasPermission: false,
      };
      const settings = { autoRequestPermissions: false };

      const result = PermissionService.shouldRequestPermission(
        'file-url',
        context,
        settings
      );
      expect(result.shouldRequest).toBe(true);
      expect(result.reason).toBe('사용자가 수동으로 요청했습니다');
    });

    test('알 수 없는 권한 타입은 요청하지 않음', () => {
      const context = { trigger: 'unknown' };
      const settings = { autoRequestPermissions: true };

      const result = PermissionService.shouldRequestPermission(
        'unknown-permission',
        context,
        settings
      );
      expect(result.shouldRequest).toBe(false);
      expect(result.reason).toBe('지원하지 않는 권한 타입입니다');
    });
  });

  describe('권한 거부 시 대응 정책', () => {
    test('파일 URL 권한 거부 시 웹 전용 모드로 전환', () => {
      const context = {
        permissionType: 'file-url',
        deniedBy: 'user',
        attemptCount: 1,
      };
      const settings = { fallbackToWebOnly: true };

      const result = PermissionService.handlePermissionDenied(
        context,
        settings
      );
      expect(result.action).toBe('fallback-to-web-only');
      expect(result.message).toContain('웹 URL만 처리됩니다');
      expect(result.showNotification).toBe(true);
    });

    test('여러 번 거부된 경우 재요청하지 않음', () => {
      const context = {
        permissionType: 'file-url',
        deniedBy: 'user',
        attemptCount: 3,
      };
      const settings = { maxRetryAttempts: 2 };

      const result = PermissionService.handlePermissionDenied(
        context,
        settings
      );
      expect(result.action).toBe('disable-feature');
      expect(result.allowRetry).toBe(false);
      expect(result.message).toContain('더 이상 요청하지 않습니다');
    });

    test('시스템에 의한 거부는 다르게 처리', () => {
      const context = {
        permissionType: 'file-url',
        deniedBy: 'system',
        attemptCount: 1,
      };
      const settings = {};

      const result = PermissionService.handlePermissionDenied(
        context,
        settings
      );
      expect(result.action).toBe('show-guide');
      expect(result.message).toContain('수동으로 설정해주세요');
    });

    test('권한 거부 기록 저장', () => {
      const context = {
        permissionType: 'file-url',
        deniedBy: 'user',
        attemptCount: 1,
      };
      const settings = { trackDenials: true };

      const result = PermissionService.handlePermissionDenied(
        context,
        settings
      );
      expect(result.shouldRecord).toBe(true);
      expect(result.recordData).toEqual({
        permissionType: 'file-url',
        deniedAt: expect.any(Number),
        deniedBy: 'user',
        attemptCount: 1,
      });
    });
  });

  describe('권한 상태 변경 시 적용 정책', () => {
    test('파일 URL 권한 허용 시 기능 활성화', () => {
      const permissionType = 'file-url';
      const granted = true;
      const settings = { enableOnPermissionGrant: true };

      const result = PermissionService.applyPermissionChange(
        permissionType,
        granted,
        settings
      );
      expect(result.action).toBe('enable-feature');
      expect(result.message).toContain('로컬 파일 그룹화가 활성화됩니다');
      expect(result.shouldNotify).toBe(true);
    });

    test('파일 URL 권한 제거 시 기능 비활성화', () => {
      const permissionType = 'file-url';
      const granted = false;
      const settings = { disableOnPermissionRevoke: true };

      const result = PermissionService.applyPermissionChange(
        permissionType,
        granted,
        settings
      );
      expect(result.action).toBe('disable-feature');
      expect(result.message).toContain('로컬 파일 그룹화가 비활성화됩니다');
      expect(result.shouldNotify).toBe(true);
    });

    test('권한 변경 시 기존 그룹 처리', () => {
      const permissionType = 'file-url';
      const granted = false;
      const settings = {
        disableOnPermissionRevoke: true,
        ungroupFileTabsOnRevoke: true,
      };

      const result = PermissionService.applyPermissionChange(
        permissionType,
        granted,
        settings
      );
      expect(result.action).toBe('disable-feature');
      expect(result.shouldUngroupFileTabs).toBe(true);
    });

    test('알림 설정에 따른 알림 표시', () => {
      const permissionType = 'file-url';
      const granted = true;
      const settings = {
        enableOnPermissionGrant: true,
        showPermissionNotifications: false,
      };

      const result = PermissionService.applyPermissionChange(
        permissionType,
        granted,
        settings
      );
      expect(result.shouldNotify).toBe(false);
    });
  });

  describe('권한 요청 전략 정책', () => {
    test('점진적 권한 요청 전략', () => {
      const requestHistory = [
        { timestamp: Date.now() - 1000, result: 'denied' },
        { timestamp: Date.now() - 2000, result: 'denied' },
      ];
      const settings = { useProgressiveStrategy: true };

      const result = PermissionService.determineRequestStrategy(
        'file-url',
        requestHistory,
        settings
      );
      expect(result.strategy).toBe('delayed');
      expect(result.delayMs).toBeGreaterThan(0);
      expect(result.showExplanation).toBe(true);
    });

    test('즉시 권한 요청 전략', () => {
      const requestHistory = [];
      const settings = { useProgressiveStrategy: false };

      const result = PermissionService.determineRequestStrategy(
        'file-url',
        requestHistory,
        settings
      );
      expect(result.strategy).toBe('immediate');
      expect(result.delayMs).toBe(0);
    });

    test('최대 재시도 횟수 초과 시 포기', () => {
      const requestHistory = [
        { timestamp: Date.now() - 1000, result: 'denied' },
        { timestamp: Date.now() - 2000, result: 'denied' },
        { timestamp: Date.now() - 3000, result: 'denied' },
      ];
      const settings = { maxRetryAttempts: 2 };

      const result = PermissionService.determineRequestStrategy(
        'file-url',
        requestHistory,
        settings
      );
      expect(result.strategy).toBe('give-up');
      expect(result.reason).toBe('최대 재시도 횟수를 초과했습니다');
    });
  });

  describe('권한 설명 메시지 정책', () => {
    test('첫 번째 요청 시 기본 설명', () => {
      const context = {
        permissionType: 'file-url',
        isFirstRequest: true,
        trigger: 'file-url-detected',
      };

      const result = PermissionService.generatePermissionExplanation(context);
      expect(result.title).toBe('파일 접근 권한 필요');
      expect(result.message).toContain('로컬 파일을 그룹화하기 위해');
      expect(result.showBenefits).toBe(true);
    });

    test('재요청 시 상세 설명', () => {
      const context = {
        permissionType: 'file-url',
        isFirstRequest: false,
        previousDenialCount: 2,
        trigger: 'manual-request',
      };

      const result = PermissionService.generatePermissionExplanation(context);
      expect(result.title).toBe('파일 접근 권한 재요청');
      expect(result.message).toContain('이전에 거부하셨지만');
      expect(result.showAlternatives).toBe(true);
    });

    test('수동 설정 가이드 제공', () => {
      const context = {
        permissionType: 'file-url',
        trigger: 'manual-guide-request',
      };

      const result = PermissionService.generatePermissionExplanation(context);
      expect(result.showManualSteps).toBe(true);
      expect(result.manualSteps).toHaveLength(3);
      expect(result.manualSteps[0]).toContain('chrome://extensions');
    });
  });

  describe('권한 상태 추적 정책', () => {
    test('권한 요청 기록 저장', () => {
      const requestData = {
        permissionType: 'file-url',
        trigger: 'file-url-detected',
        result: 'granted',
        timestamp: Date.now(),
      };

      const result =
        PermissionService.shouldRecordPermissionRequest(requestData);
      expect(result.shouldRecord).toBe(true);
      expect(result.recordKey).toBe('permission-requests');
    });

    test('권한 상태 변경 기록', () => {
      const changeData = {
        permissionType: 'file-url',
        from: false,
        to: true,
        timestamp: Date.now(),
      };

      const result = PermissionService.shouldRecordPermissionChange(changeData);
      expect(result.shouldRecord).toBe(true);
      expect(result.recordKey).toBe('permission-changes');
    });

    test('개인정보 보호를 위한 데이터 제한', () => {
      const requestData = {
        permissionType: 'file-url',
        trigger: 'file-url-detected',
        url: 'file:///Users/sensitive/document.html',
        result: 'granted',
      };

      const result = PermissionService.sanitizeRecordData(requestData);
      expect(result.url).toBeUndefined();
      expect(result.permissionType).toBe('file-url');
      expect(result.result).toBe('granted');
    });
  });
});
