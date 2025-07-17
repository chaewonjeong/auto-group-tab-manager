import PermissionManager from '../permission-manager.js';

describe('PermissionManager', () => {
  beforeEach(() => {
    // Chrome API 모킹 설정
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
        onMessage: {
          addListener: jest.fn(),
        },
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkFileUrlPermission', () => {
    test('파일 URL 권한이 있는 경우 true를 반환해야 한다', async () => {
      // Given
      chrome.permissions.contains.mockResolvedValue(true);

      // When
      const hasPermission = await PermissionManager.checkFileUrlPermission();

      // Then
      expect(hasPermission).toBe(true);
      expect(chrome.permissions.contains).toHaveBeenCalledWith({
        origins: ['file:///*'],
      });
    });

    test('파일 URL 권한이 없는 경우 false를 반환해야 한다', async () => {
      // Given
      chrome.permissions.contains.mockResolvedValue(false);

      // When
      const hasPermission = await PermissionManager.checkFileUrlPermission();

      // Then
      expect(hasPermission).toBe(false);
      expect(chrome.permissions.contains).toHaveBeenCalledWith({
        origins: ['file:///*'],
      });
    });

    test('권한 확인 중 오류가 발생하면 false를 반환해야 한다', async () => {
      // Given
      chrome.permissions.contains.mockRejectedValue(
        new Error('Permission check failed')
      );

      // When
      const hasPermission = await PermissionManager.checkFileUrlPermission();

      // Then
      expect(hasPermission).toBe(false);
    });
  });

  describe('requestFileUrlPermission', () => {
    test('권한 요청이 성공하면 true를 반환해야 한다', async () => {
      // Given
      chrome.permissions.request.mockResolvedValue(true);

      // When
      const granted = await PermissionManager.requestFileUrlPermission();

      // Then
      expect(granted).toBe(true);
      expect(chrome.permissions.request).toHaveBeenCalledWith({
        origins: ['file:///*'],
      });
    });

    test('권한 요청이 거부되면 false를 반환해야 한다', async () => {
      // Given
      chrome.permissions.request.mockResolvedValue(false);

      // When
      const granted = await PermissionManager.requestFileUrlPermission();

      // Then
      expect(granted).toBe(false);
    });

    test('권한 요청 중 오류가 발생하면 false를 반환해야 한다', async () => {
      // Given
      chrome.permissions.request.mockRejectedValue(
        new Error('Permission request failed')
      );

      // When
      const granted = await PermissionManager.requestFileUrlPermission();

      // Then
      expect(granted).toBe(false);
    });
  });

  describe('showPermissionGuide', () => {
    test('크롬 확장 관리 페이지를 새 탭에서 열어야 한다', async () => {
      // Given
      chrome.tabs.create.mockResolvedValue({ id: 123 });

      // When
      await PermissionManager.showPermissionGuide();

      // Then
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'chrome://extensions/',
        active: true,
      });
    });

    test('탭 생성 중 오류가 발생해도 예외를 던지지 않아야 한다', async () => {
      // Given
      chrome.tabs.create.mockRejectedValue(new Error('Tab creation failed'));

      // When & Then
      await expect(
        PermissionManager.showPermissionGuide()
      ).resolves.not.toThrow();
    });
  });

  describe('handlePermissionDenied', () => {
    test('권한 거부 시 적절한 메시지를 반환해야 한다', () => {
      // When
      const message = PermissionManager.handlePermissionDenied();

      // Then
      expect(message).toBe(
        '로컬 파일 그룹화 기능이 비활성화되었습니다. 웹 URL만 처리됩니다.'
      );
    });
  });

  describe('getPermissionStatus', () => {
    test('권한 상태 정보를 올바르게 반환해야 한다', async () => {
      // Given
      chrome.permissions.contains.mockResolvedValue(true);

      // When
      const status = await PermissionManager.getPermissionStatus();

      // Then
      expect(status).toEqual({
        hasFileUrlPermission: true,
        canRequestPermission: true,
        message: '파일 URL 접근 권한이 허용되어 있습니다.',
      });
    });

    test('권한이 없는 경우 적절한 상태를 반환해야 한다', async () => {
      // Given
      chrome.permissions.contains.mockResolvedValue(false);

      // When
      const status = await PermissionManager.getPermissionStatus();

      // Then
      expect(status).toEqual({
        hasFileUrlPermission: false,
        canRequestPermission: true,
        message: '로컬 파일 그룹화를 위해 파일 URL 접근 권한이 필요합니다.',
      });
    });
  });

  describe('initializePermissionListeners', () => {
    test('권한 변경 이벤트 리스너를 등록해야 한다', () => {
      // When
      PermissionManager.initializePermissionListeners();

      // Then
      expect(chrome.permissions.onAdded.addListener).toHaveBeenCalled();
      expect(chrome.permissions.onRemoved.addListener).toHaveBeenCalled();
    });
  });

  describe('notifyPermissionChange', () => {
    test('권한 추가 시 적절한 알림을 보내야 한다', async () => {
      // Given
      const permissions = { origins: ['file:///*'] };

      // When
      await PermissionManager.notifyPermissionChange('added', permissions);

      // Then
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'PERMISSION_CHANGED',
        action: 'added',
        permissions: permissions,
        message:
          '파일 URL 접근 권한이 허용되었습니다. 로컬 파일 그룹화가 활성화됩니다.',
      });
    });

    test('권한 제거 시 적절한 알림을 보내야 한다', async () => {
      // Given
      const permissions = { origins: ['file:///*'] };

      // When
      await PermissionManager.notifyPermissionChange('removed', permissions);

      // Then
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'PERMISSION_CHANGED',
        action: 'removed',
        permissions: permissions,
        message:
          '파일 URL 접근 권한이 제거되었습니다. 로컬 파일 그룹화가 비활성화됩니다.',
      });
    });
  });
});
