import StorageUtils from '../utils/storage-utils.js';

/**
 * 세션 관리자 - 순수 실행 기능만 담당 (정책 없음)
 * 정책 결정은 SessionService에서 수행
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
   * 세션 데이터 로드 (순수 기능)
   * @param {string} key 스토리지 키
   * @returns {Promise<Object>} 세션 데이터
   */
  static async loadSessionData(key) {
    try {
      return await StorageUtils.loadData(key);
    } catch (error) {
      console.error(`세션 데이터 로드 실패 (${key}):`, error);
      return null;
    }
  }

  /**
   * 세션 데이터 저장 (순수 기능)
   * @param {string} key 스토리지 키
   * @param {Object} data 저장할 데이터
   */
  static async saveSessionData(key, data) {
    try {
      await StorageUtils.saveData(key, data);
      console.log(`세션 데이터 저장 완료 (${key})`);
    } catch (error) {
      console.error(`세션 데이터 저장 실패 (${key}):`, error);
      throw error;
    }
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
   * 이벤트 리스너 등록 (순수 기능)
   * 실제 정책 결정은 SessionService에서 수행
   * @param {Function} onStartupCallback 시작 시 콜백
   * @param {Function} onInstalledCallback 설치 시 콜백
   */
  static initializeSessionListeners(onStartupCallback, onInstalledCallback) {
    if (onStartupCallback) {
      chrome.runtime.onStartup.addListener(onStartupCallback);
    }

    if (onInstalledCallback) {
      chrome.runtime.onInstalled.addListener(onInstalledCallback);
    }
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
