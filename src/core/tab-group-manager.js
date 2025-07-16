/**
 * 탭 그룹 관리 클래스
 * 탭 그룹의 생성, 업데이트, 탭 할당을 담당합니다.
 */
class TabGroupManager {
  /**
   * 도메인에 해당하는 기존 그룹을 찾습니다.
   * @param {string} domain - 찾을 도메인
   * @param {number} windowId - 윈도우 ID (선택사항)
   * @returns {Promise<chrome.tabGroups.TabGroup|null>} 기존 그룹 또는 null
   */
  static async getExistingGroup(domain, windowId = null) {
    try {
      const siteName = DomainAnalyzer.extractSiteName(`https://${domain}`);

      // 현재 윈도우의 모든 그룹 조회
      const queryOptions = windowId ? { windowId } : {};
      const groups = await chrome.tabGroups.query(queryOptions);

      // 같은 사이트명을 가진 그룹 찾기
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
   * @param {string} domain - 도메인
   * @returns {Promise<number|null>} 그룹 ID 또는 null
   */
  static async createOrUpdateGroup(tab, domain) {
    try {
      const siteName = DomainAnalyzer.extractSiteName(tab.url);

      // 기존 그룹 확인
      const existingGroup = await this.getExistingGroup(domain, tab.windowId);

      if (existingGroup) {
        // 기존 그룹에 탭 추가
        await this.assignTabToGroup(tab.id, existingGroup.id);
        return existingGroup.id;
      } else {
        // 새 그룹 생성
        const groupId = await this.createNewGroup(tab, siteName);
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
      // 탭을 그룹으로 만들기
      const groupId = await chrome.tabs.group({
        tabIds: [tab.id],
      });

      // 그룹 속성 설정
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
   * 탭을 지정된 그룹에 할당합니다.
   * @param {number} tabId - 탭 ID
   * @param {number} groupId - 그룹 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async assignTabToGroup(tabId, groupId) {
    try {
      await chrome.tabs.group({
        tabIds: [tabId],
        groupId: groupId,
      });

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
   * 중복 그룹을 방지하기 위해 같은 도메인의 그룹이 여러 개 있는지 확인합니다.
   * @param {string} domain - 확인할 도메인
   * @param {number} windowId - 윈도우 ID
   * @returns {Promise<chrome.tabGroups.TabGroup[]>} 중복 그룹 목록
   */
  static async findDuplicateGroups(domain, windowId = null) {
    try {
      const siteName = DomainAnalyzer.extractSiteName(`https://${domain}`);
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

      // 첫 번째 그룹을 메인 그룹으로 사용
      const mainGroup = duplicateGroups[0];
      const groupsToMerge = duplicateGroups.slice(1);

      for (const group of groupsToMerge) {
        // 그룹의 모든 탭을 메인 그룹으로 이동
        const tabs = await chrome.tabs.query({ groupId: group.id });

        if (tabs.length > 0) {
          const tabIds = tabs.map((tab) => tab.id);
          await chrome.tabs.group({
            tabIds: tabIds,
            groupId: mainGroup.id,
          });
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
}
