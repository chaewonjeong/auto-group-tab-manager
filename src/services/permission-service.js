/**
 * 권한 서비스 - 권한 관리 정책 담당
 * 정책 결정만 수행하고, 실제 실행은 PermissionManager에게 위임
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
class PermissionService {
  /**
   * 권한 요청 시점 결정 정책
   * @param {string} permissionType 권한 타입
   * @param {Object} context 컨텍스트 정보
   * @param {Object} settings 설정
   * @returns {Object} 요청 여부 결정
   */
  static shouldRequestPermission(permissionType, context, settings) {
    // 지원하지 않는 권한 타입
    if (permissionType !== 'file-url') {
      return {
        shouldRequest: false,
        reason: '지원하지 않는 권한 타입입니다',
      };
    }

    // 이미 권한이 있는 경우
    if (context.hasPermission) {
      return {
        shouldRequest: false,
        reason: '이미 권한을 보유하고 있습니다',
      };
    }

    // 수동 요청인 경우 항상 허용
    if (context.trigger === 'manual-request') {
      return {
        shouldRequest: true,
        reason: '사용자가 수동으로 요청했습니다',
      };
    }

    // 자동 권한 요청이 비활성화된 경우
    if (!settings.autoRequestPermissions) {
      return {
        shouldRequest: false,
        reason: '자동 권한 요청이 비활성화되어 있습니다',
      };
    }

    // 로컬 파일 감지 시 권한 요청
    if (context.trigger === 'file-url-detected') {
      return {
        shouldRequest: true,
        reason: '로컬 파일 접근을 위해 권한이 필요합니다',
      };
    }

    return {
      shouldRequest: false,
      reason: '권한 요청 조건을 만족하지 않습니다',
    };
  }

  /**
   * 권한 거부 시 대응 정책
   * @param {Object} context 거부 컨텍스트
   * @param {Object} settings 설정
   * @returns {Object} 대응 방안
   */
  static handlePermissionDenied(context, settings) {
    const { permissionType, deniedBy, attemptCount } = context;
    const maxRetryAttempts = settings.maxRetryAttempts || 3;

    // 최대 재시도 횟수 초과
    if (attemptCount >= maxRetryAttempts) {
      return {
        action: 'disable-feature',
        allowRetry: false,
        message: `권한 요청을 ${maxRetryAttempts}번 거부하셨습니다. 더 이상 요청하지 않습니다.`,
        showNotification: true,
      };
    }

    // 시스템에 의한 거부 (브라우저 정책 등)
    if (deniedBy === 'system') {
      return {
        action: 'show-guide',
        allowRetry: true,
        message:
          '브라우저 정책으로 인해 권한을 자동으로 허용할 수 없습니다. 수동으로 설정해주세요.',
        showNotification: true,
        showManualGuide: true,
      };
    }

    // 사용자에 의한 거부
    const result = {
      action: settings.fallbackToWebOnly
        ? 'fallback-to-web-only'
        : 'disable-feature',
      allowRetry: true,
      showNotification: true,
    };

    if (permissionType === 'file-url') {
      result.message = settings.fallbackToWebOnly
        ? '로컬 파일 그룹화 기능이 비활성화되었습니다. 웹 URL만 처리됩니다.'
        : '파일 접근 권한이 거부되어 로컬 파일 그룹화를 사용할 수 없습니다.';
    }

    // 권한 거부 기록 저장
    if (settings.trackDenials) {
      result.shouldRecord = true;
      result.recordData = {
        permissionType,
        deniedAt: Date.now(),
        deniedBy,
        attemptCount,
      };
    }

    return result;
  }

  /**
   * 권한 상태 변경 시 적용 정책
   * @param {string} permissionType 권한 타입
   * @param {boolean} granted 권한 허용 여부
   * @param {Object} settings 설정
   * @returns {Object} 적용 방안
   */
  static applyPermissionChange(permissionType, granted, settings) {
    const result = {
      action: null,
      message: '',
      shouldNotify: settings.showPermissionNotifications !== false,
      shouldUngroupFileTabs: false,
    };

    if (permissionType === 'file-url') {
      if (granted) {
        if (settings.enableOnPermissionGrant !== false) {
          result.action = 'enable-feature';
          result.message =
            '파일 URL 접근 권한이 허용되었습니다. 로컬 파일 그룹화가 활성화됩니다.';
        }
      } else {
        if (settings.disableOnPermissionRevoke !== false) {
          result.action = 'disable-feature';
          result.message =
            '파일 URL 접근 권한이 제거되었습니다. 로컬 파일 그룹화가 비활성화됩니다.';

          // 기존 파일 탭 그룹 해제
          if (settings.ungroupFileTabsOnRevoke) {
            result.shouldUngroupFileTabs = true;
          }
        }
      }
    }

    return result;
  }

  /**
   * 권한 요청 전략 결정 정책
   * @param {string} permissionType 권한 타입
   * @param {Array} requestHistory 요청 기록
   * @param {Object} settings 설정
   * @returns {Object} 요청 전략
   */
  static determineRequestStrategy(permissionType, requestHistory, settings) {
    const maxRetryAttempts = settings.maxRetryAttempts || 3;
    const deniedCount = requestHistory.filter(
      (req) => req.result === 'denied'
    ).length;

    // 최대 재시도 횟수 초과
    if (deniedCount >= maxRetryAttempts) {
      return {
        strategy: 'give-up',
        reason: '최대 재시도 횟수를 초과했습니다',
        delayMs: 0,
      };
    }

    // 점진적 권한 요청 전략
    if (settings.useProgressiveStrategy && deniedCount > 0) {
      const delayMs = Math.min(deniedCount * 5000, 30000); // 최대 30초
      return {
        strategy: 'delayed',
        delayMs,
        showExplanation: true,
        reason: '이전 거부로 인해 지연된 요청',
      };
    }

    // 즉시 요청 전략
    return {
      strategy: 'immediate',
      delayMs: 0,
      showExplanation: requestHistory.length === 0,
    };
  }

  /**
   * 권한 설명 메시지 생성 정책
   * @param {Object} context 컨텍스트
   * @returns {Object} 설명 메시지
   */
  static generatePermissionExplanation(context) {
    const { permissionType, isFirstRequest, previousDenialCount, trigger } =
      context;

    if (permissionType === 'file-url') {
      if (trigger === 'manual-guide-request') {
        return {
          title: '파일 접근 권한 수동 설정',
          message: '다음 단계를 따라 수동으로 권한을 설정할 수 있습니다.',
          showManualSteps: true,
          manualSteps: [
            'chrome://extensions/ 페이지로 이동',
            'Tab Group Manager 확장 프로그램 찾기',
            '세부정보 클릭 후 "파일 URL에 대한 액세스 허용" 체크',
          ],
        };
      }

      if (isFirstRequest) {
        return {
          title: '파일 접근 권한 필요',
          message: '로컬 파일을 그룹화하기 위해 파일 접근 권한이 필요합니다.',
          showBenefits: true,
          benefits: [
            '로컬 HTML 파일을 디렉토리별로 그룹화',
            '프로젝트 파일들을 체계적으로 관리',
            '개발 작업 효율성 향상',
          ],
        };
      }

      return {
        title: '파일 접근 권한 재요청',
        message: `이전에 거부하셨지만 (${previousDenialCount}회), 로컬 파일 그룹화 기능을 사용하시려면 권한이 필요합니다.`,
        showAlternatives: true,
        alternatives: [
          '웹 URL만 사용하여 그룹화',
          '수동으로 브라우저 설정에서 권한 허용',
        ],
      };
    }

    return {
      title: '권한 필요',
      message: '기능을 사용하기 위해 권한이 필요합니다.',
    };
  }

  /**
   * 권한 요청 기록 저장 여부 결정
   * @param {Object} requestData 요청 데이터
   * @returns {Object} 기록 여부
   */
  static shouldRecordPermissionRequest(requestData) {
    return {
      shouldRecord: true,
      recordKey: 'permission-requests',
      data: this.sanitizeRecordData(requestData),
    };
  }

  /**
   * 권한 상태 변경 기록 저장 여부 결정
   * @param {Object} changeData 변경 데이터
   * @returns {Object} 기록 여부
   */
  static shouldRecordPermissionChange(changeData) {
    return {
      shouldRecord: true,
      recordKey: 'permission-changes',
      data: this.sanitizeRecordData(changeData),
    };
  }

  /**
   * 개인정보 보호를 위한 데이터 정제
   * @param {Object} data 원본 데이터
   * @returns {Object} 정제된 데이터
   */
  static sanitizeRecordData(data) {
    const sanitized = { ...data };

    // 민감한 정보 제거
    delete sanitized.url;
    delete sanitized.filePath;
    delete sanitized.userAgent;

    return sanitized;
  }

  /**
   * 권한 요청 처리 (정책 + 실행 조합)
   * @param {string} permissionType 권한 타입
   * @param {Object} context 컨텍스트
   * @param {Object} PermissionManager PermissionManager 인스턴스
   */
  static async handlePermissionRequest(
    permissionType,
    context,
    PermissionManager
  ) {
    try {
      // 1. 정책 결정 - 요청 여부 확인
      const settings = { autoRequestPermissions: true }; // 실제로는 StorageUtils에서 로드
      const shouldRequest = this.shouldRequestPermission(
        permissionType,
        context,
        settings
      );

      if (!shouldRequest.shouldRequest) {
        console.log(
          '권한 요청 정책에 따라 요청하지 않음:',
          shouldRequest.reason
        );
        return { success: false, reason: shouldRequest.reason };
      }

      // 2. 요청 전략 결정
      const requestHistory = []; // 실제로는 저장소에서 로드
      const strategy = this.determineRequestStrategy(
        permissionType,
        requestHistory,
        settings
      );

      if (strategy.strategy === 'give-up') {
        console.log('권한 요청 포기:', strategy.reason);
        return { success: false, reason: strategy.reason };
      }

      // 3. 지연 처리
      if (strategy.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, strategy.delayMs));
      }

      // 4. 설명 메시지 생성
      const explanation = this.generatePermissionExplanation({
        permissionType,
        isFirstRequest: requestHistory.length === 0,
        previousDenialCount: requestHistory.filter((r) => r.result === 'denied')
          .length,
        trigger: context.trigger,
      });

      // 5. 실행 (Manager에게 위임)
      const granted = await PermissionManager.requestPermission(
        permissionType,
        explanation
      );

      // 6. 결과 기록
      const recordDecision = this.shouldRecordPermissionRequest({
        permissionType,
        trigger: context.trigger,
        result: granted ? 'granted' : 'denied',
        timestamp: Date.now(),
      });

      if (recordDecision.shouldRecord) {
        // 실제로는 StorageUtils에 저장
        console.log('권한 요청 기록 저장:', recordDecision.data);
      }

      // 7. 거부 시 대응
      if (!granted) {
        const denialResponse = this.handlePermissionDenied(
          {
            permissionType,
            deniedBy: 'user',
            attemptCount:
              requestHistory.filter((r) => r.result === 'denied').length + 1,
          },
          settings
        );

        return { success: false, denialResponse };
      }

      return { success: true, granted };
    } catch (error) {
      console.error('권한 요청 처리 실패:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 권한 상태 변경 처리 (정책 + 실행 조합)
   * @param {string} permissionType 권한 타입
   * @param {boolean} granted 권한 허용 여부
   * @param {Object} PermissionManager PermissionManager 인스턴스
   */
  static async handlePermissionChange(
    permissionType,
    granted,
    PermissionManager
  ) {
    try {
      // 1. 정책 결정
      const settings = {
        enableOnPermissionGrant: true,
        disableOnPermissionRevoke: true,
        ungroupFileTabsOnRevoke: true,
        showPermissionNotifications: true,
      }; // 실제로는 StorageUtils에서 로드

      const changePolicy = this.applyPermissionChange(
        permissionType,
        granted,
        settings
      );

      // 2. 변경 기록
      const recordDecision = this.shouldRecordPermissionChange({
        permissionType,
        from: !granted,
        to: granted,
        timestamp: Date.now(),
      });

      if (recordDecision.shouldRecord) {
        // 실제로는 StorageUtils에 저장
        console.log('권한 변경 기록 저장:', recordDecision.data);
      }

      // 3. 실행 (Manager에게 위임)
      if (changePolicy.action === 'enable-feature') {
        await PermissionManager.enableFeature(permissionType);
      } else if (changePolicy.action === 'disable-feature') {
        await PermissionManager.disableFeature(permissionType);

        if (changePolicy.shouldUngroupFileTabs) {
          await PermissionManager.ungroupFileTabs();
        }
      }

      // 4. 알림 표시
      if (changePolicy.shouldNotify) {
        await PermissionManager.showNotification(changePolicy.message);
      }

      console.log(`권한 변경 처리 완료: ${permissionType} = ${granted}`);
      return { success: true, changePolicy };
    } catch (error) {
      console.error('권한 변경 처리 실패:', error);
      return { success: false, error: error.message };
    }
  }
}

export default PermissionService;
