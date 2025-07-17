/**
 * 권한 관리자 - 파일 URL 접근 권한 관리
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
   * 파일 URL 접근 권한 요청
   * @returns {Promise<boolean>} 권한 허용 여부
   */
  static async requestFileUrlPermission() {
    try {
      return await chrome.permissions.request(this.FILE_URL_PERMISSION);
    } catch (error) {
      console.error('파일 URL 권한 요청 실패:', error);
      return false;
    }
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
   * 권한 거부 시 처리
   * @returns {string} 사용자에게 표시할 메시지
   */
  static handlePermissionDenied() {
    return '로컬 파일 그룹화 기능이 비활성화되었습니다. 웹 URL만 처리됩니다.';
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
   * 권한 변경 이벤트 리스너 초기화
   */
  static initializePermissionListeners() {
    chrome.permissions.onAdded.addListener((permissions) => {
      this.notifyPermissionChange('added', permissions);
    });

    chrome.permissions.onRemoved.addListener((permissions) => {
      this.notifyPermissionChange('removed', permissions);
    });
  }

  /**
   * 권한 변경 알림
   * @param {string} action 'added' 또는 'removed'
   * @param {Object} permissions 변경된 권한 정보
   */
  static async notifyPermissionChange(action, permissions) {
    const message =
      action === 'added'
        ? '파일 URL 접근 권한이 허용되었습니다. 로컬 파일 그룹화가 활성화됩니다.'
        : '파일 URL 접근 권한이 제거되었습니다. 로컬 파일 그룹화가 비활성화됩니다.';

    try {
      await chrome.runtime.sendMessage({
        type: 'PERMISSION_CHANGED',
        action,
        permissions,
        message,
      });
    } catch (error) {
      console.error('권한 변경 알림 실패:', error);
    }
  }
}

export default PermissionManager;
