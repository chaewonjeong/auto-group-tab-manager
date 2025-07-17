/**
 * Tab Group Manager - Service Worker (모듈화된 버전)
 *
 * 이 파일은 확장 프로그램의 메인 Service Worker로,
 * importScripts()를 사용하여 모듈을 로드하고
 * 이벤트 리스너와 초기화만 담당합니다.
 */

import DomainAnalyzer from '../core/domain-analyzer.js';
import ColorManager from '../core/color-manager.js';
import TabGroupManager from '../core/tab-group-manager.js';
import StorageUtils from '../utils/storage-utils.js';
import APIUtils from '../utils/api-utils.js';
import TabReassignmentManager from '../managers/tab-reassignment-manager.js';
import EventThrottler from '../utils/event-throttler.js';

export {};

// 전역 상태 관리
const state = {
  isAutoGroupingEnabled: true, // 자동 그룹화 활성화 여부
  excludedDomains: [], // 그룹화에서 제외할 도메인 목록
  fileUrlPermissionGranted: false, // 파일 URL 접근 권한 상태
  navigatorEnabled: false, // 탭 네비게이터 활성화 여부
};

/**
 * Service Worker 초기화 함수
 */
async function initialize() {
  console.log('Tab Group Manager - Service Worker 초기화 중...');

  try {
    // 저장된 설정 로드
    const settings = await StorageUtils.loadSettings();
    if (settings) {
      state.isAutoGroupingEnabled = settings.autoGrouping ?? true;
      state.excludedDomains = settings.excludedDomains ?? [];
      state.fileUrlPermissionGranted =
        settings.fileUrlPermissionGranted ?? false;
      state.navigatorEnabled = settings.navigatorEnabled ?? false;

      console.log('설정 로드 완료:', state);
    } else {
      console.log('저장된 설정 없음, 기본값 사용');
      // 기본 설정 저장
      await saveSettings();
    }

    // API 연결 상태 확인
    const apiTest = await APIUtils.testAPIConnectivity();
    console.log('API 연결 상태:', apiTest);

    if (apiTest.errors.length > 0) {
      console.warn('API 연결 문제:', apiTest.errors);
    }
  } catch (error) {
    console.error('초기화 중 오류 발생:', error);
  }
}

/**
 * 설정 저장 함수
 */
async function saveSettings() {
  const settings = {
    autoGrouping: state.isAutoGroupingEnabled,
    excludedDomains: state.excludedDomains,
    fileUrlPermissionGranted: state.fileUrlPermissionGranted,
    navigatorEnabled: state.navigatorEnabled,
  };

  const success = await StorageUtils.saveSettings(settings);
  if (success) {
    console.log('설정 저장 완료');
  } else {
    console.error('설정 저장 실패');
  }
}

/**
 * 파일 URL 권한 확인 함수
 */
async function checkFileUrlPermission() {
  const hasPermission = await APIUtils.safePermissionsContains({
    origins: ['file:///*'],
  });

  state.fileUrlPermissionGranted = hasPermission;
  console.log('파일 URL 권한 상태:', hasPermission);
  return hasPermission;
}

/**
 * 탭 처리 함수 - 실제 자동 그룹화 로직
 */
async function processTab(tab) {
  // 유효한 URL이 없는 경우 처리하지 않음
  if (!tab.url || tab.url === '') {
    console.log('유효하지 않은 URL, 탭 처리 건너뜀:', tab.id);
    return;
  }

  // 자동 그룹화가 비활성화된 경우 처리하지 않음
  if (!state.isAutoGroupingEnabled) {
    console.log('자동 그룹화 비활성화 상태, 탭 처리 건너뜀:', tab.id);
    return;
  }

  console.log('탭 처리 시작:', tab.id, tab.url);

  try {
    // 1. 도메인 추출 및 분석
    const domain = DomainAnalyzer.extractDomain(tab.url);
    const siteName = DomainAnalyzer.extractSiteName(tab.url);

    console.log(`도메인 분석 결과 - 도메인: ${domain}, 사이트명: ${siteName}`);

    // 2. 특별한 URL 처리
    if (DomainAnalyzer.isFileUrl(tab.url)) {
      // 파일 URL 권한 확인
      const hasPermission = await checkFileUrlPermission();
      if (!hasPermission) {
        console.log('파일 URL 권한 없음, 탭 처리 건너뜀:', tab.id);
        return;
      }
      console.log('로컬 파일 탭 처리:', siteName);
    }

    // 3. 크롬 내부 페이지는 처리하지 않음
    if (domain === 'chrome://' || domain === 'chrome-extension://') {
      console.log('크롬 내부 페이지, 탭 처리 건너뜀:', tab.id);
      return;
    }

    // 4. 제외 도메인 확인
    if (DomainAnalyzer.isExcludedDomain(domain, state.excludedDomains)) {
      console.log('제외 도메인, 탭 처리 건너뜀:', domain);
      return;
    }

    // 5. 이미 그룹화된 탭인지 확인
    if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      console.log(
        '이미 그룹화된 탭, 처리 건너뜀:',
        tab.id,
        'groupId:',
        tab.groupId
      );
      return;
    }

    // 6. 실제 그룹화 로직 실행
    console.log('자동 그룹화 시작:', tab.id, domain);
    const groupId = await TabGroupManager.createOrUpdateGroup(tab, domain);

    if (groupId) {
      console.log(
        `✓ 탭 그룹화 완료: 탭 ${tab.id} → 그룹 ${groupId} (${siteName})`
      );

      // 7. 중복 그룹 확인 및 병합
      const duplicateGroups = await TabGroupManager.findDuplicateGroups(
        domain,
        tab.windowId
      );
      if (duplicateGroups.length > 1) {
        console.log('중복 그룹 발견, 병합 시도...');
        await TabGroupManager.mergeDuplicateGroups(duplicateGroups);
      }
    } else {
      console.warn('탭 그룹화 실패:', tab.id, domain);
    }
  } catch (error) {
    console.error(
      '탭 처리 중 오류 발생:',
      error,
      'Tab ID:',
      tab.id,
      'URL:',
      tab.url
    );
  }
}

/**
 * 종합 기능 테스트 함수
 */
async function runComprehensiveTest() {
  console.log('=== 종합 기능 테스트 시작 ===');

  const testResults = {
    apiConnectivity: false,
    domainAnalysis: false,
    colorManagement: false,
    tabGroupManagement: false,
    storageOperations: false,
    errors: [],
  };

  try {
    // 1. API 연결 테스트
    console.log('1. API 연결 테스트...');
    const apiTest = await APIUtils.testAPIConnectivity();
    testResults.apiConnectivity =
      apiTest.tabs && apiTest.tabGroups && apiTest.storage;
    if (!testResults.apiConnectivity) {
      testResults.errors.push('API 연결 실패: ' + apiTest.errors.join(', '));
    }

    // 2. 도메인 분석 테스트
    console.log('2. 도메인 분석 테스트...');
    const testUrls = [
      'https://github.com/user/repo',
      'https://www.google.com/search',
      'file:///Users/test/project/index.html',
      'chrome://extensions/',
      'https://stackoverflow.com/questions',
    ];

    let domainTestsPassed = 0;
    testUrls.forEach((url) => {
      try {
        const siteName = DomainAnalyzer.extractSiteName(url);
        const domain = DomainAnalyzer.extractDomain(url);
        console.log(`  ${url} → 사이트명: ${siteName}, 도메인: ${domain}`);
        domainTestsPassed++;
      } catch (error) {
        testResults.errors.push(`도메인 분석 실패 (${url}): ${error.message}`);
      }
    });
    testResults.domainAnalysis = domainTestsPassed === testUrls.length;

    // 3. 색상 관리 테스트
    console.log('3. 색상 관리 테스트...');
    const testSites = ['github', 'google', 'stackoverflow', 'unknown-site'];
    let colorTestsPassed = 0;
    testSites.forEach((site) => {
      try {
        const color = ColorManager.getColorForSite(site);
        console.log(`  ${site} → 색상: ${color}`);
        if (ColorManager.AVAILABLE_COLORS.includes(color)) {
          colorTestsPassed++;
        }
      } catch (error) {
        testResults.errors.push(`색상 관리 실패 (${site}): ${error.message}`);
      }
    });
    testResults.colorManagement = colorTestsPassed === testSites.length;

    // 4. 스토리지 테스트
    console.log('4. 스토리지 테스트...');
    try {
      const testSettings = { test: true, timestamp: Date.now() };
      const saveSuccess = await StorageUtils.saveSettings(testSettings);
      const loadedSettings = await StorageUtils.loadSettings();

      testResults.storageOperations =
        saveSuccess && loadedSettings && loadedSettings.test === true;

      if (!testResults.storageOperations) {
        testResults.errors.push('스토리지 저장/로드 실패');
      }
    } catch (error) {
      testResults.errors.push(`스토리지 테스트 실패: ${error.message}`);
    }

    // 5. 탭 그룹 관리 테스트 (실제 탭이 있는 경우에만)
    console.log('5. 탭 그룹 관리 테스트...');
    try {
      const tabs = await APIUtils.getAllTabs();
      const groups = await APIUtils.safeTabGroupsQuery({});

      console.log(`  현재 탭 수: ${tabs.length}`);
      console.log(`  현재 그룹 수: ${groups.length}`);

      testResults.tabGroupManagement = true;
    } catch (error) {
      testResults.errors.push(`탭 그룹 관리 테스트 실패: ${error.message}`);
    }

    // 결과 출력
    console.log('=== 테스트 결과 ===');
    console.log('API 연결:', testResults.apiConnectivity ? '✓' : '✗');
    console.log('도메인 분석:', testResults.domainAnalysis ? '✓' : '✗');
    console.log('색상 관리:', testResults.colorManagement ? '✓' : '✗');
    console.log('탭 그룹 관리:', testResults.tabGroupManagement ? '✓' : '✗');
    console.log('스토리지 작업:', testResults.storageOperations ? '✓' : '✗');

    if (testResults.errors.length > 0) {
      console.log('오류 목록:');
      testResults.errors.forEach((error) => console.log(`  - ${error}`));
    }

    const allTestsPassed =
      testResults.apiConnectivity &&
      testResults.domainAnalysis &&
      testResults.colorManagement &&
      testResults.tabGroupManagement &&
      testResults.storageOperations;

    console.log(`전체 테스트 결과: ${allTestsPassed ? '성공' : '실패'}`);
    console.log('=== 종합 기능 테스트 완료 ===');

    return testResults;
  } catch (error) {
    console.error('종합 테스트 중 오류 발생:', error);
    testResults.errors.push(`전체 테스트 실패: ${error.message}`);
    return testResults;
  }
}

// ============================================================================
// Chrome Extension Event Listeners
// ============================================================================

// 확장 프로그램 설치/업데이트 이벤트
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('확장 프로그램 설치됨:', details.reason);

  // 초기화
  await initialize();

  if (details.reason === 'install') {
    console.log('최초 설치 - 온보딩 페이지 열기');
    // 온보딩 페이지 열기
    await APIUtils.safeTabCreate({ url: 'onboarding.html' });
  }

  // 설치 후 종합 테스트 실행
  console.log('설치 후 종합 테스트 실행...');
  await runComprehensiveTest();
});

// 브라우저 시작 이벤트
chrome.runtime.onStartup.addListener(async () => {
  console.log('브라우저 시작 - Service Worker 초기화');

  try {
    // 초기화
    await initialize();

    // 파일 URL 권한 확인
    await checkFileUrlPermission();

    console.log('✓ Service Worker 초기화 완료');

    // 세션 복원 로직은 다음 태스크에서 구현
    console.log('세션 복원 준비 완료 (구현 예정)');
  } catch (error) {
    console.error('Service Worker 초기화 중 오류 발생:', error);
  }
});

// 탭 생성 이벤트
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    console.log('탭 생성됨:', tab.id, tab.url || '(URL 없음)');

    // 새 탭이 생성되면 처리 (URL이 있는 경우에만)
    if (tab.url && tab.url !== '') {
      await processTab(tab);
    } else {
      console.log('URL이 없는 새 탭, 처리 대기 중:', tab.id);
    }
  } catch (error) {
    console.error('탭 생성 이벤트 처리 중 오류:', error);
  }
});

// 탭 업데이트 이벤트
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    // URL이 변경된 경우 - 그룹 재할당 처리 (스로틀링 적용)
    if (changeInfo.url) {
      console.log('탭 URL 업데이트됨:', tabId, changeInfo.url, '→', tab.url);

      // 자동 그룹화가 활성화된 경우에만 처리
      if (state.isAutoGroupingEnabled) {
        // EventThrottler를 사용하여 과도한 URL 변경 이벤트 방지
        await EventThrottler.throttledUpdate(
          tabId,
          changeInfo,
          tab,
          TabReassignmentManager.handleTabUpdate.bind(TabReassignmentManager)
        );
      }
    }

    // 로딩 완료 시에도 처리 (URL이 늦게 설정되는 경우 대비)
    if (changeInfo.status === 'complete' && tab.url && tab.url !== '') {
      console.log('탭 로딩 완료:', tabId, tab.url);
      await processTab(tab);
    }
  } catch (error) {
    console.error('탭 업데이트 이벤트 처리 중 오류:', error);
  }
});

// 탭 제거 이벤트
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  try {
    console.log(
      '탭 제거됨:',
      tabId,
      '윈도우 닫힘:',
      removeInfo.isWindowClosing
    );

    // 탭 제거 시 그룹 정리 로직은 다음 태스크에서 구현
    if (removeInfo.isWindowClosing) {
      console.log('윈도우가 닫히면서 탭이 제거됨');
    } else {
      console.log('개별 탭이 제거됨');
    }
  } catch (error) {
    console.error('탭 제거 이벤트 처리 중 오류:', error);
  }
});

// 탭 그룹 생성 이벤트
chrome.tabGroups.onCreated.addListener(async (group) => {
  try {
    console.log('탭 그룹 생성됨:', {
      id: group.id,
      title: group.title || '(제목 없음)',
      color: group.color,
      collapsed: group.collapsed,
      windowId: group.windowId,
    });

    // 그룹 내 탭 수 확인
    const groupTabs = await APIUtils.getTabsInGroup(group.id);
    console.log(`새 그룹 내 탭 수: ${groupTabs.length}`);
  } catch (error) {
    console.error('탭 그룹 생성 이벤트 처리 중 오류:', error);
  }
});

// 탭 그룹 업데이트 이벤트
chrome.tabGroups.onUpdated.addListener(async (group) => {
  try {
    console.log('탭 그룹 업데이트됨:', {
      id: group.id,
      title: group.title || '(제목 없음)',
      color: group.color,
      collapsed: group.collapsed,
      windowId: group.windowId,
    });

    // 그룹 내 탭 수 확인
    const groupTabs = await APIUtils.getTabsInGroup(group.id);
    console.log(`업데이트된 그룹 내 탭 수: ${groupTabs.length}`);
  } catch (error) {
    console.error('탭 그룹 업데이트 이벤트 처리 중 오류:', error);
  }
});

// 탭 그룹 제거 이벤트
chrome.tabGroups.onRemoved.addListener((group) => {
  try {
    console.log('탭 그룹 제거됨:', {
      id: group.id,
      title: group.title || '(제목 없음)',
      windowId: group.windowId,
    });

    // 그룹 제거 시 정리 작업은 다음 태스크에서 구현
    console.log('그룹 제거 정리 작업 예정');
  } catch (error) {
    console.error('탭 그룹 제거 이벤트 처리 중 오류:', error);
  }
});

// 메시지 처리 이벤트
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('메시지 수신:', message);

  switch (message.type) {
    case 'GET_TAB_GROUPS':
      // 현재 탭 그룹 정보 반환
      APIUtils.safeTabGroupsQuery({}).then((groups) => {
        sendResponse({ groups: groups });
      });
      break;

    case 'GET_SETTINGS':
      // 현재 설정 반환
      sendResponse({
        settings: {
          autoGrouping: state.isAutoGroupingEnabled,
          excludedDomains: state.excludedDomains,
          fileUrlPermissionGranted: state.fileUrlPermissionGranted,
          navigatorEnabled: state.navigatorEnabled,
        },
      });
      break;

    case 'UPDATE_SETTINGS':
      // 설정 업데이트
      if (message.settings) {
        if (message.settings.autoGrouping !== undefined) {
          state.isAutoGroupingEnabled = message.settings.autoGrouping;
        }
        if (message.settings.excludedDomains) {
          state.excludedDomains = message.settings.excludedDomains;
        }
        if (message.settings.navigatorEnabled !== undefined) {
          state.navigatorEnabled = message.settings.navigatorEnabled;
        }
        if (message.settings.fileUrlPermissionGranted !== undefined) {
          state.fileUrlPermissionGranted =
            message.settings.fileUrlPermissionGranted;
        }

        // 설정 저장
        saveSettings().then(() => {
          sendResponse({ success: true });
        });
      }
      break;

    case 'RUN_COMPREHENSIVE_TEST':
      // 종합 테스트 실행
      runComprehensiveTest().then((results) => {
        sendResponse({ testResults: results });
      });
      break;

    default:
      console.warn('알 수 없는 메시지 타입:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }

  // 비동기 응답을 위해 true 반환
  return true;
});

console.log('Tab Group Manager Service Worker 로드 완료 (모듈화된 버전)');
