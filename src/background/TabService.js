import TabGroupManager from '../core/tab-group-manager.js';
import TabReassignmentManager from '../managers/tab-reassignment-manager.js';
import DomainAnalyzer from '../core/domain-analyzer.js';
import StorageUtils from '../utils/storage-utils.js';
import APIUtils from '../utils/api-utils.js';
import PerformanceMonitor from '../utils/performance-monitor.js';

// 임시 전역 상태 (추후 외부에서 주입하도록 개선 가능)
let state = {
  isAutoGroupingEnabled: true,
  excludedDomains: [],
  fileUrlPermissionGranted: false,
  navigatorEnabled: false,
};

// 외부에서 상태를 주입할 수 있도록 하는 setter (추후 개선)
export function setTabServiceState(newState) {
  state = { ...state, ...newState };
}

async function checkFileUrlPermission() {
  const hasPermission = await APIUtils.safePermissionsContains({
    origins: ['file:///*'],
  });
  state.fileUrlPermissionGranted = hasPermission;
  return hasPermission;
}

class TabService {
  /**
   * 탭 생성 이벤트 처리 (processTab 로직 이관)
   * @param {chrome.tabs.Tab} tab
   * @param {boolean} allowReassignment
   */
  static async handleTabCreated(tab, allowReassignment = false) {
    if (!tab.url || tab.url === '') {
      console.log('유효하지 않은 URL, 탭 처리 건너뜀:', tab.id);
      return;
    }
    if (!state.isAutoGroupingEnabled) {
      console.log('자동 그룹화 비활성화 상태, 탭 처리 건너뜀:', tab.id);
      return;
    }
    // siteName 추출 및 tab에 부착
    const siteName = DomainAnalyzer.extractSiteName(tab.url);
    tab.siteName = siteName;
    const domain = DomainAnalyzer.extractDomain(tab.url);
    console.log(`도메인 분석 결과 - 도메인: ${domain}, 사이트명: ${siteName}`);
    if (DomainAnalyzer.isFileUrl(tab.url)) {
      const hasPermission = await checkFileUrlPermission();
      if (!hasPermission) {
        console.log('파일 URL 권한 없음, 탭 처리 건너뜀:', tab.id);
        return;
      }
      console.log('로컬 파일 탭 처리:', siteName);
    }
    if (domain === 'chrome://' || domain === 'chrome-extension://') {
      console.log('크롬 내부 페이지, 탭 처리 건너뜀:', tab.id);
      return;
    }
    if (DomainAnalyzer.isExcludedDomain(domain, state.excludedDomains)) {
      console.log('제외 도메인, 탭 처리 건너뜀:', domain);
      return;
    }
    return await PerformanceMonitor.measureTime('tabProcessing', async () => {
      if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        const currentGroup = await chrome.tabGroups.get(tab.groupId);
        const groupTitle = (currentGroup.title || '').toLowerCase().trim();
        const siteNameLower = siteName.toLowerCase().trim();
        if (groupTitle !== siteNameLower) {
          await TabReassignmentManager.reassignTabToCorrectGroup(
            tab,
            siteName,
            groupTitle
          );
          return;
        } else {
          if (!allowReassignment) {
            console.log(
              '이미 올바른 그룹에 있는 탭, 처리 건너뜀:',
              tab.id,
              'groupId:',
              tab.groupId,
              'title:',
              groupTitle
            );
          }
          const duplicateGroups = await TabGroupManager.findDuplicateGroups(
            siteName,
            tab.windowId
          );
          if (duplicateGroups.length > 1) {
            console.log(
              '이미 올바른 그룹에 있지만 중복 그룹 발견, 병합 시도...'
            );
            await TabGroupManager.mergeDuplicateGroups(duplicateGroups);
          }
          if (!allowReassignment) {
            return;
          }
        }
      }
      console.log('자동 그룹화 시작:', tab.id, domain);
      const groupId = await PerformanceMonitor.measureTime(
        'groupCreation',
        async () => {
          return await TabGroupManager.createOrUpdateGroup(tab, siteName);
        }
      );
      if (groupId) {
        console.log(
          `✓ 탭 그룹화 완료: 탭 ${tab.id} → 그룹 ${groupId} (${siteName})`
        );
      } else {
        console.warn('탭 그룹화 실패:', tab.id, domain);
      }
    });
  }

  /**
   * 탭 업데이트 이벤트 처리 (onUpdated 리스너 흐름 반영)
   * @param {number} tabId
   * @param {Object} changeInfo
   * @param {chrome.tabs.Tab} tab
   */
  static async handleTabUpdated(tabId, changeInfo, tab) {
    // siteName 항상 부착
    tab.siteName = DomainAnalyzer.extractSiteName(tab.url);
    const domain = DomainAnalyzer.extractDomain(tab.url);
    // URL이 변경된 경우 - 그룹 재할당 처리 (정책/필터링은 여기서만)
    if (changeInfo.url) {
      console.log('탭 URL 업데이트됨:', tabId, changeInfo.url, '→', tab.url);
      if (!state.isAutoGroupingEnabled) return;
      if (!tab.url || tab.url === '') return;
      if (DomainAnalyzer.isFileUrl(tab.url)) {
        const hasPermission = await checkFileUrlPermission();
        if (!hasPermission) return;
      }
      if (domain === 'chrome://' || domain === 'chrome-extension://') return;
      if (DomainAnalyzer.isExcludedDomain(domain, state.excludedDomains))
        return;
      await TabReassignmentManager.handleTabUpdate(tabId, changeInfo, tab);
    }
    // 로딩 완료 시에도 처리 (URL이 늦게 설정되는 경우 대비)
    if (changeInfo.status === 'complete' && tab.url && tab.url !== '') {
      console.log('탭 로딩 완료:', tabId, tab.url);
      const allowReassignment = !!changeInfo.url;
      await TabService.handleTabCreated(tab, allowReassignment);
    }
  }
}

export default TabService;
