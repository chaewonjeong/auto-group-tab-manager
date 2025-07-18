import StorageUtils from '../utils/storage-utils.js';

/**
 * 프리셋 서비스 - 프리셋 관리 정책 담당
 * 정책 결정만 수행하고, 실제 실행은 PresetManager에게 위임
 * Requirements: 2.2, 2.3, 2.4, 2.5, 9.1, 9.2, 9.3, 9.4
 */
class PresetService {
  /**
   * 프리셋 이름 유효성 검증 정책
   * @param {string} name 프리셋 이름
   * @param {Object} existingPresets 기존 프리셋 목록
   * @returns {Object} 검증 결과
   */
  static validatePresetName(name, existingPresets = {}) {
    const errors = [];

    if (!name || typeof name !== 'string' || name.trim() === '') {
      errors.push('프리셋 이름은 비어있을 수 없습니다');
    } else {
      const trimmedName = name.trim();

      if (existingPresets[trimmedName]) {
        errors.push('이미 존재하는 프리셋 이름입니다');
      }

      if (trimmedName.length > 50) {
        errors.push('프리셋 이름은 50자를 초과할 수 없습니다');
      }

      // 특수문자 검사 (영문, 숫자, 하이픈, 언더스코어만 허용)
      if (!/^[a-zA-Z0-9가-힣\-_\s]+$/.test(trimmedName)) {
        errors.push('프리셋 이름에는 특수문자를 사용할 수 없습니다');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 프리셋 데이터 필터링 정책
   * @param {Array} tabs 탭 목록
   * @param {Array} groups 그룹 목록
   * @param {Object} settings 설정
   * @returns {Object} 필터링된 데이터
   */
  static filterPresetData(tabs, groups, settings) {
    const {
      includeSystemTabs = false,
      includePinnedTabs = true,
      includeEmptyGroups = false,
    } = settings;

    // 탭 필터링
    let filteredTabs = tabs.filter((tab) => {
      // 시스템 탭 제외
      if (!includeSystemTabs && this.isSystemTab(tab.url)) {
        return false;
      }

      // 고정 탭 제외 옵션
      if (!includePinnedTabs && tab.pinned) {
        return false;
      }

      return true;
    });

    // 그룹 필터링
    let filteredGroups = groups;

    if (!includeEmptyGroups) {
      // 탭이 있는 그룹만 포함
      const groupsWithTabs = new Set(
        filteredTabs.map((tab) => tab.groupId).filter((id) => id !== -1)
      );
      filteredGroups = groups.filter((group) => groupsWithTabs.has(group.id));
    }

    return {
      tabs: filteredTabs,
      groups: filteredGroups,
    };
  }

  /**
   * 시스템 탭 여부 확인
   * @param {string} url URL
   * @returns {boolean} 시스템 탭 여부
   */
  static isSystemTab(url) {
    const systemPrefixes = [
      'chrome://',
      'chrome-extension://',
      'about:',
      'moz-extension://',
      'edge://',
    ];

    return systemPrefixes.some((prefix) => url.startsWith(prefix));
  }

  /**
   * 복원 충돌 해결 정책
   * @param {Array} existingTabs 기존 탭들
   * @param {Array} presetTabs 프리셋 탭들
   * @param {Array} existingGroups 기존 그룹들
   * @param {Array} presetGroups 프리셋 그룹들
   * @returns {Object} 충돌 해결 결과
   */
  static resolveRestoreConflicts(
    existingTabs = [],
    presetTabs = [],
    existingGroups = [],
    presetGroups = []
  ) {
    const result = {
      tabsToCreate: [],
      groupsToCreate: [],
      conflictingTabs: [],
      conflictingGroups: [],
    };

    // 기존 탭 URL 매핑
    const existingTabUrls = new Set(existingTabs.map((tab) => tab.url));

    // 탭 충돌 확인
    presetTabs.forEach((presetTab) => {
      if (existingTabUrls.has(presetTab.url)) {
        const existingTab = existingTabs.find(
          (tab) => tab.url === presetTab.url
        );
        result.conflictingTabs.push({
          existing: existingTab,
          preset: presetTab,
        });
      } else {
        result.tabsToCreate.push(presetTab);
      }
    });

    // 기존 그룹 제목 매핑
    const existingGroupTitles = new Set(
      existingGroups.map((group) => group.title)
    );

    // 그룹 충돌 확인
    presetGroups.forEach((presetGroup) => {
      if (existingGroupTitles.has(presetGroup.title)) {
        const existingGroup = existingGroups.find(
          (group) => group.title === presetGroup.title
        );
        result.conflictingGroups.push({
          existing: existingGroup,
          preset: presetGroup,
        });
      } else {
        result.groupsToCreate.push(presetGroup);
      }
    });

    return result;
  }

  /**
   * 충돌 해결 정책 적용
   * @param {Object} conflicts 충돌 정보
   * @param {string} policy 해결 정책
   * @returns {Object} 적용 결과
   */
  static applyConflictResolutionPolicy(conflicts, policy) {
    const result = {
      tabsToCreate: [...conflicts.tabsToCreate],
      groupsToCreate: [...conflicts.groupsToCreate],
      tabsToSkip: [],
      groupsToSkip: [],
      tabsToReplace: [],
      groupsToReplace: [],
    };

    switch (policy) {
      case 'skip-existing':
        result.tabsToSkip = conflicts.conflictingTabs.map((c) => c.existing);
        result.groupsToSkip = conflicts.conflictingGroups.map(
          (c) => c.existing
        );
        break;

      case 'replace-existing':
        result.tabsToReplace = conflicts.conflictingTabs.map((c) => c.preset);
        result.groupsToReplace = conflicts.conflictingGroups.map(
          (c) => c.preset
        );
        break;

      case 'merge':
        // 그룹의 경우 병합, 탭의 경우 스킵
        result.tabsToSkip = conflicts.conflictingTabs.map((c) => c.existing);
        result.groupsToSkip = conflicts.conflictingGroups.map(
          (c) => c.existing
        );
        break;

      default:
        // 기본값: 기존 것 유지 (스킵)
        result.tabsToSkip = conflicts.conflictingTabs.map((c) => c.existing);
        result.groupsToSkip = conflicts.conflictingGroups.map(
          (c) => c.existing
        );
    }

    return result;
  }

  /**
   * 저장할 데이터 결정 정책
   * @param {Array} tabs 탭 목록
   * @param {Array} groups 그룹 목록
   * @param {Object} settings 설정
   * @returns {Object} 저장 결정 결과
   */
  static determineDataToSave(tabs, groups, settings) {
    const filteredData = this.filterPresetData(tabs, groups, settings);

    if (filteredData.tabs.length === 0 && filteredData.groups.length === 0) {
      return {
        shouldSave: false,
        reason: '저장할 탭이나 그룹이 없습니다',
        filteredTabs: [],
        filteredGroups: [],
      };
    }

    return {
      shouldSave: true,
      reason: null,
      filteredTabs: filteredData.tabs,
      filteredGroups: filteredData.groups,
    };
  }

  /**
   * 프리셋 메타데이터 생성
   * @param {string} name 프리셋 이름
   * @param {Object} presetData 프리셋 데이터
   * @returns {Object} 메타데이터
   */
  static generatePresetMetadata(name, presetData) {
    return {
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tabCount: presetData.tabs?.length || 0,
      groupCount: presetData.groups?.length || 0,
      version: '1.0',
    };
  }

  /**
   * 복원 모드 결정 정책
   * @param {Object} settings 설정
   * @param {string} userChoice 사용자 선택
   * @returns {string} 복원 모드
   */
  static determineRestoreMode(settings, userChoice = null) {
    if (userChoice) {
      return userChoice;
    }

    return settings.defaultRestoreMode || 'new-window';
  }

  /**
   * 복원용 프리셋 데이터 검증
   * @param {Object} presetData 프리셋 데이터
   * @returns {Object} 검증 결과
   */
  static validatePresetForRestore(presetData) {
    const errors = [];

    if (!presetData || typeof presetData !== 'object') {
      errors.push('프리셋 데이터가 유효하지 않습니다');
      return { isValid: false, errors };
    }

    if (!Array.isArray(presetData.tabs)) {
      errors.push('탭 데이터가 유효하지 않습니다');
    } else {
      presetData.tabs.forEach((tab, index) => {
        if (!tab.url || typeof tab.url !== 'string' || tab.url.trim() === '') {
          errors.push(`탭 ${index + 1}: URL이 유효하지 않습니다`);
        }
      });
    }

    if (!Array.isArray(presetData.groups)) {
      errors.push('그룹 데이터가 유효하지 않습니다');
    } else {
      presetData.groups.forEach((group, index) => {
        if (
          !group.title ||
          typeof group.title !== 'string' ||
          group.title.trim() === ''
        ) {
          errors.push(`그룹 ${index + 1}: 제목이 유효하지 않습니다`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 프리셋 삭제 가능 여부 확인
   * @param {string} presetName 프리셋 이름
   * @param {Object} settings 설정
   * @returns {Object} 삭제 가능 여부
   */
  static canDeletePreset(presetName, settings) {
    const protectedPresets = settings.protectedPresets || [];

    if (protectedPresets.includes(presetName)) {
      return {
        canDelete: false,
        reason: '보호된 프리셋은 삭제할 수 없습니다',
      };
    }

    return {
      canDelete: true,
      reason: null,
    };
  }

  /**
   * 프리셋 업데이트 가능 여부 확인
   * @param {string} presetName 프리셋 이름
   * @param {Object} newData 새로운 데이터
   * @param {Object} settings 설정
   * @returns {Object} 업데이트 가능 여부
   */
  static canUpdatePreset(presetName, newData, settings) {
    const allowEmptyPresets = settings.allowEmptyPresets !== false;

    if (!allowEmptyPresets) {
      const hasData =
        (newData.tabs && newData.tabs.length > 0) ||
        (newData.groups && newData.groups.length > 0);

      if (!hasData) {
        return {
          canUpdate: false,
          reason: '빈 프리셋은 허용되지 않습니다',
        };
      }
    }

    return {
      canUpdate: true,
      reason: null,
    };
  }

  /**
   * 프리셋 저장 처리 (정책 + 실행 조합)
   * @param {string} name 프리셋 이름
   * @param {Object} PresetManager PresetManager 인스턴스
   */
  static async handlePresetSave(name, PresetManager) {
    try {
      // 1. 정책 결정 - 이름 유효성 검증
      const existingPresets = await PresetManager.getAllPresets();
      const nameValidation = this.validatePresetName(name, existingPresets);

      if (!nameValidation.isValid) {
        console.warn('프리셋 이름 검증 실패:', nameValidation.errors);
        return { success: false, errors: nameValidation.errors };
      }

      // 2. 데이터 수집 (Manager에게 위임)
      const tabs = await chrome.tabs.query({});
      const groups = await chrome.tabGroups.query({});

      // 3. 정책에 따른 데이터 필터링
      const settings = await StorageUtils.loadSettings();
      const saveDecision = this.determineDataToSave(tabs, groups, settings);

      if (!saveDecision.shouldSave) {
        console.warn('저장 정책에 따라 저장하지 않음:', saveDecision.reason);
        return { success: false, reason: saveDecision.reason };
      }

      // 4. 메타데이터 생성
      const presetData = {
        tabs: saveDecision.filteredTabs,
        groups: saveDecision.filteredGroups,
        ...this.generatePresetMetadata(name, {
          tabs: saveDecision.filteredTabs,
          groups: saveDecision.filteredGroups,
        }),
      };

      // 5. 실행 (Manager에게 위임)
      const success = await PresetManager.savePresetData(name, presetData);

      return { success, presetData };
    } catch (error) {
      console.error('프리셋 저장 처리 실패:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 프리셋 복원 처리 (정책 + 실행 조합)
   * @param {string} name 프리셋 이름
   * @param {Object} options 복원 옵션
   * @param {Object} PresetManager PresetManager 인스턴스
   */
  static async handlePresetRestore(name, options, PresetManager) {
    try {
      // 1. 데이터 로드 (Manager에게 위임)
      const presetData = await PresetManager.loadPresetData(name);

      if (!presetData) {
        console.warn(`프리셋을 찾을 수 없습니다: ${name}`);
        return { success: false, reason: '프리셋을 찾을 수 없습니다' };
      }

      // 2. 정책에 따른 데이터 검증
      const validation = this.validatePresetForRestore(presetData);

      if (!validation.isValid) {
        console.warn('프리셋 데이터 검증 실패:', validation.errors);
        return { success: false, errors: validation.errors };
      }

      // 3. 복원 모드 결정
      const settings = await StorageUtils.loadSettings();
      const restoreMode = this.determineRestoreMode(settings, options.mode);

      // 4. 충돌 해결 (current-window 모드인 경우)
      let conflictResolution = null;
      if (restoreMode === 'current-window') {
        const existingTabs = await chrome.tabs.query({});
        const existingGroups = await chrome.tabGroups.query({});

        const conflicts = this.resolveRestoreConflicts(
          existingTabs,
          presetData.tabs,
          existingGroups,
          presetData.groups
        );

        conflictResolution = this.applyConflictResolutionPolicy(
          conflicts,
          options.conflictPolicy || 'skip-existing'
        );
      }

      // 5. 실행 (Manager에게 위임)
      const success = await PresetManager.restorePresetData(
        presetData,
        restoreMode,
        conflictResolution
      );

      return { success, restoreMode, conflictResolution };
    } catch (error) {
      console.error('프리셋 복원 처리 실패:', error);
      return { success: false, error: error.message };
    }
  }
}

export default PresetService;
