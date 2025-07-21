/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

describe('Options Page', () => {
  let OptionsController;

  beforeEach(async () => {
    // 실제 구현 import
    const module = await import('../options.js');
    OptionsController = module.default;

    jest.clearAllMocks();

    // DOM 초기화 - 실제 HTML 구조 생성
    document.body.innerHTML = `
      <div class="options-container">
        <input type="checkbox" id="auto-grouping-toggle">
        <input type="radio" name="restore-mode" value="full" id="restore-mode-full">
        <input type="radio" name="restore-mode" value="initial" id="restore-mode-initial">
        <input type="text" id="new-domain-input">
        <button id="add-domain-btn">추가</button>
        <div id="excluded-domains-list"></div>
        <span id="permission-status-icon"></span>
        <span id="permission-status-text"></span>
        <button id="request-permission-btn">권한 요청</button>
      </div>
    `;
  });

  describe('초기화', () => {
    test('설정 페이지가 올바르게 초기화되어야 한다', async () => {
      // 기본 설정 로드 모킹
      chrome.storage.sync.get.mockResolvedValue({
        settings: {
          autoGrouping: true,
          restoreMode: 'full',
          excludedDomains: ['localhost'],
          fileUrlPermissionGranted: false,
        },
      });
      chrome.permissions.contains.mockResolvedValue(false);

      const controller = new OptionsController();
      await controller.initialize();

      expect(chrome.storage.sync.get).toHaveBeenCalledWith(['settings']);
      expect(controller.isInitialized).toBe(true);
    });

    test('권한 상태를 올바르게 확인해야 한다', async () => {
      chrome.permissions.contains.mockResolvedValue(true);

      const controller = new OptionsController();
      const hasPermission = await controller.checkFileUrlPermission();

      expect(hasPermission).toBe(true);
      expect(chrome.permissions.contains).toHaveBeenCalledWith({
        origins: ['file:///*'],
      });
    });
  });

  describe('자동 그룹화 설정', () => {
    test('자동 그룹화 토글이 올바르게 작동해야 한다', async () => {
      chrome.storage.sync.get.mockResolvedValue({ settings: {} });
      chrome.storage.sync.set.mockResolvedValue();
      chrome.runtime.sendMessage.mockResolvedValue();
      chrome.permissions.contains.mockResolvedValue(false);

      const controller = new OptionsController();
      await controller.initialize();
      await controller.toggleAutoGrouping(false);

      expect(controller.settings.autoGrouping).toBe(false);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({
          autoGrouping: false,
        }),
      });
    });
  });

  describe('세션 복원 모드 설정', () => {
    test('세션 복원 모드를 변경할 수 있어야 한다', async () => {
      chrome.storage.sync.get.mockResolvedValue({ settings: {} });
      chrome.storage.sync.set.mockResolvedValue();
      chrome.runtime.sendMessage.mockResolvedValue();
      chrome.permissions.contains.mockResolvedValue(false);

      const controller = new OptionsController();
      await controller.initialize();
      await controller.setRestoreMode('initial');

      expect(controller.settings.restoreMode).toBe('initial');
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({
          restoreMode: 'initial',
        }),
      });
    });
  });

  describe('제외 도메인 관리', () => {
    test('제외 도메인을 추가할 수 있어야 한다', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        settings: {
          excludedDomains: ['localhost'],
        },
      });
      chrome.storage.sync.set.mockResolvedValue();
      chrome.runtime.sendMessage.mockResolvedValue();
      chrome.permissions.contains.mockResolvedValue(false);
      chrome.tabs.query.mockResolvedValue([]);

      const controller = new OptionsController();
      await controller.initialize();
      await controller.addExcludedDomain('example.com');

      expect(controller.settings.excludedDomains).toContain('example.com');
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({
          excludedDomains: ['localhost', 'example.com'],
        }),
      });
    });

    test('제외 도메인을 삭제할 수 있어야 한다', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        settings: {
          excludedDomains: ['localhost', 'example.com'],
        },
      });
      chrome.storage.sync.set.mockResolvedValue();
      chrome.runtime.sendMessage.mockResolvedValue();
      chrome.permissions.contains.mockResolvedValue(false);

      const controller = new OptionsController();
      await controller.initialize();
      await controller.removeExcludedDomain('example.com');

      expect(controller.settings.excludedDomains).not.toContain('example.com');
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({
          excludedDomains: ['localhost'],
        }),
      });
    });

    test('제외 도메인 변경 시 해당 탭들을 그룹에서 해제해야 한다', async () => {
      chrome.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://example.com/page1', groupId: 1 },
        { id: 2, url: 'https://example.com/page2', groupId: 1 },
      ]);
      chrome.tabGroups.ungroup = jest.fn().mockResolvedValue();

      const controller = new OptionsController();
      await controller.ungroupExcludedDomainTabs('example.com');

      expect(chrome.tabs.query).toHaveBeenCalledWith({
        url: ['*://example.com/*'],
      });
      expect(chrome.tabGroups.ungroup).toHaveBeenCalledWith([1, 2]);
    });
  });

  describe('파일 URL 권한 관리', () => {
    test('파일 URL 권한을 요청할 수 있어야 한다', async () => {
      chrome.permissions.request.mockResolvedValue(true);
      chrome.storage.sync.set.mockResolvedValue();
      chrome.runtime.sendMessage.mockResolvedValue();

      const controller = new OptionsController();
      controller.cacheElements(); // DOM 요소 캐싱
      const granted = await controller.requestFileUrlPermission();

      expect(granted).toBe(true);
      expect(chrome.permissions.request).toHaveBeenCalledWith({
        origins: ['file:///*'],
      });
    });

    test('권한 상태를 UI에 반영해야 한다', async () => {
      chrome.permissions.contains.mockResolvedValue(false);

      const controller = new OptionsController();
      controller.cacheElements();
      await controller.updatePermissionStatus();

      expect(controller.elements.permissionStatusIcon.textContent).toBe('❌');
      expect(controller.elements.permissionStatusText.textContent).toBe(
        '권한 없음'
      );
    });
  });

  describe('실시간 설정 적용', () => {
    test('설정 변경 시 Service Worker에 알림을 보내야 한다', async () => {
      chrome.runtime.sendMessage.mockResolvedValue();

      const controller = new OptionsController();
      await controller.notifySettingsChange({
        autoGrouping: false,
        excludedDomains: ['localhost', 'example.com'],
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SETTINGS_CHANGED',
        settings: {
          autoGrouping: false,
          excludedDomains: ['localhost', 'example.com'],
        },
      });
    });
  });

  describe('UI 렌더링', () => {
    test('설정 페이지 UI가 올바르게 렌더링되어야 한다', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        settings: {
          autoGrouping: true,
          restoreMode: 'full',
          excludedDomains: [],
        },
      });
      chrome.permissions.contains.mockResolvedValue(false);

      const controller = new OptionsController();
      await controller.initialize();

      expect(document.getElementById('auto-grouping-toggle').checked).toBe(
        true
      );
      expect(document.getElementById('restore-mode-full').checked).toBe(true);
    });

    test('제외 도메인 목록이 올바르게 렌더링되어야 한다', async () => {
      const mockDomains = ['localhost', 'example.com'];

      const controller = new OptionsController();
      controller.cacheElements();
      await controller.renderExcludedDomains(mockDomains);

      const domainItems = document.querySelectorAll('.excluded-domain-item');
      expect(domainItems).toHaveLength(2);
    });
  });

  describe('에러 처리', () => {
    test('권한 요청 실패 시 적절히 처리해야 한다', async () => {
      chrome.permissions.request.mockRejectedValue(
        new Error('Permission denied')
      );

      const controller = new OptionsController();
      controller.cacheElements(); // DOM 요소 캐싱
      const granted = await controller.requestFileUrlPermission();

      expect(granted).toBe(false);
    });

    test('스토리지 오류 시 적절히 처리해야 한다', async () => {
      chrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));

      const controller = new OptionsController();
      const settings = await controller.loadSettings();

      // 기본값 반환 확인
      expect(settings).toEqual({
        autoGrouping: true,
        restoreMode: 'full',
        excludedDomains: [],
        fileUrlPermissionGranted: false,
      });
    });
  });

  describe('유틸리티 함수', () => {
    test('도메인 유효성 검사가 올바르게 작동해야 한다', () => {
      const controller = new OptionsController();

      expect(controller.isValidDomain('example.com')).toBe(true);
      expect(controller.isValidDomain('localhost')).toBe(true);
      expect(controller.isValidDomain('chrome://')).toBe(true);
      expect(controller.isValidDomain('invalid..domain')).toBe(false);
      expect(controller.isValidDomain('')).toBe(false);
    });
  });
});
