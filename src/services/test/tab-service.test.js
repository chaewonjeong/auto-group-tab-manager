import TabService from '../tab-service.js';

// Chrome API 모킹
global.chrome = {
  tabGroups: {
    TAB_GROUP_ID_NONE: -1,
    get: jest.fn(),
  },
};

describe('TabService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('탭 처리 여부 결정 정책', () => {
    const mockSettings = {
      isAutoGroupingEnabled: true,
      excludedDomains: ['localhost'],
      fileUrlPermissionGranted: true,
    };

    test('유효한 탭은 처리해야 함', () => {
      const tab = { url: 'https://github.com/user/repo' };
      const result = TabService.shouldProcessTab(tab, mockSettings);

      expect(result.shouldProcess).toBe(true);
      expect(result.domain).toBe('github.com');
      expect(result.siteName).toBe('github');
    });

    test('빈 URL은 처리하지 않음', () => {
      const tab = { url: '' };
      const result = TabService.shouldProcessTab(tab, mockSettings);

      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toBe('유효하지 않은 URL');
    });

    test('자동 그룹화 비활성화 시 처리하지 않음', () => {
      const tab = { url: 'https://google.com' };
      const settings = { ...mockSettings, isAutoGroupingEnabled: false };
      const result = TabService.shouldProcessTab(tab, settings);

      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toBe('자동 그룹화 비활성화 상태');
    });

    test('파일 URL 권한 없으면 처리하지 않음', () => {
      const tab = { url: 'file:///Users/test/index.html' };
      const settings = { ...mockSettings, fileUrlPermissionGranted: false };
      const result = TabService.shouldProcessTab(tab, settings);

      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toBe('파일 URL 권한 없음');
    });

    test('크롬 내부 페이지는 처리하지 않음', () => {
      const tab = { url: 'chrome://extensions/' };
      const result = TabService.shouldProcessTab(tab, mockSettings);

      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toBe('크롬 내부 페이지');
    });

    test('제외 도메인은 처리하지 않음', () => {
      const tab = { url: 'https://localhost:3000' };
      const result = TabService.shouldProcessTab(tab, mockSettings);

      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toBe('제외 도메인');
    });
  });

  describe('탭 그룹 재할당 필요 여부 결정 정책', () => {
    test('그룹화되지 않은 탭은 새 그룹 생성', () => {
      const tab = { groupId: -1 };
      const currentGroup = null;
      const siteName = 'github';

      const result = TabService.shouldReassignTab(tab, currentGroup, siteName);

      expect(result.shouldReassign).toBe(false);
      expect(result.action).toBe('create-new-group');
    });

    test('그룹 제목과 사이트명이 다르면 재할당', () => {
      const tab = { groupId: 1 };
      const currentGroup = { title: 'old-site' };
      const siteName = 'github';

      const result = TabService.shouldReassignTab(tab, currentGroup, siteName);

      expect(result.shouldReassign).toBe(true);
      expect(result.action).toBe('reassign-to-correct-group');
      expect(result.targetSiteName).toBe('github');
    });

    test('이미 올바른 그룹에 있으면 중복 확인만', () => {
      const tab = { groupId: 1 };
      const currentGroup = { title: 'github' };
      const siteName = 'github';

      const result = TabService.shouldReassignTab(tab, currentGroup, siteName);

      expect(result.shouldReassign).toBe(false);
      expect(result.action).toBe('check-duplicates');
    });
  });

  describe('탭 업데이트 처리 정책', () => {
    const mockSettings = {
      isAutoGroupingEnabled: true,
      excludedDomains: [],
      fileUrlPermissionGranted: true,
    };

    test('URL 변경 시 높은 우선순위로 처리', () => {
      const changeInfo = { url: 'https://github.com/new-repo' };
      const tab = { url: 'https://github.com/new-repo' };

      const result = TabService.determineUpdateAction(
        changeInfo,
        tab,
        mockSettings
      );

      expect(result.hasActions).toBe(true);
      expect(result.actions[0].type).toBe('handle-url-change');
      expect(result.actions[0].priority).toBe('high');
    });

    test('로딩 완료 시 중간 우선순위로 처리', () => {
      const changeInfo = { status: 'complete' };
      const tab = { url: 'https://github.com/repo' };

      const result = TabService.determineUpdateAction(
        changeInfo,
        tab,
        mockSettings
      );

      expect(result.hasActions).toBe(true);
      expect(result.actions[0].type).toBe('handle-loading-complete');
      expect(result.actions[0].priority).toBe('medium');
    });

    test('처리할 수 없는 탭은 건너뜀', () => {
      const changeInfo = { url: 'chrome://extensions/' };
      const tab = { url: 'chrome://extensions/' };

      const result = TabService.determineUpdateAction(
        changeInfo,
        tab,
        mockSettings
      );

      expect(result.hasActions).toBe(true);
      expect(result.actions[0].type).toBe('skip-processing');
    });
  });

  describe('중복 그룹 처리 정책', () => {
    const mockSettings = {
      autoMergeDuplicateGroups: true,
    };

    test('중복 그룹이 없으면 병합하지 않음', () => {
      const duplicateGroups = [{ id: 1, tabCount: 3 }];

      const result = TabService.determineDuplicateGroupAction(
        duplicateGroups,
        mockSettings
      );

      expect(result.shouldMerge).toBe(false);
      expect(result.reason).toBe('중복 그룹 없음');
    });

    test('중복 그룹이 있으면 병합', () => {
      const duplicateGroups = [
        { id: 1, tabCount: 2 },
        { id: 2, tabCount: 5 },
        { id: 3, tabCount: 1 },
      ];

      const result = TabService.determineDuplicateGroupAction(
        duplicateGroups,
        mockSettings
      );

      expect(result.shouldMerge).toBe(true);
      expect(result.targetGroup.id).toBe(2); // 탭 수가 가장 많은 그룹
      expect(result.groupsToMerge).toHaveLength(2);
    });

    test('자동 병합 비활성화 시 사용자에게 알림', () => {
      const duplicateGroups = [{ id: 1 }, { id: 2 }];
      const settings = { autoMergeDuplicateGroups: false };

      const result = TabService.determineDuplicateGroupAction(
        duplicateGroups,
        settings
      );

      expect(result.shouldMerge).toBe(false);
      expect(result.action).toBe('notify-user');
      expect(result.duplicateCount).toBe(2);
    });
  });

  describe('그룹 생성 전략 결정 정책', () => {
    test('기본 그룹 생성 전략', () => {
      const tab = { windowId: 1 };
      const siteName = 'github';
      const settings = { autoMergeDuplicateGroups: true };

      const result = TabService.determineGroupCreationStrategy(
        tab,
        siteName,
        settings
      );

      expect(result.strategy).toBe('create-or-join');
      expect(result.groupTitle).toBe('github');
      expect(result.windowId).toBe(1);
      expect(result.searchExisting).toBe(true);
      expect(result.mergeIfDuplicate).toBe(true);
    });
  });
});
