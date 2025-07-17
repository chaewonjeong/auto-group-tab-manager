/**
 * 스토리지 유틸리티 클래스
 * Chrome Storage API를 위한 헬퍼 함수들을 제공합니다.
 */
class StorageUtils {
  /**
   * 설정 데이터를 저장합니다.
   * @param {Object} settings - 저장할 설정 객체
   * @returns {Promise<boolean>} 저장 성공 여부
   */
  static async saveSettings(settings) {
    try {
      await chrome.storage.local.set({ settings });
      console.log('설정 저장 완료:', settings);
      return true;
    } catch (error) {
      console.error('설정 저장 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * 설정 데이터를 로드합니다.
   * @returns {Promise<Object|null>} 로드된 설정 객체 또는 null
   */
  static async loadSettings() {
    try {
      const data = await chrome.storage.local.get('settings');
      return data.settings || null;
    } catch (error) {
      console.error('설정 로드 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 프리셋 데이터를 저장합니다.
   * @param {string} name - 프리셋 이름
   * @param {Object} presetData - 프리셋 데이터
   * @returns {Promise<boolean>} 저장 성공 여부
   */
  static async savePreset(name, presetData) {
    try {
      const data = await chrome.storage.local.get('presets');
      const presets = data.presets || {};

      presets[name] = {
        name,
        ...presetData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await chrome.storage.local.set({ presets });
      console.log(`프리셋 저장 완료: ${name}`);
      return true;
    } catch (error) {
      console.error('프리셋 저장 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * 모든 프리셋을 로드합니다.
   * @returns {Promise<Object>} 프리셋 객체
   */
  static async loadPresets() {
    try {
      const data = await chrome.storage.local.get('presets');
      return data.presets || {};
    } catch (error) {
      console.error('프리셋 로드 중 오류 발생:', error);
      return {};
    }
  }

  /**
   * 특정 프리셋을 로드합니다.
   * @param {string} name - 프리셋 이름
   * @returns {Promise<Object|null>} 프리셋 데이터 또는 null
   */
  static async loadPreset(name) {
    try {
      const presets = await this.loadPresets();
      return presets[name] || null;
    } catch (error) {
      console.error('프리셋 로드 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 프리셋을 삭제합니다.
   * @param {string} name - 삭제할 프리셋 이름
   * @returns {Promise<boolean>} 삭제 성공 여부
   */
  static async deletePreset(name) {
    try {
      const data = await chrome.storage.local.get('presets');
      const presets = data.presets || {};

      if (presets[name]) {
        delete presets[name];
        await chrome.storage.local.set({ presets });
        console.log(`프리셋 삭제 완료: ${name}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('프리셋 삭제 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * 세션 데이터를 저장합니다.
   * @param {Object} sessionData - 세션 데이터
   * @returns {Promise<boolean>} 저장 성공 여부
   */
  static async saveSession(sessionData) {
    try {
      const session = {
        ...sessionData,
        lastSaved: Date.now(),
      };

      await chrome.storage.local.set({ session });
      console.log('세션 저장 완료');
      return true;
    } catch (error) {
      console.error('세션 저장 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * 세션 데이터를 로드합니다.
   * @returns {Promise<Object|null>} 세션 데이터 또는 null
   */
  static async loadSession() {
    try {
      const data = await chrome.storage.local.get('session');
      return data.session || null;
    } catch (error) {
      console.error('세션 로드 중 오류 발생:', error);
      return null;
    }
  }

  /**
   * 도메인-색상 매핑을 저장합니다.
   * @param {Object} colorMapping - 도메인-색상 매핑 객체
   * @returns {Promise<boolean>} 저장 성공 여부
   */
  static async saveDomainColors(colorMapping) {
    try {
      await chrome.storage.local.set({ domainColors: colorMapping });
      console.log('도메인 색상 매핑 저장 완료');
      return true;
    } catch (error) {
      console.error('도메인 색상 매핑 저장 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * 도메인-색상 매핑을 로드합니다.
   * @returns {Promise<Object>} 도메인-색상 매핑 객체
   */
  static async loadDomainColors() {
    try {
      const data = await chrome.storage.local.get('domainColors');
      return data.domainColors || {};
    } catch (error) {
      console.error('도메인 색상 매핑 로드 중 오류 발생:', error);
      return {};
    }
  }

  /**
   * 모든 저장된 데이터를 삭제합니다.
   * @returns {Promise<boolean>} 삭제 성공 여부
   */
  static async clearAllData() {
    try {
      await chrome.storage.local.clear();
      console.log('모든 저장 데이터 삭제 완료');
      return true;
    } catch (error) {
      console.error('데이터 삭제 중 오류 발생:', error);
      return false;
    }
  }

  /**
   * 저장소 사용량을 확인합니다.
   * @returns {Promise<Object>} 사용량 정보
   */
  static async getStorageUsage() {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      return {
        bytesInUse: usage,
        quota: chrome.storage.local.QUOTA_BYTES,
        percentUsed: (usage / chrome.storage.local.QUOTA_BYTES) * 100,
      };
    } catch (error) {
      console.error('저장소 사용량 확인 중 오류 발생:', error);
      return { bytesInUse: 0, quota: 0, percentUsed: 0 };
    }
  }
}

export default StorageUtils;
