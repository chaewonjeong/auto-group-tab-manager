/**
 * 설정 서비스 - 설정 변경 적용 정책 담당
 * 정책 결정만 수행하고, 실제 실행은 다른 Manager들에게 위임
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
class SettingsService {
  // 설정 스키마 정의
  static SETTING_SCHEMAS = {
    autoGrouping: { type: 'boolean', default: true },
    excludedDomains: { type: 'array', default: [], itemType: 'string' },
    restoreMode: {
      type: 'enum',
      values: ['full', 'initial'],
      default: 'initial',
    },
    showNotifications: { type: 'boolean', default: true },
    navigatorEnabled: { type: 'boolean', default: false },
    fileUrlPermissionGranted: { type: 'boolean', default: false },
  };

  // 중요한 설정 키 (백업 필요)
  static CRITICAL_SETTINGS = ['autoGrouping', 'excludedDomains', 'restoreMode'];

  // 현재 설정 버전
  static CURRENT_VERSION = '2.0';

  /**
   * 설정 변경 시 적용 정책
   * @param {string} key 설정 키
   * @param {*} oldValue 이전 값
   * @param {*} newValue 새로운 값
   * @param {Object} context 컨텍스트 정보
   * @returns {Object} 적용 방안
   */
  static applySettingChange(key, oldValue, newValue, context = {}) {
    // 값이 동일한 경우 변경하지 않음
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      return {
        action: 'no-change',
        message: '설정 값이 동일하여 변경하지 않습니다',
      };
    }

    switch (key) {
      case 'autoGrouping':
        return this.handleAutoGroupingChange(oldValue, newValue, context);

      case 'excludedDomains':
        return this.handleExcludedDomainsChange(oldValue, newValue, context);

      case 'restoreMode':
        return this.handleRestoreModeChange(oldValue, newValue);

      case 'navigatorEnabled':
        return this.handleNavigatorChange(oldValue, newValue);

      default:
        return {
          action: 'update-setting',
          message: '설정이 업데이트되었습니다',
          shouldNotify: false,
        };
    }
  }

  /**
   * 자동 그룹화 설정 변경 처리
   * @param {boolean} oldValue 이전 값
   * @param {boolean} newValue 새로운 값
   * @param {Object} context 컨텍스트
   * @returns {Object} 처리 방안
   */
  static handleAutoGroupingChange(oldValue, newValue, context) {
    if (newValue && !oldValue) {
      // 자동 그룹화 활성화
      return {
        action: 'group-existing-tabs',
        message: '자동 그룹화가 활성화되었습니다. 기존 탭들을 그룹화합니다.',
        shouldNotify: true,
        applyToExistingTabs: context.hasExistingTabs || false,
      };
    } else if (!newValue && oldValue) {
      // 자동 그룹화 비활성화
      return {
        action: 'ungroup-all-tabs',
        message: '자동 그룹화가 비활성화되었습니다. 모든 탭 그룹이 해제됩니다.',
        shouldNotify: true,
        confirmRequired: true,
        severity: 'high',
      };
    }

    return {
      action: 'update-setting',
      message: '자동 그룹화 설정이 업데이트되었습니다',
    };
  }

  /**
   * 제외 도메인 설정 변경 처리
   * @param {Array} oldValue 이전 값
   * @param {Array} newValue 새로운 값
   * @param {Object} context 컨텍스트
   * @returns {Object} 처리 방안
   */
  static handleExcludedDomainsChange(oldValue, newValue, context) {
    const oldSet = new Set(oldValue || []);
    const newSet = new Set(newValue || []);

    const added = [...newSet].filter((domain) => !oldSet.has(domain));
    const removed = [...oldSet].filter((domain) => !newSet.has(domain));

    if (added.length > 0) {
      // 도메인 추가 - 해당 도메인 탭들 그룹 해제
      return {
        action: 'ungroup-excluded-domains',
        message: `${added.join(', ')} 도메인의 탭들이 그룹에서 해제됩니다.`,
        shouldNotify: true,
        affectedDomains: added,
        affectedTabIds: context.affectedTabs?.map((tab) => tab.id) || [],
      };
    } else if (removed.length > 0) {
      // 도메인 제거 - 해당 도메인 탭들 그룹화
      return {
        action: 'group-newly-included-domains',
        message: `${removed.join(', ')} 도메인의 탭들이 그룹화됩니다.`,
        shouldNotify: true,
        affectedDomains: removed,
        affectedTabIds: context.affectedTabs?.map((tab) => tab.id) || [],
      };
    }

    return {
      action: 'update-setting',
      message: '제외 도메인 설정이 업데이트되었습니다',
    };
  }

  /**
   * 세션 복원 모드 변경 처리
   * @param {string} oldValue 이전 값
   * @param {string} newValue 새로운 값
   * @returns {Object} 처리 방안
   */
  static handleRestoreModeChange(oldValue, newValue) {
    return {
      action: 'update-setting',
      message: `세션 복원 모드가 ${newValue}로 변경되었습니다. 다음 브라우저 시작부터 적용됩니다.`,
      shouldNotify: true,
      applyTiming: 'next-startup',
    };
  }

  /**
   * 네비게이터 설정 변경 처리
   * @param {boolean} oldValue 이전 값
   * @param {boolean} newValue 새로운 값
   * @returns {Object} 처리 방안
   */
  static handleNavigatorChange(oldValue, newValue) {
    if (newValue && !oldValue) {
      return {
        action: 'enable-navigator',
        message: '탭 네비게이터가 활성화되었습니다.',
        shouldNotify: true,
      };
    } else if (!newValue && oldValue) {
      return {
        action: 'disable-navigator',
        message: '탭 네비게이터가 비활성화되었습니다.',
        shouldNotify: true,
      };
    }

    return {
      action: 'update-setting',
      message: '네비게이터 설정이 업데이트되었습니다',
    };
  }

  /**
   * 설정 충돌 해결 정책
   * @param {Array} conflicts 충돌 목록
   * @param {Object} sourcePriorities 소스 우선순위
   * @param {Array} mergeableKeys 병합 가능한 키들
   * @returns {Object} 해결 결과
   */
  static resolveSettingConflicts(
    conflicts,
    sourcePriorities = {},
    mergeableKeys = []
  ) {
    if (conflicts.length === 0) {
      return { resolvedValue: null, resolution: 'no-conflicts' };
    }

    if (conflicts.length === 1) {
      return {
        resolvedValue: conflicts[0].value,
        winningSource: conflicts[0].source,
        resolution: 'single-value',
      };
    }

    const key = conflicts[0].key;

    // 병합 가능한 키인 경우
    if (mergeableKeys.includes(key) && Array.isArray(conflicts[0].value)) {
      const mergedValue = [...new Set(conflicts.flatMap((c) => c.value))];
      return {
        resolvedValue: mergedValue,
        resolution: 'merged',
        sources: conflicts.map((c) => c.source),
      };
    }

    // 소스 우선순위가 있는 경우
    if (Object.keys(sourcePriorities).length > 0) {
      const sortedByPriority = conflicts.sort((a, b) => {
        const priorityA = sourcePriorities[a.source] || 999;
        const priorityB = sourcePriorities[b.source] || 999;
        return priorityA - priorityB;
      });

      return {
        resolvedValue: sortedByPriority[0].value,
        winningSource: sortedByPriority[0].source,
        resolution: 'source-priority',
      };
    }

    // 기본값: 최신 타임스탬프 우선
    const latest = conflicts.reduce((prev, current) =>
      current.timestamp > prev.timestamp ? current : prev
    );

    return {
      resolvedValue: latest.value,
      winningSource: latest.source,
      resolution: 'latest-timestamp',
    };
  }

  /**
   * 설정 유효성 검증 정책
   * @param {string} key 설정 키
   * @param {*} value 설정 값
   * @returns {Object} 검증 결과
   */
  static validateSetting(key, value) {
    const schema = this.SETTING_SCHEMAS[key];
    if (!schema) {
      return {
        isValid: false,
        errors: [`알 수 없는 설정 키: ${key}`],
      };
    }

    const errors = [];

    switch (schema.type) {
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${key}은 boolean 값이어야 합니다`);
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${key}은 string 값이어야 합니다`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${key}은 배열이어야 합니다`);
        } else if (schema.itemType) {
          value.forEach((item, index) => {
            if (schema.itemType === 'string' && typeof item !== 'string') {
              errors.push(`${key}[${index}]은 문자열이어야 합니다`);
            } else if (key === 'excludedDomains' && !this.isValidDomain(item)) {
              errors.push(`${item}은 유효한 도메인이 아닙니다`);
            }
          });
        }
        break;

      case 'enum':
        if (!schema.values.includes(value)) {
          errors.push(`${key}는 ${schema.values.join(' 또는 ')}이어야 합니다`);
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 도메인 유효성 검사
   * @param {string} domain 도메인
   * @returns {boolean} 유효성 여부
   */
  static isValidDomain(domain) {
    if (typeof domain !== 'string') return false;

    // 특수 케이스 허용
    const specialCases = ['localhost', 'chrome://', 'about:', 'file://'];
    if (specialCases.some((special) => domain.startsWith(special))) {
      return true;
    }

    // 기본적인 도메인 패턴 검사 (점이 있어야 함)
    const domainPattern =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    return domainPattern.test(domain);
  }

  /**
   * 설정 마이그레이션 정책
   * @param {Object} oldSettings 구버전 설정
   * @returns {Object} 신버전 설정
   */
  static migrateSettings(oldSettings) {
    if (!oldSettings || typeof oldSettings !== 'object') {
      return this.getDefaultSettings();
    }

    // 이미 최신 버전인 경우
    if (oldSettings.version === this.CURRENT_VERSION) {
      return oldSettings;
    }

    const migrated = { ...oldSettings };

    // 버전별 마이그레이션
    if (!oldSettings.version || oldSettings.version === '1.0') {
      // v1.0 -> v2.0 마이그레이션
      if ('enableAutoGrouping' in migrated) {
        migrated.autoGrouping = migrated.enableAutoGrouping;
        delete migrated.enableAutoGrouping;
      }

      if ('domainBlacklist' in migrated) {
        migrated.excludedDomains = migrated.domainBlacklist;
        delete migrated.domainBlacklist;
      }
    }

    // 버전 업데이트
    migrated.version = this.CURRENT_VERSION;

    // 기본값 보완
    const defaults = this.getDefaultSettings();
    Object.keys(defaults).forEach((key) => {
      if (!(key in migrated)) {
        migrated[key] = defaults[key];
      }
    });

    return migrated;
  }

  /**
   * 기본 설정 반환
   * @returns {Object} 기본 설정
   */
  static getDefaultSettings() {
    const defaults = { version: this.CURRENT_VERSION };

    Object.entries(this.SETTING_SCHEMAS).forEach(([key, schema]) => {
      defaults[key] = schema.default;
    });

    return defaults;
  }

  /**
   * 백업 필요 여부 결정 정책
   * @param {string} key 설정 키
   * @param {*} currentValue 현재 값
   * @param {*} newValue 새로운 값
   * @returns {Object} 백업 여부
   */
  static shouldBackupBeforeChange(key, currentValue, newValue) {
    // 중요한 설정인 경우 백업
    if (this.CRITICAL_SETTINGS.includes(key)) {
      return {
        shouldBackup: true,
        reason: '중요한 설정 변경으로 인한 백업',
      };
    }

    // 배열 설정에서 많은 항목이 변경되는 경우
    if (Array.isArray(currentValue) && Array.isArray(newValue)) {
      const changeRatio =
        Math.abs(currentValue.length - newValue.length) /
        Math.max(currentValue.length, 1);
      if (changeRatio > 0.5) {
        return {
          shouldBackup: true,
          reason: '대량 변경으로 인한 백업',
        };
      }
    }

    return {
      shouldBackup: false,
      reason: '백업이 필요하지 않은 변경',
    };
  }

  /**
   * 백업 데이터 유효성 검증
   * @param {Object} backupData 백업 데이터
   * @returns {Object} 검증 결과
   */
  static validateBackupData(backupData) {
    if (!backupData || typeof backupData !== 'object') {
      return {
        isValid: false,
        canRestore: false,
        errors: ['백업 데이터가 유효하지 않습니다'],
      };
    }

    const errors = [];

    // 각 설정 검증
    Object.entries(backupData).forEach(([key, value]) => {
      if (key === 'version' || key === 'timestamp') return;

      const validation = this.validateSetting(key, value);
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
    });

    return {
      isValid: errors.length === 0,
      canRestore: errors.length === 0,
      errors,
    };
  }

  /**
   * 설정 변경 영향 분석 정책
   * @param {Object} change 변경 정보
   * @param {Object} context 컨텍스트
   * @returns {Object} 영향 분석 결과
   */
  static analyzeSettingImpact(change, context) {
    const { key, from, to } = change;

    switch (key) {
      case 'autoGrouping':
        if (from === true && to === false) {
          return {
            severity: 'high',
            affectedFeatures: ['automatic-tab-grouping'],
            affectedTabCount: context.groupedTabCount || 0,
            reversible: true,
            requiresConfirmation: true,
            description: '모든 탭 그룹이 해제됩니다',
          };
        }
        return {
          severity: 'medium',
          affectedFeatures: ['automatic-tab-grouping'],
          affectedTabCount: context.currentTabCount || 0,
          reversible: true,
        };

      case 'excludedDomains':
        const oldSet = new Set(from || []);
        const newSet = new Set(to || []);
        const added = [...newSet].filter((domain) => !oldSet.has(domain));
        const removed = [...oldSet].filter((domain) => !newSet.has(domain));

        return {
          severity: 'medium',
          affectedFeatures: ['domain-filtering'],
          affectedTabCount: context.affectedTabs?.length || 0,
          affectedDomains: [...added, ...removed],
          reversible: true,
          description: `${
            added.length + removed.length
          }개 도메인의 그룹화 설정이 변경됩니다`,
        };

      default:
        return {
          severity: 'low',
          affectedFeatures: [],
          affectedTabCount: 0,
          reversible: true,
          requiresConfirmation: false,
        };
    }
  }
}

export default SettingsService;
