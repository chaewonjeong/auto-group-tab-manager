import { ExcludedDomainsList } from '../../components/ExcludedDomainsList.js';

/**
 * 설정 페이지 컨트롤러
 * 요구사항 10.1-10.6, 11.5를 구현
 */
class OptionsController {
  constructor() {
    this.settings = {
      autoGrouping: true,
      restoreMode: 'full',
      excludedDomains: [],
      fileUrlPermissionGranted: false,
    };

    this.elements = {};
    this.isInitialized = false;
  }

  /**
   * 설정 페이지 초기화
   */
  async initialize() {
    try {
      // DOM 요소 참조 저장
      this.cacheElements();

      // 설정 로드
      await this.loadSettings();

      // 권한 상태 확인
      await this.updatePermissionStatus();

      // UI 렌더링
      await this.render();

      // 이벤트 리스너 등록
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('설정 페이지 초기화 완료');
    } catch (error) {
      console.error('설정 페이지 초기화 실패:', error);
      this.showError('설정 페이지를 로드하는 중 오류가 발생했습니다.');
    }
  }

  /**
   * DOM 요소 참조 캐싱
   */
  cacheElements() {
    this.elements = {
      autoGroupingToggle: document.getElementById('auto-grouping-toggle'),
      restoreModeRadios: document.querySelectorAll(
        'input[name="restore-mode"]'
      ),
      newDomainInput: document.getElementById('new-domain-input'),
      addDomainBtn: document.getElementById('add-domain-btn'),
      excludedDomainsList: document.getElementById('excluded-domains-list'),
      permissionStatusIcon: document.getElementById('permission-status-icon'),
      permissionStatusText: document.getElementById('permission-status-text'),
      requestPermissionBtn: document.getElementById('request-permission-btn'),
    };
  }

  /**
   * 설정 로드
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      if (result.settings) {
        this.settings = { ...this.settings, ...result.settings };
      }
      return this.settings;
    } catch (error) {
      console.error('설정 로드 실패:', error);
      // 기본값 반환
      return this.settings;
    }
  }

  /**
   * 설정 저장
   */
  async saveSettings() {
    try {
      await chrome.storage.sync.set({ settings: this.settings });
      await this.notifySettingsChange(this.settings);
      console.log('설정 저장 완료:', this.settings);
    } catch (error) {
      console.error('설정 저장 실패:', error);
      this.showError('설정을 저장하는 중 오류가 발생했습니다.');
    }
  }

  /**
   * UI 렌더링
   */
  async render() {
    // 자동 그룹화 토글 상태 설정
    if (this.elements.autoGroupingToggle) {
      this.elements.autoGroupingToggle.checked = this.settings.autoGrouping;
    }

    // 세션 복원 모드 라디오 버튼 설정
    this.elements.restoreModeRadios.forEach((radio) => {
      radio.checked = radio.value === this.settings.restoreMode;
    });

    // 제외 도메인 목록 렌더링
    await this.renderExcludedDomains(this.settings.excludedDomains);
  }

  /**
   * 제외 도메인 목록 렌더링
   */
  async renderExcludedDomains(domains) {
    if (!this.elements.excludedDomainsList) return;

    this.elements.excludedDomainsList.innerHTML = '';

    if (domains.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = '제외된 도메인이 없습니다.';
      emptyMessage.className = 'empty-message';
      emptyMessage.style.color = '#666';
      emptyMessage.style.fontStyle = 'italic';
      emptyMessage.style.textAlign = 'center';
      emptyMessage.style.padding = '2rem';
      this.elements.excludedDomainsList.appendChild(emptyMessage);
      return;
    }

    domains.forEach((domain) => {
      const domainItem = document.createElement('div');
      domainItem.className = 'excluded-domain-item';

      const domainName = document.createElement('span');
      domainName.className = 'domain-name';
      domainName.textContent = domain;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-danger';
      removeBtn.textContent = '삭제';
      removeBtn.onclick = () => this.removeExcludedDomain(domain);

      domainItem.appendChild(domainName);
      domainItem.appendChild(removeBtn);
      this.elements.excludedDomainsList.appendChild(domainItem);
    });
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 자동 그룹화 토글
    if (this.elements.autoGroupingToggle) {
      this.elements.autoGroupingToggle.addEventListener('change', (e) => {
        this.toggleAutoGrouping(e.target.checked);
      });
    }

    // 세션 복원 모드 라디오 버튼
    this.elements.restoreModeRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.setRestoreMode(e.target.value);
        }
      });
    });

    // 제외 도메인 추가
    if (this.elements.addDomainBtn) {
      this.elements.addDomainBtn.addEventListener('click', () => {
        this.handleAddDomain();
      });
    }

    if (this.elements.newDomainInput) {
      this.elements.newDomainInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleAddDomain();
        }
      });
    }

    // 권한 요청 버튼
    if (this.elements.requestPermissionBtn) {
      this.elements.requestPermissionBtn.addEventListener('click', () => {
        this.requestFileUrlPermission();
      });
    }
  }

  /**
   * 자동 그룹화 토글
   */
  async toggleAutoGrouping(enabled) {
    this.settings.autoGrouping = enabled;
    await this.saveSettings();
    console.log(`자동 그룹화 ${enabled ? '활성화' : '비활성화'}`);
  }

  /**
   * 세션 복원 모드 설정
   */
  async setRestoreMode(mode) {
    if (mode !== 'full' && mode !== 'initial') {
      console.error('잘못된 복원 모드:', mode);
      return;
    }

    this.settings.restoreMode = mode;
    await this.saveSettings();
    console.log(`세션 복원 모드 변경: ${mode}`);
  }

  /**
   * 제외 도메인 추가 처리
   */
  async handleAddDomain() {
    const domain = this.elements.newDomainInput.value.trim();
    if (!domain) {
      this.showError('도메인을 입력해주세요.');
      return;
    }

    // 도메인 유효성 검사
    if (!this.isValidDomain(domain)) {
      this.showError('올바른 도메인 형식을 입력해주세요.');
      return;
    }

    await this.addExcludedDomain(domain);
    this.elements.newDomainInput.value = '';
  }

  /**
   * 제외 도메인 추가
   */
  async addExcludedDomain(domain) {
    if (this.settings.excludedDomains.includes(domain)) {
      this.showError('이미 제외된 도메인입니다.');
      return;
    }

    this.settings.excludedDomains.push(domain);
    await this.saveSettings();
    await this.renderExcludedDomains(this.settings.excludedDomains);

    // 해당 도메인의 탭들을 그룹에서 해제
    await this.ungroupExcludedDomainTabs(domain);

    console.log(`제외 도메인 추가: ${domain}`);
  }

  /**
   * 제외 도메인 삭제
   */
  async removeExcludedDomain(domain) {
    const index = this.settings.excludedDomains.indexOf(domain);
    if (index === -1) return;

    this.settings.excludedDomains.splice(index, 1);
    await this.saveSettings();
    await this.renderExcludedDomains(this.settings.excludedDomains);

    console.log(`제외 도메인 삭제: ${domain}`);
  }

  /**
   * 제외 도메인의 탭들을 그룹에서 해제
   */
  async ungroupExcludedDomainTabs(domain) {
    try {
      const tabs = await chrome.tabs.query({
        url: [`*://${domain}/*`],
      });

      const tabsToUngroup = tabs.filter(
        (tab) => tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE
      );

      if (tabsToUngroup.length > 0) {
        const tabIds = tabsToUngroup.map((tab) => tab.id);
        await chrome.tabGroups.ungroup(tabIds);
        console.log(`${domain} 도메인의 ${tabIds.length}개 탭을 그룹에서 해제`);
      }
    } catch (error) {
      console.error('탭 그룹 해제 실패:', error);
    }
  }

  /**
   * 파일 URL 권한 상태 확인
   */
  async checkFileUrlPermission() {
    try {
      const hasPermission = await chrome.permissions.contains({
        origins: ['file:///*'],
      });
      return hasPermission;
    } catch (error) {
      console.error('권한 확인 실패:', error);
      return false;
    }
  }

  /**
   * 파일 URL 권한 요청
   */
  async requestFileUrlPermission() {
    try {
      this.elements.requestPermissionBtn.disabled = true;
      this.elements.requestPermissionBtn.textContent = '요청 중...';

      const granted = await chrome.permissions.request({
        origins: ['file:///*'],
      });

      if (granted) {
        this.settings.fileUrlPermissionGranted = true;
        await this.saveSettings();
        await this.updatePermissionStatus();
        console.log('파일 URL 권한 허용됨');
      } else {
        console.log('파일 URL 권한 거부됨');
      }

      return granted;
    } catch (error) {
      console.error('권한 요청 실패:', error);
      return false;
    } finally {
      this.elements.requestPermissionBtn.disabled = false;
      this.elements.requestPermissionBtn.textContent = '권한 요청';
    }
  }

  /**
   * 권한 상태 UI 업데이트
   */
  async updatePermissionStatus() {
    const hasPermission = await this.checkFileUrlPermission();

    if (hasPermission) {
      this.elements.permissionStatusIcon.textContent = '✅';
      this.elements.permissionStatusText.textContent = '권한 허용됨';
      this.elements.permissionStatusIcon.parentElement.className =
        'status-indicator status-granted';
      this.elements.requestPermissionBtn.style.display = 'none';
    } else {
      this.elements.permissionStatusIcon.textContent = '❌';
      this.elements.permissionStatusText.textContent = '권한 없음';
      this.elements.permissionStatusIcon.parentElement.className =
        'status-indicator status-denied';
      this.elements.requestPermissionBtn.style.display = 'block';
    }

    this.settings.fileUrlPermissionGranted = hasPermission;
  }

  /**
   * 설정 변경 알림
   */
  async notifySettingsChange(settings) {
    try {
      await chrome.runtime.sendMessage({
        type: 'SETTINGS_CHANGED',
        settings: settings,
      });
    } catch (error) {
      console.error('설정 변경 알림 실패:', error);
    }
  }

  /**
   * 도메인 유효성 검사
   */
  isValidDomain(domain) {
    // 기본적인 도메인 형식 검사
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    // 특수 케이스 허용 (localhost, chrome://, etc.)
    const specialCases = ['localhost', 'chrome://', 'chrome-extension://'];

    return (
      domainRegex.test(domain) ||
      specialCases.some((special) => domain.startsWith(special))
    );
  }

  /**
   * 에러 메시지 표시
   */
  showError(message) {
    // 간단한 에러 표시 (실제 구현에서는 더 나은 UI 사용)
    alert(message);
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  const controller = new OptionsController();
  await controller.initialize();

  // 전역 참조 (디버깅용)
  window.optionsController = controller;
});

export default OptionsController;
