/**
 * Chrome API 유틸리티 클래스
 * Chrome Extension API들을 위한 안전한 래퍼 함수들을 제공합니다.
 */
class APIUtils {
  /**
   * 안전한 탭 쿼리를 수행합니다.
   * @param {Object} queryInfo - 탭 쿼리 정보
   * @returns {Promise<chrome.tabs.Tab[]>} 탭 목록
   */
  static async safeTabsQuery(queryInfo = {}) {
    try {
      return await chrome.tabs.query(queryInfo);
    } catch (error) {
      console.error('Tabs query 실패:', error);
      return [];
    }
  }

  /**
   * 안전한 탭 그룹 쿼리를 수행합니다.
   * @param {Object} queryInfo - 탭 그룹 쿼리 정보
   * @returns {Promise<chrome.tabGroups.TabGroup[]>} 탭 그룹 목록
   */
  static async safeTabGroupsQuery(queryInfo = {}) {
    try {
      return await chrome.tabGroups.query(queryInfo);
    } catch (error) {
      console.error('TabGroups query 실패:', error);
      return [];
    }
  }

  /**
   * 안전한 탭 그룹 생성을 수행합니다.
   * @param {Object} options - 그룹 생성 옵션
   * @returns {Promise<number|null>} 그룹 ID 또는 null
   */
  static async safeTabGroupCreate(options) {
    try {
      return await chrome.tabs.group(options);
    } catch (error) {
      console.error('TabGroup 생성 실패:', error);
      return null;
    }
  }

  /**
   * 안전한 탭 그룹 업데이트를 수행합니다.
   * @param {number} groupId - 그룹 ID
   * @param {Object} updateProperties - 업데이트할 속성
   * @returns {Promise<boolean>} 성공 여부
   */
  static async safeTabGroupUpdate(groupId, updateProperties) {
    try {
      await chrome.tabGroups.update(groupId, updateProperties);
      return true;
    } catch (error) {
      console.error('TabGroup 업데이트 실패:', error);
      return false;
    }
  }

  /**
   * 안전한 탭 그룹 정보 조회를 수행합니다.
   * @param {number} groupId - 그룹 ID
   * @returns {Promise<chrome.tabGroups.TabGroup|null>} 그룹 정보 또는 null
   */
  static async safeTabGroupGet(groupId) {
    try {
      return await chrome.tabGroups.get(groupId);
    } catch (error) {
      console.error('TabGroup 정보 조회 실패:', error);
      return null;
    }
  }

  /**
   * 안전한 탭 생성을 수행합니다.
   * @param {Object} createProperties - 탭 생성 속성
   * @returns {Promise<chrome.tabs.Tab|null>} 생성된 탭 또는 null
   */
  static async safeTabCreate(createProperties) {
    try {
      return await chrome.tabs.create(createProperties);
    } catch (error) {
      console.error('Tab 생성 실패:', error);
      return null;
    }
  }

  /**
   * 안전한 탭 업데이트를 수행합니다.
   * @param {number} tabId - 탭 ID
   * @param {Object} updateProperties - 업데이트할 속성
   * @returns {Promise<boolean>} 성공 여부
   */
  static async safeTabUpdate(tabId, updateProperties) {
    try {
      await chrome.tabs.update(tabId, updateProperties);
      return true;
    } catch (error) {
      console.error('Tab 업데이트 실패:', error);
      return false;
    }
  }

  /**
   * 안전한 탭 제거를 수행합니다.
   * @param {number|number[]} tabIds - 탭 ID 또는 탭 ID 배열
   * @returns {Promise<boolean>} 성공 여부
   */
  static async safeTabRemove(tabIds) {
    try {
      await chrome.tabs.remove(tabIds);
      return true;
    } catch (error) {
      console.error('Tab 제거 실패:', error);
      return false;
    }
  }

  /**
   * 안전한 윈도우 생성을 수행합니다.
   * @param {Object} createData - 윈도우 생성 데이터
   * @returns {Promise<chrome.windows.Window|null>} 생성된 윈도우 또는 null
   */
  static async safeWindowCreate(createData) {
    try {
      return await chrome.windows.create(createData);
    } catch (error) {
      console.error('Window 생성 실패:', error);
      return null;
    }
  }

  /**
   * 안전한 권한 확인을 수행합니다.
   * @param {Object} permissions - 확인할 권한
   * @returns {Promise<boolean>} 권한 보유 여부
   */
  static async safePermissionsContains(permissions) {
    try {
      return await chrome.permissions.contains(permissions);
    } catch (error) {
      console.error('권한 확인 실패:', error);
      return false;
    }
  }

  /**
   * 안전한 권한 요청을 수행합니다.
   * @param {Object} permissions - 요청할 권한
   * @returns {Promise<boolean>} 권한 승인 여부
   */
  static async safePermissionsRequest(permissions) {
    try {
      return await chrome.permissions.request(permissions);
    } catch (error) {
      console.error('권한 요청 실패:', error);
      return false;
    }
  }

  /**
   * 현재 활성 탭을 가져옵니다.
   * @returns {Promise<chrome.tabs.Tab|null>} 활성 탭 또는 null
   */
  static async getCurrentActiveTab() {
    try {
      const tabs = await this.safeTabsQuery({
        active: true,
        currentWindow: true,
      });
      return tabs.length > 0 ? tabs[0] : null;
    } catch (error) {
      console.error('활성 탭 조회 실패:', error);
      return null;
    }
  }

  /**
   * 모든 윈도우의 탭을 가져옵니다.
   * @returns {Promise<chrome.tabs.Tab[]>} 모든 탭 목록
   */
  static async getAllTabs() {
    return await this.safeTabsQuery({});
  }

  /**
   * 특정 윈도우의 탭을 가져옵니다.
   * @param {number} windowId - 윈도우 ID
   * @returns {Promise<chrome.tabs.Tab[]>} 윈도우의 탭 목록
   */
  static async getTabsInWindow(windowId) {
    return await this.safeTabsQuery({ windowId });
  }

  /**
   * 그룹화되지 않은 탭을 가져옵니다.
   * @param {number} windowId - 윈도우 ID (선택사항)
   * @returns {Promise<chrome.tabs.Tab[]>} 그룹화되지 않은 탭 목록
   */
  static async getUngroupedTabs(windowId = null) {
    const queryOptions = windowId ? { windowId } : {};
    const tabs = await this.safeTabsQuery(queryOptions);

    return tabs.filter(
      (tab) => tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE
    );
  }

  /**
   * 특정 그룹의 탭을 가져옵니다.
   * @param {number} groupId - 그룹 ID
   * @returns {Promise<chrome.tabs.Tab[]>} 그룹 내 탭 목록
   */
  static async getTabsInGroup(groupId) {
    return await this.safeTabsQuery({ groupId });
  }

  /**
   * API 연결 상태를 테스트합니다.
   * @returns {Promise<Object>} 테스트 결과
   */
  static async testAPIConnectivity() {
    const results = {
      tabs: false,
      tabGroups: false,
      storage: false,
      permissions: false,
      runtime: false,
      errors: [],
    };

    try {
      // Tabs API 테스트
      await this.safeTabsQuery({});
      results.tabs = true;
    } catch (error) {
      results.errors.push(`Tabs API: ${error.message}`);
    }

    try {
      // TabGroups API 테스트
      await this.safeTabGroupsQuery({});
      results.tabGroups = true;
    } catch (error) {
      results.errors.push(`TabGroups API: ${error.message}`);
    }

    try {
      // Storage API 테스트
      await chrome.storage.local.get('test');
      results.storage = true;
    } catch (error) {
      results.errors.push(`Storage API: ${error.message}`);
    }

    try {
      // Permissions API 테스트
      await this.safePermissionsContains({ permissions: ['tabs'] });
      results.permissions = true;
    } catch (error) {
      results.errors.push(`Permissions API: ${error.message}`);
    }

    try {
      // Runtime API 테스트
      const manifest = chrome.runtime.getManifest();
      results.runtime = !!manifest;
    } catch (error) {
      results.errors.push(`Runtime API: ${error.message}`);
    }

    return results;
  }
}

export default APIUtils;
