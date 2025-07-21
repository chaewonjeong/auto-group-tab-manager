/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals';

describe('Onboarding System', () => {
  let OnboardingController;

  beforeEach(async () => {
    // 실제 구현 import
    const module = await import('../onboarding.js');
    OnboardingController = module.default;

    jest.clearAllMocks();

    // DOM 초기화 - 실제 HTML 구조 생성
    document.body.innerHTML = `
      <div class="onboarding-container">
        <div class="welcome-section">
          <h1>Tab Group Manager에 오신 것을 환영합니다!</h1>
          <p class="subtitle">탭을 자동으로 그룹화하여 더 나은 브라우징 경험을 제공합니다.</p>
        </div>
        
        <div class="setup-section">
          <h2>초기 설정</h2>
          <div class="option-group">
            <label class="option-label">
              <input type="radio" name="existing-tabs" value="apply" id="apply-existing">
              <span class="option-text">기존 탭에도 적용</span>
            </label>
            <p class="option-description">현재 열려있는 모든 탭을 도메인별로 그룹화합니다.</p>
            
            <label class="option-label">
              <input type="radio" name="existing-tabs" value="skip" id="skip-existing">
              <span class="option-text">새로 열리는 탭부터 적용</span>
            </label>
            <p class="option-description">기존 탭은 그대로 두고 새로 열리는 탭부터만 그룹화합니다.</p>
          </div>
        </div>
        
        <div class="action-section">
          <button id="get-started-btn" class="btn btn-primary" disabled>Get Started</button>
        </div>
        
        <div class="info-section">
          <p>언제든지 설정에서 이 옵션을 변경할 수 있습니다.</p>
        </div>
      </div>
    `;
  });

  describe('초기화', () => {
    test('온보딩 페이지가 올바르게 초기화되어야 한다', async () => {
      chrome.storage.sync.get.mockResolvedValue({});
      chrome.tabs.query.mockResolvedValue([]);

      const controller = new OnboardingController();
      await controller.initialize();

      expect(controller.isInitialized).toBe(true);
    });

    test('첫 실행 여부를 올바르게 확인해야 한다', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        onboardingCompleted: false,
      });

      const controller = new OnboardingController();
      const isFirstRun = await controller.checkFirstRun();

      expect(isFirstRun).toBe(true);
      expect(chrome.storage.sync.get).toHaveBeenCalledWith([
        'onboardingCompleted',
      ]);
    });
  });

  describe('기존 탭 처리 선택', () => {
    test('기존 탭 적용 옵션을 선택할 수 있어야 한다', async () => {
      const controller = new OnboardingController();
      controller.cacheElements();

      controller.handleExistingTabsChoice('apply');

      expect(controller.selectedOption).toBe('apply');
      expect(document.getElementById('get-started-btn').disabled).toBe(false);
    });

    test('새로 열리는 탭부터 적용 옵션을 선택할 수 있어야 한다', async () => {
      const controller = new OnboardingController();
      controller.cacheElements();

      controller.handleExistingTabsChoice('skip');

      expect(controller.selectedOption).toBe('skip');
      expect(document.getElementById('get-started-btn').disabled).toBe(false);
    });
  });

  describe('기존 탭 스캔 및 그룹화', () => {
    test('기존 탭을 스캔하고 도메인별로 그룹화해야 한다', async () => {
      const mockTabs = [
        { id: 1, url: 'https://google.com/search', windowId: 1, groupId: -1 },
        { id: 2, url: 'https://google.com/maps', windowId: 1, groupId: -1 },
        {
          id: 3,
          url: 'https://github.com/user/repo',
          windowId: 1,
          groupId: -1,
        },
        {
          id: 4,
          url: 'https://stackoverflow.com/questions',
          windowId: 1,
          groupId: -1,
        },
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.runtime.sendMessage.mockResolvedValue();

      const controller = new OnboardingController();
      await controller.scanAndGroupExistingTabs();

      expect(chrome.tabs.query).toHaveBeenCalledWith({});
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(4); // 각 탭에 대해 그룹화 요청
    });

    test('이미 그룹화된 탭은 유지해야 한다', async () => {
      const mockTabs = [
        { id: 1, url: 'https://google.com/search', windowId: 1, groupId: 1 }, // 이미 그룹화됨
        { id: 2, url: 'https://google.com/maps', windowId: 1, groupId: -1 },
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.runtime.sendMessage.mockResolvedValue();

      const controller = new OnboardingController();
      await controller.scanAndGroupExistingTabs();

      // 그룹화되지 않은 탭만 처리
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    });

    test('내부 페이지는 그룹화에서 제외해야 한다', async () => {
      const mockTabs = [
        { id: 1, url: 'chrome://settings/', windowId: 1, groupId: -1 },
        {
          id: 2,
          url: 'chrome-extension://abc/popup.html',
          windowId: 1,
          groupId: -1,
        },
        { id: 3, url: 'https://google.com/search', windowId: 1, groupId: -1 },
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.runtime.sendMessage.mockResolvedValue();

      const controller = new OnboardingController();
      await controller.scanAndGroupExistingTabs();

      // 일반 웹 페이지만 처리
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('확장 활성화', () => {
    test('기존 탭 적용 선택 시 스캔 후 활성화해야 한다', async () => {
      chrome.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://google.com/search', windowId: 1, groupId: -1 },
      ]);
      chrome.runtime.sendMessage.mockResolvedValue();
      chrome.storage.sync.set.mockResolvedValue();

      const controller = new OnboardingController();
      controller.selectedOption = 'apply';
      await controller.activateExtension();

      expect(chrome.tabs.query).toHaveBeenCalled();
      expect(chrome.runtime.sendMessage).toHaveBeenCalled();
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        onboardingCompleted: true,
        settings: expect.objectContaining({
          autoGrouping: true,
        }),
      });
    });

    test('새로 열리는 탭부터 적용 선택 시 바로 활성화해야 한다', async () => {
      chrome.storage.sync.set.mockResolvedValue();

      const controller = new OnboardingController();
      controller.selectedOption = 'skip';
      await controller.activateExtension();

      expect(chrome.tabs.query).not.toHaveBeenCalled();
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        onboardingCompleted: true,
        settings: expect.objectContaining({
          autoGrouping: true,
        }),
      });
    });
  });

  describe('UI 상호작용', () => {
    test('라디오 버튼 선택 시 Get Started 버튼이 활성화되어야 한다', async () => {
      const controller = new OnboardingController();
      controller.cacheElements();
      controller.setupEventListeners();

      // 라디오 버튼 클릭 시뮬레이션
      const applyRadio = document.getElementById('apply-existing');
      applyRadio.checked = true;
      applyRadio.dispatchEvent(new Event('change'));

      expect(document.getElementById('get-started-btn').disabled).toBe(false);
    });

    test('Get Started 버튼 클릭 시 확장이 활성화되어야 한다', async () => {
      chrome.storage.sync.set.mockResolvedValue();

      const controller = new OnboardingController();
      controller.cacheElements();
      controller.selectedOption = 'skip';

      const activateSpy = jest.spyOn(controller, 'activateExtension');
      await controller.handleGetStarted();

      expect(activateSpy).toHaveBeenCalled();
    });
  });

  describe('기존 그룹 유지', () => {
    test('기존 그룹 정보를 보존해야 한다', async () => {
      const mockGroups = [
        { id: 1, title: 'Work', color: 'blue', tabIds: [1, 2] },
        { id: 2, title: 'Personal', color: 'red', tabIds: [3, 4] },
      ];

      chrome.tabGroups.query.mockResolvedValue(mockGroups);

      const controller = new OnboardingController();
      const preservedGroups = await controller.preserveExistingGroups();

      expect(preservedGroups).toHaveLength(2);
      expect(preservedGroups[0].title).toBe('Work');
      expect(chrome.tabGroups.query).toHaveBeenCalledWith({});
    });
  });

  describe('에러 처리', () => {
    test('탭 스캔 실패 시 적절히 처리해야 한다', async () => {
      chrome.tabs.query.mockRejectedValue(new Error('Tabs query failed'));

      const controller = new OnboardingController();
      await controller.scanAndGroupExistingTabs();

      // 에러가 발생해도 프로세스가 중단되지 않아야 함
      expect(chrome.tabs.query).toHaveBeenCalled();
    });

    test('스토리지 저장 실패 시 적절히 처리해야 한다', async () => {
      chrome.storage.sync.set.mockRejectedValue(new Error('Storage failed'));

      const controller = new OnboardingController();
      controller.selectedOption = 'skip';

      // 에러가 발생해야 함
      await expect(controller.activateExtension()).rejects.toThrow(
        'Storage failed'
      );
      expect(chrome.storage.sync.set).toHaveBeenCalled();
    });
  });

  describe('온보딩 완료 상태', () => {
    test('온보딩 완료 후 상태를 저장해야 한다', async () => {
      chrome.storage.sync.set.mockResolvedValue();

      const controller = new OnboardingController();
      await controller.completeOnboarding();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        onboardingCompleted: true,
      });
    });

    test('온보딩 완료 여부를 확인할 수 있어야 한다', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        onboardingCompleted: true,
      });

      const controller = new OnboardingController();
      const isCompleted = await controller.isOnboardingCompleted();

      expect(isCompleted).toBe(true);
      expect(chrome.storage.sync.get).toHaveBeenCalledWith([
        'onboardingCompleted',
      ]);
    });
  });

  describe('Service Worker 통신', () => {
    test('Service Worker에 그룹화 요청을 보내야 한다', async () => {
      chrome.runtime.sendMessage.mockResolvedValue();

      const controller = new OnboardingController();
      await controller.requestTabGrouping(1);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GROUP_TAB',
        tabId: 1,
      });
    });

    test('Service Worker에 설정 변경을 알려야 한다', async () => {
      chrome.runtime.sendMessage.mockResolvedValue();

      const controller = new OnboardingController();
      await controller.notifySettingsChange({
        autoGrouping: true,
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SETTINGS_CHANGED',
        settings: {
          autoGrouping: true,
        },
      });
    });
  });
});
