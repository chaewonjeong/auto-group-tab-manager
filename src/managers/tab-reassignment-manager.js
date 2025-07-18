import DomainAnalyzer from '../core/domain-analyzer.js';
import TabGroupManager from '../core/tab-group-manager.js';
import StorageUtils from '../utils/storage-utils.js';
import EventThrottler from '../utils/event-throttler.js';

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
      // URL이 변경되지 않았으면 처리하지 않음
      if (!changeInfo.url) {
        return;
      }

      const oldUrl = changeInfo.url;
      const newUrl = tab.url;

      const oldDomain = DomainAnalyzer.extractSiteName(oldUrl);
      const newDomain = DomainAnalyzer.extractSiteName(newUrl);

      // 도메인이 변경된 경우에만 처리
      if (!DomainAnalyzer.compareDomains(oldDomain, newDomain)) {
        await this.reassignTabToCorrectGroup(tab, newDomain, oldDomain);
      }
    } catch (error) {
      console.error('탭 업데이트 처리 중 오류:', error);
    }
  }

  /**
   * 탭을 올바른 그룹으로 재할당합니다.
   * @param {chrome.tabs.Tab} tab - 탭 객체
   * @param {string} newDomain - 새로운 도메인
   * @param {string} oldDomain - 이전 도메인
   */
  static async reassignTabToCorrectGroup(tab, newDomain, oldDomain) {
    try {
      console.log(`탭 재할당 시작: ${tab.id} (${oldDomain} → ${newDomain})`);

      // 1. 현재 그룹에서 제거
      await this.removeFromCurrentGroup(tab.id);

      // 2. 새 도메인이 제외 목록에 있는지 확인
      if (await this.shouldExcludeFromGrouping(newDomain)) {
        console.log(`제외 도메인으로 그룹화 안함: ${newDomain}`);
        return; // 그룹화하지 않음
      }

      // 3. Service Worker의 processTab 함수를 통해 재그룹화
      // 이를 위해 메시지를 보내거나 직접 호출
      // 여기서는 직접 TabGroupManager를 사용하여 처리
      const targetGroupId = await TabGroupManager.createOrUpdateGroup(
        tab,
        DomainAnalyzer.extractDomain(tab.url)
      );

      if (targetGroupId) {
        console.log(`✓ 탭 재할당 완료: 탭 ${tab.id} → 그룹 ${targetGroupId}`);
      }

      // 4. 빈 그룹 정리
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
      console.error('Failed to remove tab from group:', error);
    }
  }

  /**
   * 새 도메인에 맞는 그룹을 찾거나 생성합니다.
   * @param {string} domain - 도메인
   * @param {chrome.tabs.Tab} tab - 탭 객체
   * @returns {Promise<Object|number|null>} 그룹 객체 또는 그룹 ID
   */
  static async findOrCreateTargetGroup(domain, tab) {
    try {
      // 기존 그룹 찾기
      const existingGroup = await TabGroupManager.getExistingGroup(domain);
      if (existingGroup) {
        return existingGroup;
      }

      // 새 그룹 생성
      return await TabGroupManager.createOrUpdateGroup(tab, domain);
    } catch (error) {
      console.error('그룹 찾기/생성 중 오류:', error);
      return null;
    }
  }

  /**
   * 도메인이 그룹화에서 제외되어야 하는지 확인합니다.
   * @param {string} domain - 확인할 도메인
   * @returns {Promise<boolean>} 제외 여부
   */
  static async shouldExcludeFromGrouping(domain) {
    try {
      const settings = await StorageUtils.loadSettings();
      const excludedDomains = settings?.excludedDomains || [];
      return DomainAnalyzer.isExcludedDomain(domain, excludedDomains);
    } catch (error) {
      console.error('제외 도메인 확인 중 오류:', error);
      return false;
    }
  }
}

export default TabReassignmentManager;
