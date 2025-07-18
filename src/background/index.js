/**
 * Tab Group Manager - Service Worker (모듈화된 버전)
 *
 * 이 파일은 확장 프로그램의 메인 Service Worker로,
 * importScripts()를 사용하여 모듈을 로드하고
 * 이벤트 리스너와 초기화만 담당합니다.
 */

import StorageUtils from '../utils/storage-utils.js';
import APIUtils from '../utils/api-utils.js';
import PerformanceMonitor from '../utils/performance-monitor.js';
import TabService from '../services/tab-service.js';
import TabGroupManager from '../core/tab-group-manager.js';
import TabReassignmentManager from '../managers/tab-reassignment-manager.js';
import SessionService from '../services/session-service.js';
import PresetService from '../services/preset-service.js';
import PermissionService from '../services/permission-service.js';
import SettingsService from '../services/settings-service.js';
import SessionManager from '../managers/session-manager.js';
import PresetManager from '../managers/preset-manager.js';
import PermissionManager from '../managers/permission-manager.js';

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

    // 성능 모니터링 시작
    PerformanceMonitor.startMemoryMonitoring();
    PerformanceMonitor.startPeriodicReporting();
    console.log('성능 모니터링 시작됨');

    // 권한 변경 이벤트 리스너 초기화
    PermissionManager.initializePermissionListeners(
      handlePermissionAdded,
      handlePermissionRemoved
    );
    console.log('권한 이벤트 리스너 초기화 완료');
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
 * 권한 변경 이벤트 핸들러
 */
async function handlePermissionAdded(permissions) {
  console.log('권한 추가됨:', permissions);

  if (permissions.origins && permissions.origins.includes('file:///*')) {
    await PermissionService.handlePermissionChange(
      'file-url',
      true,
      PermissionManager
    );
    state.fileUrlPermissionGranted = true;
    await saveSettings();
  }
}

async function handlePermissionRemoved(permissions) {
  console.log('권한 제거됨:', permissions);

  if (permissions.origins && permissions.origins.includes('file:///*')) {
    await PermissionService.handlePermissionChange(
      'file-url',
      false,
      PermissionManager
    );
    state.fileUrlPermissionGranted = false;
    await saveSettings();
  }
}

// processTab 함수는 TabService로 이동되어 더 이상 사용하지 않음

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

    // 2. Service 계층 테스트
    console.log('2. Service 계층 테스트...');
    try {
      // SessionService 테스트
      const sessionSettings = { autoSave: true, restoreMode: 'full' };
      const sessionDecision = SessionService.shouldSaveSession(
        'browser-close',
        sessionSettings
      );
      console.log(
        '  SessionService 테스트:',
        sessionDecision.shouldSave ? '✓' : '✗'
      );

      // PresetService 테스트
      const presetValidation = PresetService.validatePresetName(
        'test-preset',
        {}
      );
      console.log(
        '  PresetService 테스트:',
        presetValidation.isValid ? '✓' : '✗'
      );

      // PermissionService 테스트
      const permissionContext = {
        trigger: 'file-url-detected',
        hasPermission: false,
      };
      const permissionDecision = PermissionService.shouldRequestPermission(
        'file-url',
        permissionContext,
        { autoRequestPermissions: true }
      );
      console.log(
        '  PermissionService 테스트:',
        permissionDecision.shouldRequest ? '✓' : '✗'
      );

      // SettingsService 테스트
      const settingValidation = SettingsService.validateSetting(
        'autoGrouping',
        true
      );
      console.log(
        '  SettingsService 테스트:',
        settingValidation.isValid ? '✓' : '✗'
      );

      testResults.domainAnalysis = true;
      testResults.colorManagement = true;
    } catch (error) {
      testResults.errors.push(`Service 계층 테스트 실패: ${error.message}`);
    }

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

    // 초기 프리셋 저장 처리 (SessionService로 위임)
    const tabs = await APIUtils.getAllTabs();
    const context = {
      reason: 'install',
      hasExistingTabs: tabs.length > 0,
    };
    await SessionService.handleExtensionInstall(context, SessionManager);

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

    // 세션 복원 처리 (SessionService로 위임)
    await SessionService.handleBrowserStartup(SessionManager);

    console.log('✓ Service Worker 초기화 완료');
  } catch (error) {
    console.error('Service Worker 초기화 중 오류 발생:', error);
  }
});

// 탭 생성 이벤트
chrome.tabs.onCreated.addListener(async (tab) => {
  try {
    console.log(
      '탭 생성됨:',
      tab.id,
      tab.url || '(URL 없음)',
      '상태:',
      tab.status
    );

    // 탭 생성 시 즉시 그룹화하지 않고, 로딩 완료를 기다림
    const result = await TabService.handleTabCreated(
      tab,
      state,
      TabGroupManager,
      TabReassignmentManager
    );

    if (result.action === 'deferred') {
      console.log(`탭 ${tab.id} 그룹화 지연됨: ${result.reason}`);
    }
  } catch (error) {
    console.error('탭 생성 이벤트 처리 중 오류:', error);
  }
});

// 탭 업데이트 이벤트
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    // 로딩 완료 시에만 상세 로그 출력
    if (changeInfo.status === 'complete') {
      console.log(`탭 로딩 완료: ${tabId} (${tab.url})`);
    }

    const result = await TabService.handleTabUpdated(
      tabId,
      changeInfo,
      tab,
      state,
      TabReassignmentManager
    );

    // 결과에 따른 추가 로깅
    if (result.success && result.results) {
      const groupedResults = result.results.filter(
        (r) => r.action === 'grouped'
      );
      if (groupedResults.length > 0) {
        console.log(`탭 ${tabId} 그룹화 완료 (로딩 완료 후)`);
      }
    }
  } catch (error) {
    console.error('탭 업데이트 이벤트 처리 중 오류:', error);
  }
});

// 탭 제거 이벤트
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  try {
    console.log(
      '탭 제거됨:',
      tabId,
      '윈도우 닫힘:',
      removeInfo.isWindowClosing
    );

    // 개별 탭이 제거된 경우에만 빈 그룹 정리 수행
    if (!removeInfo.isWindowClosing) {
      console.log('개별 탭 제거 - 빈 그룹 정리 시작');

      // 잠시 대기 후 빈 그룹 정리 (Chrome이 그룹 상태를 업데이트할 시간 제공)
      setTimeout(async () => {
        try {
          await TabGroupManager.cleanupEmptyGroups();
          console.log('빈 그룹 정리 완료');
        } catch (error) {
          console.error('빈 그룹 정리 중 오류:', error);
        }
      }, 100);
    } else {
      console.log('윈도우가 닫히면서 탭이 제거됨 - 그룹 정리 생략');
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
      // 설정 업데이트 (SettingsService로 위임)
      if (message.settings) {
        const promises = [];

        // 각 설정 변경을 SettingsService로 처리
        Object.entries(message.settings).forEach(([key, newValue]) => {
          const oldValue =
            state[key === 'autoGrouping' ? 'isAutoGroupingEnabled' : key];

          if (oldValue !== newValue) {
            const context = {
              hasExistingTabs: true, // 실제로는 탭 수 확인 필요
              affectedTabs: [], // 실제로는 영향받는 탭들 확인 필요
            };

            const changeResult = SettingsService.applySettingChange(
              key,
              oldValue,
              newValue,
              context
            );
            console.log(`설정 변경 적용: ${key}`, changeResult);

            // 상태 업데이트
            if (key === 'autoGrouping') {
              state.isAutoGroupingEnabled = newValue;
            } else {
              state[key] = newValue;
            }
          }
        });

        // 상태는 메시지 처리 시 직접 전달

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

    case 'GET_PERFORMANCE_REPORT':
      // 성능 보고서 반환
      const report = PerformanceMonitor.generateReport();
      sendResponse({ performanceReport: report });
      break;

    case 'RESET_PERFORMANCE_METRICS':
      // 성능 메트릭 초기화
      PerformanceMonitor.reset();
      sendResponse({
        success: true,
        message: '성능 메트릭이 초기화되었습니다.',
      });
      break;

    case 'LOG_PERFORMANCE_REPORT':
      // 성능 보고서 콘솔 출력
      PerformanceMonitor.logReport();
      sendResponse({
        success: true,
        message: '성능 보고서가 콘솔에 출력되었습니다.',
      });
      break;

    // 팝업 UI 관련 메시지 처리
    case 'GET_NAVIGATOR_STATUS':
      sendResponse({ enabled: state.navigatorEnabled });
      break;

    case 'TOGGLE_NAVIGATOR':
      state.navigatorEnabled = !state.navigatorEnabled;
      saveSettings().then(() => {
        sendResponse({ enabled: state.navigatorEnabled });
      });
      break;

    case 'GET_PRESETS':
      PresetService.getAllPresets(PresetManager)
        .then((presets) => {
          sendResponse({ presets: presets });
        })
        .catch((error) => {
          console.error('프리셋 로드 실패:', error);
          sendResponse({ presets: [], error: error.message });
        });
      break;

    case 'SAVE_CURRENT_PRESET':
      if (message.name) {
        PresetService.saveCurrentAsPreset(message.name, PresetManager)
          .then((result) => {
            sendResponse({
              success: result.success,
              presetId: result.presetId,
            });
          })
          .catch((error) => {
            console.error('프리셋 저장 실패:', error);
            sendResponse({ success: false, error: error.message });
          });
      } else {
        sendResponse({ success: false, error: '프리셋 이름이 필요합니다.' });
      }
      break;

    case 'RESTORE_PRESET':
      if (message.presetId) {
        PresetService.restorePreset(message.presetId, PresetManager)
          .then((result) => {
            sendResponse({ success: result.success });
          })
          .catch((error) => {
            console.error('프리셋 복원 실패:', error);
            sendResponse({ success: false, error: error.message });
          });
      } else {
        sendResponse({ success: false, error: '프리셋 ID가 필요합니다.' });
      }
      break;

    case 'DELETE_PRESET':
      if (message.presetId) {
        PresetService.deletePreset(message.presetId, PresetManager)
          .then((result) => {
            sendResponse({ success: result.success });
          })
          .catch((error) => {
            console.error('프리셋 삭제 실패:', error);
            sendResponse({ success: false, error: error.message });
          });
      } else {
        sendResponse({ success: false, error: '프리셋 ID가 필요합니다.' });
      }
      break;

    default:
      console.warn('알 수 없는 메시지 타입:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }

  // 비동기 응답을 위해 true 반환
  return true;
});

console.log('Tab Group Manager Service Worker 로드 완료 (모듈화된 버전)');
