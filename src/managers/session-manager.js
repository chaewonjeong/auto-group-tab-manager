import StorageUtils from '../utils/storage-utils.js';

/**
 * 세션 관리자 - 탭 그룹 세션 저장 및 복원
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
class SessionManager {
  /**
   * 현재 세션 저장 (모든 탭과 그룹)
   */
  static async saveCurrentSession() {
    try {
      const tabs = await chrome.tabs.query({});
      const groups = await chrome.tabGroups.query({});

      const sessionData = {
        lastSaved: Date.now(),
        tabs,
        groups,
      };

      await StorageUtils.saveData('session', sessionData);
      console.log('현재 세션 저장 완료:', sessionData);
    } catch (error) {
      console.error('세션 저장 실패:', error);
    }
  }

  /**
   * 초기 프리셋 저장
   */
  static async saveInitialPreset() {
    try {
      const tabs = await chrome.tabs.query({});
      const groups = await chrome.tabGroups.query({});

      const presetData = {
        savedAt: Date.now(),
        tabs,
        groups,
      };

      await StorageUtils.saveData('initialPreset', presetData);
      console.log('초기 프리셋 저장 완료:', presetData);
    } catch (error) {
      console.error('초기 프리셋 저장 실패:', error);
    }
  }

  /**
   * 세션 복원
   * @param {string} mode 'full' | 'initial'
   */
  static async restoreSession(mode) {
    try {
      if (mode === 'full') {
        await this.restoreFullSession();
      } else if (mode === 'initial') {
        await this.restoreInitialSession();
      }
    } catch (error) {
      console.error('세션 복원 실패:', error);
    }
  }

  /**
   * 전체 복원 모드 - 종료 시점 세션 + 누락된 초기 프리셋
   */
  static async restoreFullSession() {
    const sessionData = await StorageUtils.loadData('session');
    const initialPreset = await StorageUtils.loadData('initialPreset');

    if (!sessionData) {
      console.log('복원할 세션 데이터가 없습니다.');
      return;
    }

    // 새 윈도우 생성
    const window = await chrome.windows.create({});

    // 세션 데이터 복원
    await this.restoreTabsAndGroups(sessionData, window.id);

    // 초기 프리셋에서 누락된 항목 확인 및 복원
    if (initialPreset) {
      const missingItems = this.findMissingItems(sessionData, initialPreset);
      if (missingItems.tabs.length > 0 || missingItems.groups.length > 0) {
        await this.restoreTabsAndGroups(missingItems, window.id);
      }
    }
  }

  /**
   * 초기 설정 복원 모드 - 초기 프리셋만 복원
   */
  static async restoreInitialSession() {
    const initialPreset = await StorageUtils.loadData('initialPreset');

    if (!initialPreset) {
      console.log('복원할 초기 프리셋이 없습니다.');
      return;
    }

    // 새 윈도우 생성
    const window = await chrome.windows.create({});

    // 초기 프리셋 복원
    await this.restoreTabsAndGroups(initialPreset, window.id);
  }

  /**
   * 탭과 그룹 복원
   * @param {Object} data 복원할 데이터
   * @param {number} windowId 대상 윈도우 ID
   */
  static async restoreTabsAndGroups(data, windowId) {
    const { tabs, groups } = data;

    // 그룹 생성
    const groupIdMap = new Map();
    for (const group of groups || []) {
      const newGroup = await chrome.tabGroups.create({
        windowId,
      });
      await chrome.tabGroups.update(newGroup.id, {
        title: group.title,
        color: group.color,
        collapsed: group.collapsed,
      });
      groupIdMap.set(group.id, newGroup.id);
    }

    // 탭 생성
    for (const tab of tabs || []) {
      const newTab = await chrome.tabs.create({
        url: tab.url,
        pinned: tab.pinned,
        windowId,
      });

      // 그룹에 할당
      if (tab.groupId && groupIdMap.has(tab.groupId)) {
        await chrome.tabs.group({
          tabIds: [newTab.id],
          groupId: groupIdMap.get(tab.groupId),
        });
      }
    }
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
   * 세션 관련 이벤트 리스너 초기화
   */
  static initializeSessionListeners() {
    // 브라우저 시작 시 세션 복원
    chrome.runtime.onStartup.addListener(async () => {
      const settings = await StorageUtils.loadSettings();
      if (settings.restoreMode) {
        await this.restoreSession(settings.restoreMode);
      }
    });

    // 확장 설치/업데이트 시 초기화
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        console.log('확장 프로그램 설치됨 - 세션 관리자 초기화');
      }
    });
  }

  /**
   * 세션 정보 조회
   * @returns {Promise<Object>} 세션 정보
   */
  static async getSessionInfo() {
    try {
      const sessionData = await StorageUtils.loadData('session');
      const initialPreset = await StorageUtils.loadData('initialPreset');

      return {
        hasSession: !!sessionData,
        hasInitialPreset: !!initialPreset,
        sessionLastSaved: sessionData?.lastSaved || null,
        initialPresetSavedAt: initialPreset?.savedAt || null,
        sessionTabCount: sessionData?.tabs?.length || 0,
        sessionGroupCount: sessionData?.groups?.length || 0,
        initialPresetTabCount: initialPreset?.tabs?.length || 0,
        initialPresetGroupCount: initialPreset?.groups?.length || 0,
      };
    } catch (error) {
      console.error('세션 정보 조회 실패:', error);
      return {
        hasSession: false,
        hasInitialPreset: false,
        sessionLastSaved: null,
        initialPresetSavedAt: null,
        sessionTabCount: 0,
        sessionGroupCount: 0,
        initialPresetTabCount: 0,
        initialPresetGroupCount: 0,
      };
    }
  }

  /**
   * 세션 데이터 삭제
   */
  static async clearSession() {
    try {
      await StorageUtils.saveData('session', null);
      console.log('세션 데이터 삭제 완료');
    } catch (error) {
      console.error('세션 데이터 삭제 실패:', error);
    }
  }

  /**
   * 초기 프리셋 삭제
   */
  static async clearInitialPreset() {
    try {
      await StorageUtils.saveData('initialPreset', null);
      console.log('초기 프리셋 삭제 완료');
    } catch (error) {
      console.error('초기 프리셋 삭제 실패:', error);
    }
  }
}

export default SessionManager;
