import TabGroupManager from '../core/tab-group-manager.js';

/**
 * 탭 URL 변경 시 그룹 재할당을 관리하는 클래스
 * 탭의 URL이 변경될 때 적절한 그룹으로 자동 재할당합니다.
 */
class TabReassignmentManager {
  /**
   * 탭 업데이트 이벤트를 처리합니다.
   * @param {number} tabId - 탭 ID
   * @param {Object} changeInfo - 변경 정보
   * @param {chrome.tabs.Tab} tab - 탭 객체
   */
  static async handleTabUpdate(tabId, changeInfo, tab) {
    try {
      if (!changeInfo.url) return;
      const siteName = tab.siteName || '';
      // 탭이 그룹에 속해 있지 않으면 새 그룹화 시도
      if (tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
        await TabGroupManager.createOrUpdateGroup(tab, siteName);
        return;
      }
      // 현재 그룹 정보 가져오기
      const currentGroup = await chrome.tabGroups.get(tab.groupId);
      const groupTitle = (currentGroup.title || '').toLowerCase().trim();
      const siteNameLower = siteName.toLowerCase().trim();
      if (groupTitle !== siteNameLower) {
        await this.reassignTabToCorrectGroup(tab, siteName, groupTitle);
      }
    } catch (error) {
      console.error('탭 업데이트 처리 중 오류:', error);
    }
  }

  /**
   * 탭을 올바른 그룹으로 재할당합니다.
   * @param {chrome.tabs.Tab} tab - 탭 객체
   * @param {string} newSiteName - 새로운 사이트명
   * @param {string} oldGroupTitle - 이전 그룹명
   */
  static async reassignTabToCorrectGroup(tab, newSiteName, oldGroupTitle) {
    try {
      // 1. 현재 그룹에서 제거
      await this.removeFromCurrentGroup(tab.id);
      // 2. 새 그룹에 할당
      const targetGroupId = await TabGroupManager.createOrUpdateGroup(
        tab,
        newSiteName
      );
      if (targetGroupId) {
        console.log(`✓ 탭 재할당 완료: 탭 ${tab.id} → 그룹 ${targetGroupId}`);
      }
      // 3. 빈 그룹 정리
      await TabGroupManager.cleanupEmptyGroups();
    } catch (error) {
      console.error('탭 재할당 중 오류:', error);
    }
  }

  /**
   * 탭을 현재 그룹에서 제거합니다.
   * @param {number} tabId - 탭 ID
   */
  static async removeFromCurrentGroup(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        await chrome.tabs.ungroup(tabId);
      }
    } catch (error) {
      console.error('그룹에서 탭 제거 실패:', error);
    }
  }
}

export default TabReassignmentManager;
