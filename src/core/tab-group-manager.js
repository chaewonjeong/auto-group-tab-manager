import ColorManager from './color-manager.js';

/**
 * 탭 그룹 관리 클래스
 * 탭 그룹의 생성, 업데이트, 탭 할당을 담당합니다.
 */
class TabGroupManager {
  /**
   * siteName에 해당하는 기존 그룹을 찾습니다.
   * @param {string} siteName - 찾을 사이트명
   * @param {number} windowId - 윈도우 ID (선택사항)
   * @returns {Promise<chrome.tabGroups.TabGroup|null>} 기존 그룹 또는 null
   */
  static async getExistingGroup(siteName, windowId = null) {
    try {
      const queryOptions = windowId ? { windowId } : {};
      const groups = await chrome.tabGroups.query(queryOptions);
      const matchingGroup = groups.find((group) => {
        return (
          group.title && group.title.toLowerCase() === siteName.toLowerCase()
        );
      });
      if (matchingGroup) {
        console.log(
          `기존 그룹 발견: ${matchingGroup.title} (ID: ${matchingGroup.id})`
        );
        return matchingGroup;
      }
      return null;
    } catch (error) {
      console.error('기존 그룹 조회 중 오류:', error);
      return null;
    }
  }

  /**
   * 새로운 탭 그룹을 생성하거나 기존 그룹을 업데이트합니다.
   * @param {chrome.tabs.Tab} tab - 그룹화할 탭
   * @param {string} siteName - 사이트명
   * @returns {Promise<number|null>} 그룹 ID 또는 null
   */
  static async createOrUpdateGroup(tab, siteName) {
    try {
      // 기존 그룹 확인
      const existingGroup = await this.getExistingGroup(siteName, tab.windowId);
      if (existingGroup) {
        // 기존 그룹에 탭 추가
        console.log(
          `기존 그룹에 탭 추가: ${siteName} (ID: ${existingGroup.id})`
        );
        await this.assignTabToGroup(tab.id, existingGroup.id);

        // 기존 그룹에 추가한 후에도 중복 그룹 확인 및 병합
        const duplicateGroups = await this.findDuplicateGroups(
          siteName,
          tab.windowId
        );
        if (duplicateGroups.length > 1) {
          console.log('기존 그룹 사용 시 중복 그룹 발견, 병합 시도...');
          await this.mergeDuplicateGroups(duplicateGroups);
        }
        return existingGroup.id;
      } else {
        // 새 그룹 생성 - 원자적 작업으로 처리
        console.log(`새 그룹 생성 시작: ${siteName}`);
        const groupId = await this.createNewGroupAtomic(tab, siteName);
        return groupId;
      }
    } catch (error) {
      console.error('그룹 생성/업데이트 중 오류:', error);
      return null;
    }
  }

  /**
   * 새로운 탭 그룹을 생성합니다.
   * @param {chrome.tabs.Tab} tab - 그룹화할 탭
   * @param {string} siteName - 사이트명
   * @returns {Promise<number|null>} 그룹 ID 또는 null
   */
  static async createNewGroup(tab, siteName) {
    try {
      // 탭과 함께 그룹을 생성하여 빈 그룹이 보이는 시간을 최소화
      const groupId = await chrome.tabs.group({ tabIds: [tab.id] });

      // 그룹 생성과 동시에 제목과 색상을 설정하여 빈 그룹 상태를 최소화
      await chrome.tabGroups.update(groupId, {
        title: siteName,
        color: this.getGroupColor(siteName),
        collapsed: false,
      });

      console.log(`새 그룹 생성: ${siteName} (ID: ${groupId})`);
      return groupId;
    } catch (error) {
      console.error('새 그룹 생성 중 오류:', error);
      return null;
    }
  }

  /**
   * 원자적 그룹 생성 - 빈 그룹 상태를 최소화하는 개선된 버전
   * @param {chrome.tabs.Tab} tab - 그룹화할 탭
   * @param {string} siteName - 사이트명
   * @returns {Promise<number|null>} 그룹 ID 또는 null
   */
  static async createNewGroupAtomic(tab, siteName) {
    try {
      // 1. 탭과 함께 그룹을 생성 (빈 그룹 상태 최소화)
      const groupId = await chrome.tabs.group({ tabIds: [tab.id] });

      // 2. 즉시 그룹 속성 설정 (제목과 색상을 동시에 설정)
      const groupColor = this.getGroupColor(siteName);
      await chrome.tabGroups.update(groupId, {
        title: siteName,
        color: groupColor,
        collapsed: false,
      });

      console.log(
        `새 그룹 생성 완료: ${siteName} (ID: ${groupId}, 색상: ${groupColor})`
      );
      return groupId;
    } catch (error) {
      console.error('원자적 그룹 생성 중 오류:', error);

      // 실패 시 탭이 잘못된 그룹에 남아있을 수 있으므로 정리
      try {
        if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          await chrome.tabs.ungroup(tab.id);
          console.log(`실패한 그룹화 정리: 탭 ${tab.id} 그룹 해제`);
        }
      } catch (cleanupError) {
        console.error('그룹화 실패 정리 중 오류:', cleanupError);
      }

      return null;
    }
  }

  /**
   * 탭을 지정된 그룹에 할당합니다.
   * @param {number} tabId - 탭 ID
   * @param {number} groupId - 그룹 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async assignTabToGroup(tabId, groupId) {
    try {
      await chrome.tabs.group({ tabIds: [tabId], groupId: groupId });
      console.log(`탭 ${tabId}을 그룹 ${groupId}에 할당`);
      return true;
    } catch (error) {
      console.error('탭 그룹 할당 중 오류:', error);
      return false;
    }
  }

  /**
   * 사이트명에 따른 그룹 색상을 결정합니다.
   * @param {string} siteName - 사이트명
   * @returns {string} 그룹 색상
   */
  static getGroupColor(siteName) {
    return ColorManager.getColorForSite(siteName);
  }

  /**
   * 중복 그룹을 방지하기 위해 같은 사이트명의 그룹이 여러 개 있는지 확인합니다.
   * @param {string} siteName - 확인할 사이트명
   * @param {number} windowId - 윈도우 ID
   * @returns {Promise<chrome.tabGroups.TabGroup[]>} 중복 그룹 목록
   */
  static async findDuplicateGroups(siteName, windowId = null) {
    try {
      const queryOptions = windowId ? { windowId } : {};
      const groups = await chrome.tabGroups.query(queryOptions);
      const duplicateGroups = groups.filter((group) => {
        return (
          group.title && group.title.toLowerCase() === siteName.toLowerCase()
        );
      });
      if (duplicateGroups.length > 1) {
        console.warn(
          `중복 그룹 발견: ${siteName} (${duplicateGroups.length}개)`
        );
      }
      return duplicateGroups;
    } catch (error) {
      console.error('중복 그룹 확인 중 오류:', error);
      return [];
    }
  }

  /**
   * 중복 그룹을 병합합니다.
   * @param {chrome.tabGroups.TabGroup[]} duplicateGroups - 중복 그룹 목록
   * @returns {Promise<boolean>} 병합 성공 여부
   */
  static async mergeDuplicateGroups(duplicateGroups) {
    try {
      if (duplicateGroups.length <= 1) {
        return true;
      }
      const mainGroup = duplicateGroups[0];
      const groupsToMerge = duplicateGroups.slice(1);
      for (const group of groupsToMerge) {
        const tabs = await chrome.tabs.query({ groupId: group.id });
        if (tabs.length > 0) {
          const tabIds = tabs.map((tab) => tab.id);
          await chrome.tabs.group({ tabIds: tabIds, groupId: mainGroup.id });
        }
      }
      console.log(
        `중복 그룹 병합 완료: ${duplicateGroups.length}개 그룹을 1개로 통합`
      );
      return true;
    } catch (error) {
      console.error('중복 그룹 병합 중 오류:', error);
      return false;
    }
  }

  /**
   * 빈 그룹들을 정리합니다.
   * @returns {Promise<boolean>} 정리 성공 여부
   */
  static async cleanupEmptyGroups() {
    try {
      const groups = await chrome.tabGroups.query({});
      for (const group of groups) {
        const tabsInGroup = await chrome.tabs.query({ groupId: group.id });
        if (tabsInGroup.length === 0) {
          console.log(
            `Empty group ${group.title} will be auto-removed by Chrome`
          );
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to cleanup empty groups:', error);
      return false;
    }
  }

  /**
   * 탭을 그룹에서 제거합니다.
   * @param {number} tabId - 탭 ID
   * @returns {Promise<boolean>} 제거 성공 여부
   */
  static async removeTabFromGroup(tabId) {
    try {
      await chrome.tabs.ungroup(tabId);
      console.log(`탭 ${tabId}을 그룹에서 제거`);
      return true;
    } catch (error) {
      console.error('탭 그룹 제거 중 오류:', error);
      return false;
    }
  }
}

export default TabGroupManager;
