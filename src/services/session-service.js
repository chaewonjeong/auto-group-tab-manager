import StorageUtils from '../utils/storage-utils.js';

/**
 * 세션 서비스 - 세션 관리 정책 담당
 * 정책 결정만 수행하고, 실제 실행은 SessionManager에게 위임
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
class SessionService {
  /**
   * 세션 저장 여부 결정 정책
   * @param {string} trigger 저장 트리거 ('browser-close', 'manual', 'periodic')
   * @param {Object} settings 사용자 설정
   * @returns {boolean} 저장 여부
   */
  static shouldSaveSession(trigger, settings) {
    if (!settings.autoSave) {
      return false;
    }

    switch (trigger) {
      case 'browser-close':
        return settings.saveOnBrowserClose === true;
      case 'manual':
        return settings.manualSaveEnabled === true;
      case 'periodic':
        return settings.periodicSaveEnabled === true;
      default:
        return false;
    }
  }

  /**
   * 복원 모드 결정 정책
   * @param {Object} settings 사용자 설정
   * @param {string} context 복원 컨텍스트 ('startup', 'manual')
   * @param {string} requestedMode 수동 요청된 모드 (manual 시에만 사용)
   * @returns {string} 복원 모드 ('full', 'initial')
   */
  static determineRestoreMode(settings, context, requestedMode = null) {
    if (context === 'manual' && requestedMode) {
      return requestedMode;
    }

    if (context === 'startup') {
      return settings.restoreMode || 'initial';
    }

    return 'initial';
  }

  /**
   * 복원 데이터 필터링 정책
   * @param {Object} sessionData 세션 데이터
   * @param {Object} initialPreset 초기 프리셋 데이터
   * @param {string} mode 복원 모드
   * @returns {Object} 필터링된 복원 데이터
   */
  static filterRestoreData(sessionData, initialPreset, mode) {
    if (mode === 'initial') {
      return {
        sessionData: null,
        initialPreset: initialPreset,
        missingFromInitial: null,
      };
    }

    if (mode === 'full') {
      if (!sessionData) {
        return {
          sessionData: null,
          initialPreset: initialPreset,
          missingFromInitial: null,
        };
      }

      if (!initialPreset) {
        return {
          sessionData: sessionData,
          initialPreset: null,
          missingFromInitial: null,
        };
      }

      // 초기 프리셋에서 누락된 항목 찾기
      const missingFromInitial = this.findMissingItems(
        sessionData,
        initialPreset
      );

      return {
        sessionData: sessionData,
        initialPreset: initialPreset,
        missingFromInitial: missingFromInitial,
      };
    }

    return {
      sessionData: null,
      initialPreset: null,
      missingFromInitial: null,
    };
  }

  /**
   * 브라우저 시작 시 복원 여부 결정 정책
   * @param {Object} settings 사용자 설정
   * @returns {boolean} 복원 여부
   */
  static shouldRestoreOnStartup(settings) {
    return settings.restoreOnStartup === true;
  }

  /**
   * 초기 프리셋 저장 여부 결정 정책
   * @param {Object} context 설치 컨텍스트
   * @returns {boolean} 저장 여부
   */
  static shouldSaveInitialPreset(context) {
    return context.reason === 'install' && context.hasExistingTabs;
  }

  /**
   * 세션 데이터 유효성 검증 정책
   * @param {Object} sessionData 세션 데이터
   * @returns {Object} 검증 결과
   */
  static validateSessionData(sessionData) {
    const errors = [];

    if (!sessionData) {
      errors.push('Session data is null or undefined');
      return { isValid: false, errors };
    }

    if (!sessionData.lastSaved || typeof sessionData.lastSaved !== 'number') {
      errors.push('Invalid or missing lastSaved timestamp');
    }

    if (!Array.isArray(sessionData.tabs)) {
      errors.push('Tabs must be an array');
    } else {
      sessionData.tabs.forEach((tab, index) => {
        if (!tab.url || typeof tab.url !== 'string') {
          errors.push(`Tab ${index}: Invalid or missing URL`);
        }
      });
    }

    if (!Array.isArray(sessionData.groups)) {
      errors.push('Groups must be an array');
    } else {
      sessionData.groups.forEach((group, index) => {
        if (!group.id || typeof group.id !== 'number') {
          errors.push(`Group ${index}: Invalid or missing ID`);
        }
        if (!group.title || typeof group.title !== 'string') {
          errors.push(`Group ${index}: Invalid or missing title`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 탭 충돌 해결 정책
   * @param {Array} existingTabs 기존 탭들
   * @param {Array} newTabs 새로운 탭들
   * @returns {Array} 충돌 해결된 탭 목록
   */
  static resolveTabConflicts(existingTabs, newTabs) {
    const urlMap = new Map();

    // 기존 탭들을 URL로 매핑
    existingTabs.forEach((tab) => {
      urlMap.set(tab.url, tab);
    });

    // 새로운 탭들과 비교하여 최신 것 유지
    newTabs.forEach((tab) => {
      const existing = urlMap.get(tab.url);
      if (!existing || tab.lastAccessed > existing.lastAccessed) {
        urlMap.set(tab.url, tab);
      }
    });

    return Array.from(urlMap.values());
  }

  /**
   * 그룹 충돌 해결 정책
   * @param {Array} existingGroups 기존 그룹들
   * @param {Array} newGroups 새로운 그룹들
   * @returns {Array} 충돌 해결된 그룹 목록
   */
  static resolveGroupConflicts(existingGroups, newGroups) {
    const titleMap = new Map();

    // 기존 그룹들을 제목으로 매핑
    existingGroups.forEach((group) => {
      titleMap.set(group.title, { ...group });
    });

    // 새로운 그룹들과 병합
    newGroups.forEach((group) => {
      const existing = titleMap.get(group.title);
      if (existing) {
        // 동일한 제목의 그룹이 있으면 탭 ID 병합
        existing.tabIds = [...(existing.tabIds || []), ...(group.tabIds || [])];
      } else {
        titleMap.set(group.title, { ...group });
      }
    });

    return Array.from(titleMap.values());
  }

  /**
   * 세션과 초기 프리셋을 비교하여 누락된 항목 찾기
   * @param {Object} sessionData 세션 데이터
   * @param {Object} initialPreset 초기 프리셋
   * @returns {Object} 누락된 탭과 그룹
   */
  static findMissingItems(sessionData, initialPreset) {
    const sessionUrls = new Set(sessionData.tabs?.map((tab) => tab.url) || []);
    const sessionGroupTitles = new Set(
      sessionData.groups?.map((group) => group.title) || []
    );

    const missingTabs =
      initialPreset.tabs?.filter((tab) => !sessionUrls.has(tab.url)) || [];
    const missingGroups =
      initialPreset.groups?.filter(
        (group) => !sessionGroupTitles.has(group.title)
      ) || [];

    return {
      tabs: missingTabs,
      groups: missingGroups,
    };
  }

  /**
   * 브라우저 시작 시 세션 복원 처리 (정책 + 실행 조합)
   * @param {Object} SessionManager SessionManager 인스턴스
   */
  static async handleBrowserStartup(SessionManager) {
    try {
      // 1. 정책 결정
      const settings = await StorageUtils.loadSettings();

      if (!this.shouldRestoreOnStartup(settings)) {
        console.log('시작 시 복원 정책에 따라 복원하지 않음');
        return;
      }

      const restoreMode = this.determineRestoreMode(settings, 'startup');

      // 2. 데이터 로드 (Manager에게 위임)
      const sessionData = await SessionManager.loadSessionData('session');
      const initialPreset = await SessionManager.loadSessionData(
        'initialPreset'
      );

      // 3. 정책에 따른 데이터 필터링
      const filteredData = this.filterRestoreData(
        sessionData,
        initialPreset,
        restoreMode
      );

      // 4. 데이터 유효성 검증
      if (filteredData.sessionData) {
        const validation = this.validateSessionData(filteredData.sessionData);
        if (!validation.isValid) {
          console.warn('세션 데이터 유효성 검증 실패:', validation.errors);
          return;
        }
      }

      // 5. 실행 (Manager에게 위임)
      const window = await chrome.windows.create({});

      if (filteredData.sessionData) {
        await SessionManager.restoreTabsAndGroups(
          filteredData.sessionData,
          window.id
        );
      }

      if (filteredData.initialPreset && restoreMode === 'initial') {
        await SessionManager.restoreTabsAndGroups(
          filteredData.initialPreset,
          window.id
        );
      }

      if (
        filteredData.missingFromInitial &&
        (filteredData.missingFromInitial.tabs.length > 0 ||
          filteredData.missingFromInitial.groups.length > 0)
      ) {
        await SessionManager.restoreTabsAndGroups(
          filteredData.missingFromInitial,
          window.id
        );
      }

      console.log(`세션 복원 완료: ${restoreMode} 모드`);
    } catch (error) {
      console.error('브라우저 시작 시 세션 복원 실패:', error);
    }
  }

  /**
   * 확장 설치 시 초기 프리셋 저장 처리 (정책 + 실행 조합)
   * @param {Object} context 설치 컨텍스트
   * @param {Object} SessionManager SessionManager 인스턴스
   */
  static async handleExtensionInstall(context, SessionManager) {
    try {
      // 1. 정책 결정
      if (!this.shouldSaveInitialPreset(context)) {
        console.log('초기 프리셋 저장 정책에 따라 저장하지 않음');
        return;
      }

      // 2. 실행 (Manager에게 위임)
      await SessionManager.saveInitialPreset();
      console.log('확장 설치 시 초기 프리셋 저장 완료');
    } catch (error) {
      console.error('확장 설치 시 초기 프리셋 저장 실패:', error);
    }
  }
}

export default SessionService;
