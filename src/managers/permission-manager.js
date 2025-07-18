/**
 * 권한 관리자 - 순수 실행 기능만 담당 (정책 없음)
 * 정책 결정은 PermissionService에서 수행
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
class PermissionManager {
  // 파일 URL 권한 상수
  static FILE_URL_PERMISSION = { origins: ['file:///*'] };

  /**
   * 파일 URL 접근 권한 확인
   * @returns {Promise<boolean>} 권한 보유 여부
   */
  static async checkFileUrlPermission() {
    try {
      return await chrome.permissions.contains(this.FILE_URL_PERMISSION);
    } catch (error) {
      console.error('파일 URL 권한 확인 실패:', error);
      return false;
    }
  }

  /**
   * 권한 요청 (순수 기능)
   * @param {string} permissionType 권한 타입
   * @param {Object} explanation 설명 메시지 (선택적)
   * @returns {Promise<boolean>} 권한 허용 여부
   */
  static async requestPermission(permissionType, explanation = null) {
    try {
      if (explanation && explanation.showManualSteps) {
        // 수동 설정 가이드 표시
        await this.showPermissionGuide();
        return false; // 수동 설정이므로 false 반환
      }

      if (permissionType === 'file-url') {
        return await chrome.permissions.request(this.FILE_URL_PERMISSION);
      }

      console.warn(`지원하지 않는 권한 타입: ${permissionType}`);
      return false;
    } catch (error) {
      console.error('권한 요청 실패:', error);
      throw error;
    }
  }

  /**
   * 파일 URL 접근 권한 요청 (기존 호환성 유지)
   * @returns {Promise<boolean>} 권한 허용 여부
   */
  static async requestFileUrlPermission() {
    return await this.requestPermission('file-url');
  }

  /**
   * 크롬 확장 관리 페이지로 안내
   */
  static async showPermissionGuide() {
    try {
      await chrome.tabs.create({
        url: 'chrome://extensions/',
        active: true,
      });
    } catch (error) {
      console.error('확장 관리 페이지 열기 실패:', error);
    }
  }

  /**
   * 기능 활성화 (순수 기능)
   * @param {string} permissionType 권한 타입
   */
  static async enableFeature(permissionType) {
    try {
      if (permissionType === 'file-url') {
        console.log('로컬 파일 그룹화 기능이 활성화되었습니다');
        // 실제로는 설정 업데이트나 상태 변경 수행
      }
    } catch (error) {
      console.error('기능 활성화 실패:', error);
      throw error;
    }
  }

  /**
   * 기능 비활성화 (순수 기능)
   * @param {string} permissionType 권한 타입
   */
  static async disableFeature(permissionType) {
    try {
      if (permissionType === 'file-url') {
        console.log('로컬 파일 그룹화 기능이 비활성화되었습니다');
        // 실제로는 설정 업데이트나 상태 변경 수행
      }
    } catch (error) {
      console.error('기능 비활성화 실패:', error);
      throw error;
    }
  }

  /**
   * 파일 탭 그룹 해제 (순수 기능)
   */
  static async ungroupFileTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const fileTabs = tabs.filter((tab) => tab.url.startsWith('file://'));

      for (const tab of fileTabs) {
        if (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          await chrome.tabs.ungroup([tab.id]);
        }
      }

      console.log(`${fileTabs.length}개의 파일 탭 그룹 해제 완료`);
    } catch (error) {
      console.error('파일 탭 그룹 해제 실패:', error);
      throw error;
    }
  }

  /**
   * 알림 표시 (순수 기능)
   * @param {string} message 알림 메시지
   */
  static async showNotification(message) {
    try {
      // 실제로는 브라우저 알림이나 UI 알림 표시
      console.log('권한 알림:', message);
    } catch (error) {
      console.error('알림 표시 실패:', error);
      throw error;
    }
  }

  /**
   * 권한 상태 정보 조회
   * @returns {Promise<Object>} 권한 상태 정보
   */
  static async getPermissionStatus() {
    const hasFileUrlPermission = await this.checkFileUrlPermission();

    return {
      hasFileUrlPermission,
      canRequestPermission: true,
      message: hasFileUrlPermission
        ? '파일 URL 접근 권한이 허용되어 있습니다.'
        : '로컬 파일 그룹화를 위해 파일 URL 접근 권한이 필요합니다.',
    };
  }

  /**
   * 권한 변경 이벤트 리스너 초기화 (순수 기능)
   * @param {Function} onAddedCallback 권한 추가 시 콜백
   * @param {Function} onRemovedCallback 권한 제거 시 콜백
   */
  static initializePermissionListeners(onAddedCallback, onRemovedCallback) {
    if (onAddedCallback) {
      chrome.permissions.onAdded.addListener(onAddedCallback);
    }

    if (onRemovedCallback) {
      chrome.permissions.onRemoved.addListener(onRemovedCallback);
    }
  }

  /**
   * 권한 변경 메시지 전송 (순수 기능)
   * @param {string} action 'added' 또는 'removed'
   * @param {Object} permissions 변경된 권한 정보
   * @param {string} message 메시지
   */
  static async sendPermissionChangeMessage(action, permissions, message) {
    try {
      await chrome.runtime.sendMessage({
        type: 'PERMISSION_CHANGED',
        action,
        permissions,
        message,
      });
      console.log('권한 변경 메시지 전송 완료');
    } catch (error) {
      console.error('권한 변경 메시지 전송 실패:', error);
      throw error;
    }
  }
}

export default PermissionManager;
