import DomainAnalyzer from '../core/domain-analyzer.js';

/**
 * 탭 서비스 - 탭 그룹화 정책 담당
 * 정책 결정만 수행하고, 실제 실행은 TabGroupManager에게 위임
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */
class TabService {
  /**
   * 탭 처리 여부 결정 정책
   * @param {Object} tab 탭 객체
   * @param {Object} settings 설정
   * @returns {Object} 처리 여부 결정
   */
  static shouldProcessTab(tab, settings) {
    const errors = [];

    // 1. 기본 유효성 검사
    if (!tab.url || tab.url === '') {
      errors.push('유효하지 않은 URL');
      return { shouldProcess: false, reason: errors[0] };
    }

    // 2. 자동 그룹화 활성화 여부
    if (!settings.isAutoGroupingEnabled) {
      errors.push('자동 그룹화 비활성화 상태');
      return { shouldProcess: false, reason: errors[0] };
    }

    // 3. 도메인 분석
    const domain = DomainAnalyzer.extractDomain(tab.url);
    const siteName = DomainAnalyzer.extractSiteName(tab.url);

    // 4. 파일 URL 권한 확인
    if (DomainAnalyzer.isFileUrl(tab.url)) {
      if (!settings.fileUrlPermissionGranted) {
        errors.push('파일 URL 권한 없음');
        return { shouldProcess: false, reason: errors[0] };
      }
    }

    // 5. 크롬 내부 페이지 제외
    if (domain === 'chrome://' || domain === 'chrome-extension://') {
      errors.push('크롬 내부 페이지');
      return { shouldProcess: false, reason: errors[0] };
    }

    // 6. 제외 도메인 확인
    if (
      DomainAnalyzer.isExcludedDomain(domain, settings.excludedDomains || [])
    ) {
      errors.push('제외 도메인');
      return { shouldProcess: false, reason: errors[0] };
    }

    return {
      shouldProcess: true,
      domain,
      siteName,
      isFileUrl: DomainAnalyzer.isFileUrl(tab.url),
    };
  }

  /**
   * 탭 그룹 재할당 필요 여부 결정 정책
   * @param {Object} tab 탭 객체
   * @param {Object} currentGroup 현재 그룹
   * @param {string} siteName 사이트명
   * @returns {Object} 재할당 필요 여부
   */
  static shouldReassignTab(tab, currentGroup, siteName) {
    if (tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
      return {
        shouldReassign: false,
        reason: '그룹화되지 않은 탭',
        action: 'create-new-group',
      };
    }

    const groupTitle = (currentGroup.title || '').toLowerCase().trim();
    const siteNameLower = siteName.toLowerCase().trim();

    if (groupTitle !== siteNameLower) {
      return {
        shouldReassign: true,
        reason: `그룹 제목 불일치: '${groupTitle}' vs '${siteName}'`,
        action: 'reassign-to-correct-group',
        currentGroupTitle: groupTitle,
        targetSiteName: siteName,
      };
    }

    return {
      shouldReassign: false,
      reason: '이미 올바른 그룹에 있음',
      action: 'check-duplicates',
    };
  }

  /**
   * 탭 업데이트 처리 정책
   * @param {Object} changeInfo 변경 정보
   * @param {Object} tab 탭 객체
   * @param {Object} settings 설정
   * @returns {Object} 처리 방안
   */
  static determineUpdateAction(changeInfo, tab, settings) {
    const actions = [];

    // URL 변경 시
    if (changeInfo.url) {
      const processDecision = this.shouldProcessTab(tab, settings);

      if (processDecision.shouldProcess) {
        actions.push({
          type: 'handle-url-change',
          priority: 'high',
          data: {
            domain: processDecision.domain,
            siteName: processDecision.siteName,
            isFileUrl: processDecision.isFileUrl,
          },
        });
      } else {
        actions.push({
          type: 'skip-processing',
          priority: 'low',
          reason: processDecision.reason,
        });
      }
    }

    // 로딩 완료 시
    if (changeInfo.status === 'complete' && tab.url && tab.url !== '') {
      const processDecision = this.shouldProcessTab(tab, settings);

      if (processDecision.shouldProcess) {
        actions.push({
          type: 'handle-loading-complete',
          priority: 'medium',
          allowReassignment: !!changeInfo.url,
          data: {
            domain: processDecision.domain,
            siteName: processDecision.siteName,
            isFileUrl: processDecision.isFileUrl,
          },
        });
      }
    }

    return {
      actions: actions.sort((a, b) => {
        const priorities = { high: 3, medium: 2, low: 1 };
        return priorities[b.priority] - priorities[a.priority];
      }),
      hasActions: actions.length > 0,
    };
  }

  /**
   * 중복 그룹 처리 정책
   * @param {Array} duplicateGroups 중복 그룹 목록
   * @param {Object} settings 설정
   * @returns {Object} 처리 방안
   */
  static determineDuplicateGroupAction(duplicateGroups, settings) {
    if (duplicateGroups.length <= 1) {
      return {
        shouldMerge: false,
        reason: '중복 그룹 없음',
      };
    }

    // 자동 병합 설정 확인
    if (settings.autoMergeDuplicateGroups === false) {
      return {
        shouldMerge: false,
        reason: '자동 병합 비활성화',
        action: 'notify-user',
        duplicateCount: duplicateGroups.length,
      };
    }

    // 병합 우선순위 결정
    const sortedGroups = duplicateGroups.sort((a, b) => {
      // 1. 탭 수가 많은 그룹 우선
      if (a.tabCount !== b.tabCount) {
        return b.tabCount - a.tabCount;
      }
      // 2. 생성 시간이 빠른 그룹 우선
      return a.id - b.id;
    });

    return {
      shouldMerge: true,
      reason: `${duplicateGroups.length}개 중복 그룹 발견`,
      targetGroup: sortedGroups[0],
      groupsToMerge: sortedGroups.slice(1),
      mergeStrategy: 'preserve-target',
    };
  }

  /**
   * 그룹 생성 전략 결정 정책
   * @param {Object} tab 탭 객체
   * @param {string} siteName 사이트명
   * @param {Object} settings 설정
   * @returns {Object} 생성 전략
   */
  static determineGroupCreationStrategy(tab, siteName, settings) {
    return {
      strategy: 'create-or-join',
      groupTitle: siteName,
      windowId: tab.windowId,
      searchExisting: true,
      mergeIfDuplicate: settings.autoMergeDuplicateGroups !== false,
      colorAssignment: 'auto', // ColorManager에서 결정
    };
  }

  /**
   * 탭 생성 처리 (정책 + 실행 조합)
   * @param {Object} tab 탭 객체
   * @param {Object} settings 설정
   * @param {Object} TabGroupManager TabGroupManager 인스턴스
   * @param {Object} TabReassignmentManager TabReassignmentManager 인스턴스
   * @param {boolean} allowReassignment 재할당 허용 여부
   */
  static async handleTabCreated(
    tab,
    settings,
    TabGroupManager,
    TabReassignmentManager,
    allowReassignment = false
  ) {
    try {
      // 1. 정책 결정 - 처리 여부 확인
      const processDecision = this.shouldProcessTab(tab, settings);

      if (!processDecision.shouldProcess) {
        console.log(`탭 처리 건너뜀 (${tab.id}): ${processDecision.reason}`);
        return { success: false, reason: processDecision.reason };
      }

      const { domain, siteName, isFileUrl } = processDecision;
      console.log(`탭 처리 시작 (${tab.id}): ${siteName} (${domain})`);

      // 2. 그룹 재할당 정책 확인
      if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
        const currentGroup = await chrome.tabGroups.get(tab.groupId);
        const reassignDecision = this.shouldReassignTab(
          tab,
          currentGroup,
          siteName
        );

        if (reassignDecision.shouldReassign) {
          // 실행 (Manager에게 위임)
          await TabReassignmentManager.reassignTabToCorrectGroup(
            tab,
            reassignDecision.targetSiteName,
            reassignDecision.currentGroupTitle
          );
          return { success: true, action: 'reassigned' };
        } else if (reassignDecision.action === 'check-duplicates') {
          // 중복 그룹 확인
          const duplicateGroups = await TabGroupManager.findDuplicateGroups(
            siteName,
            tab.windowId
          );
          const duplicateDecision = this.determineDuplicateGroupAction(
            duplicateGroups,
            settings
          );

          if (duplicateDecision.shouldMerge) {
            await TabGroupManager.mergeDuplicateGroups(duplicateGroups);
            console.log(`중복 그룹 병합 완료: ${duplicateDecision.reason}`);
          }

          if (!allowReassignment) {
            return { success: true, action: 'already-grouped' };
          }
        }
      }

      // 3. 그룹 생성 전략 결정
      const creationStrategy = this.determineGroupCreationStrategy(
        tab,
        siteName,
        settings
      );

      // 4. 실행 (Manager에게 위임)
      const groupId = await TabGroupManager.createOrUpdateGroup(tab, siteName);

      if (groupId) {
        console.log(
          `✓ 탭 그룹화 완료: 탭 ${tab.id} → 그룹 ${groupId} (${siteName})`
        );
        return { success: true, action: 'grouped', groupId, siteName };
      } else {
        console.warn(`탭 그룹화 실패: ${tab.id} (${domain})`);
        return { success: false, reason: '그룹화 실행 실패' };
      }
    } catch (error) {
      console.error('탭 생성 처리 실패:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 탭 업데이트 처리 (정책 + 실행 조합)
   * @param {number} tabId 탭 ID
   * @param {Object} changeInfo 변경 정보
   * @param {Object} tab 탭 객체
   * @param {Object} settings 설정
   * @param {Object} TabReassignmentManager TabReassignmentManager 인스턴스
   */
  static async handleTabUpdated(
    tabId,
    changeInfo,
    tab,
    settings,
    TabReassignmentManager
  ) {
    try {
      // 1. 정책 결정 - 업데이트 액션 결정
      const updateDecision = this.determineUpdateAction(
        changeInfo,
        tab,
        settings
      );

      if (!updateDecision.hasActions) {
        return { success: true, action: 'no-action-needed' };
      }

      // 2. 액션 실행
      const results = [];
      for (const action of updateDecision.actions) {
        switch (action.type) {
          case 'handle-url-change':
            console.log(`탭 URL 업데이트됨: ${tabId} → ${tab.url}`);
            await TabReassignmentManager.handleTabUpdate(
              tabId,
              changeInfo,
              tab
            );
            results.push({ type: action.type, success: true });
            break;

          case 'handle-loading-complete':
            console.log(`탭 로딩 완료: ${tabId} (${tab.url})`);
            const creationResult = await this.handleTabCreated(
              tab,
              settings,
              TabReassignmentManager.TabGroupManager, // 실제로는 주입받아야 함
              TabReassignmentManager,
              action.allowReassignment
            );
            results.push({ type: action.type, ...creationResult });
            break;

          case 'skip-processing':
            console.log(`탭 처리 건너뜀: ${tabId} (${action.reason})`);
            results.push({
              type: action.type,
              success: true,
              reason: action.reason,
            });
            break;
        }
      }

      return { success: true, results };
    } catch (error) {
      console.error('탭 업데이트 처리 실패:', error);
      return { success: false, error: error.message };
    }
  }
}

export default TabService;
