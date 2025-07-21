/**
 * 온보딩 시스템 컨트롤러
 * 요구사항 6.1-6.6을 구현
 */
class OnboardingController {
  constructor() {
    this.selectedOption = null;
    this.elements = {};
    this.isInitialized = false;
    this.isProcessing = false;
  }

  /**
   * 온보딩 시스템 초기화
   */
  async initialize() {
    try {
      // DOM 요소 참조 저장
      this.cacheElements();

      // 첫 실행 여부 확인
      const isFirstRun = await this.checkFirstRun();
      if (!isFirstRun) {
        // 이미 온보딩을 완료한 경우 설정 페이지로 리다이렉트
        window.location.href = chrome.runtime.getURL(
          'src/features/options/options.html'
        );
        return;
      }

      // 이벤트 리스너 등록
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('온보딩 시스템 초기화 완료');
    } catch (error) {
      console.error('온보딩 시스템 초기화 실패:', error);
      this.showError('온보딩 페이지를 로드하는 중 오류가 발생했습니다.');
    }
  }

  /**
   * DOM 요소 참조 캐싱
   */
  cacheElements() {
    this.elements = {
      applyExistingRadio: document.getElementById('apply-existing'),
      skipExistingRadio: document.getElementById('skip-existing'),
      getStartedBtn: document.getElementById('get-started-btn'),
      loadingIndicator: document.getElementById('loading-indicator'),
      helpLink: document.getElementById('help-link'),
    };
  }

  /**
   * 첫 실행 여부 확인
   */
  async checkFirstRun() {
    try {
      const result = await chrome.storage.sync.get(['onboardingCompleted']);
      return !result.onboardingCompleted;
    } catch (error) {
      console.error('첫 실행 여부 확인 실패:', error);
      return true; // 에러 시 첫 실행으로 간주
    }
  }

  /**
   * 온보딩 완료 여부 확인
   */
  async isOnboardingCompleted() {
    try {
      const result = await chrome.storage.sync.get(['onboardingCompleted']);
      return !!result.onboardingCompleted;
    } catch (error) {
      console.error('온보딩 완료 여부 확인 실패:', error);
      return false;
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 라디오 버튼 변경 이벤트
    if (this.elements.applyExistingRadio) {
      this.elements.applyExistingRadio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.handleExistingTabsChoice('apply');
        }
      });
    }

    if (this.elements.skipExistingRadio) {
      this.elements.skipExistingRadio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.handleExistingTabsChoice('skip');
        }
      });
    }

    // Get Started 버튼 클릭
    if (this.elements.getStartedBtn) {
      this.elements.getStartedBtn.addEventListener('click', () => {
        this.handleGetStarted();
      });
    }

    // 도움말 링크 클릭
    if (this.elements.helpLink) {
      this.elements.helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showHelp();
      });
    }
  }

  /**
   * 기존 탭 처리 선택 핸들러
   */
  handleExistingTabsChoice(option) {
    this.selectedOption = option;

    // Get Started 버튼 활성화
    if (this.elements.getStartedBtn) {
      this.elements.getStartedBtn.disabled = false;
    }

    console.log(`기존 탭 처리 옵션 선택: ${option}`);
  }

  /**
   * Get Started 버튼 클릭 핸들러
   */
  async handleGetStarted() {
    if (!this.selectedOption || this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;
      this.showLoading(true);

      await this.activateExtension();

      // 성공 메시지 표시 후 팝업으로 이동
      this.showSuccess();

      setTimeout(() => {
        window.close(); // 온보딩 페이지 닫기
      }, 2000);
    } catch (error) {
      console.error('확장 활성화 실패:', error);
      this.showError('확장을 활성화하는 중 오류가 발생했습니다.');
    } finally {
      this.isProcessing = false;
      this.showLoading(false);
    }
  }

  /**
   * 확장 활성화
   */
  async activateExtension() {
    try {
      // 기본 설정 저장
      const settings = {
        autoGrouping: true,
        restoreMode: 'full',
        excludedDomains: [],
        fileUrlPermissionGranted: false,
      };

      // 기존 탭 적용 선택 시 스캔 및 그룹화
      if (this.selectedOption === 'apply') {
        await this.scanAndGroupExistingTabs();
      }

      // 온보딩 완료 상태 및 설정 저장
      await chrome.storage.sync.set({
        onboardingCompleted: true,
        settings: settings,
      });

      // Service Worker에 설정 변경 알림
      await this.notifySettingsChange(settings);

      console.log(`확장 활성화 완료: ${this.selectedOption} 모드`);
    } catch (error) {
      console.error('확장 활성화 중 오류:', error);
      throw error;
    }
  }

  /**
   * 기존 탭 스캔 및 그룹화
   */
  async scanAndGroupExistingTabs() {
    try {
      // 모든 탭 조회
      const tabs = await chrome.tabs.query({});

      // 그룹화 대상 탭 필터링
      const tabsToGroup = tabs.filter((tab) => {
        // 이미 그룹화된 탭 제외
        if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          return false;
        }

        // 내부 페이지 제외
        if (
          !tab.url ||
          tab.url.startsWith('chrome://') ||
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('about:') ||
          tab.url === 'chrome://newtab/' ||
          tab.url === ''
        ) {
          return false;
        }

        return true;
      });

      console.log(`그룹화 대상 탭: ${tabsToGroup.length}개`);

      // 각 탭에 대해 그룹화 요청
      for (const tab of tabsToGroup) {
        try {
          await this.requestTabGrouping(tab.id);
          // 연속 요청 간 짧은 지연
          await this.delay(50);
        } catch (error) {
          console.error(`탭 ${tab.id} 그룹화 실패:`, error);
        }
      }

      console.log('기존 탭 그룹화 완료');
    } catch (error) {
      console.error('기존 탭 스캔 실패:', error);
      // 에러가 발생해도 프로세스 중단하지 않음
    }
  }

  /**
   * 기존 그룹 정보 보존
   */
  async preserveExistingGroups() {
    try {
      const groups = await chrome.tabGroups.query({});
      console.log(`기존 그룹 ${groups.length}개 보존`);
      return groups;
    } catch (error) {
      console.error('기존 그룹 정보 조회 실패:', error);
      return [];
    }
  }

  /**
   * Service Worker에 탭 그룹화 요청
   */
  async requestTabGrouping(tabId) {
    try {
      await chrome.runtime.sendMessage({
        type: 'GROUP_TAB',
        tabId: tabId,
      });
    } catch (error) {
      console.error(`탭 ${tabId} 그룹화 요청 실패:`, error);
      throw error;
    }
  }

  /**
   * Service Worker에 설정 변경 알림
   */
  async notifySettingsChange(settings) {
    try {
      await chrome.runtime.sendMessage({
        type: 'SETTINGS_CHANGED',
        settings: settings,
      });
    } catch (error) {
      console.error('설정 변경 알림 실패:', error);
      // 설정 변경 알림 실패는 치명적이지 않음
    }
  }

  /**
   * 온보딩 완료 상태 저장
   */
  async completeOnboarding() {
    try {
      await chrome.storage.sync.set({
        onboardingCompleted: true,
      });
      console.log('온보딩 완료 상태 저장');
    } catch (error) {
      console.error('온보딩 완료 상태 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 로딩 상태 표시/숨김
   */
  showLoading(show) {
    if (this.elements.getStartedBtn) {
      this.elements.getStartedBtn.style.display = show ? 'none' : 'inline-flex';
    }

    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * 성공 메시지 표시
   */
  showSuccess() {
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.innerHTML = `
        <div style="color: #28a745; font-size: 1.5rem;">✅</div>
        <span style="color: #28a745; font-weight: 600;">설정이 완료되었습니다!</span>
      `;
    }
  }

  /**
   * 에러 메시지 표시
   */
  showError(message) {
    // 간단한 에러 표시 (실제 구현에서는 더 나은 UI 사용)
    alert(message);
  }

  /**
   * 도움말 표시
   */
  showHelp() {
    const helpContent = `
Tab Group Manager 도움말

주요 기능:
• 자동 그룹화: 새로 열리는 탭을 도메인별로 자동 그룹화
• 브랜드 색상: 각 사이트의 브랜드 색상으로 그룹 구분
• 프리셋 관리: 자주 사용하는 탭 구성 저장 및 복원
• 세션 복원: 브라우저 재시작 후 탭 그룹 복원

설정 변경:
확장 아이콘을 클릭하여 설정에 접근할 수 있습니다.

문제 해결:
• 탭이 그룹화되지 않는 경우: 설정에서 자동 그룹화가 활성화되어 있는지 확인
• 로컬 파일 그룹화: 별도 권한 허용 필요
    `;

    alert(helpContent);
  }

  /**
   * 지연 함수
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  const controller = new OnboardingController();
  await controller.initialize();

  // 전역 참조 (디버깅용)
  window.onboardingController = controller;
});

export default OnboardingController;
