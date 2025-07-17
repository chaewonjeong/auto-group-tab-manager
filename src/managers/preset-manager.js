import StorageUtils from '../utils/storage-utils.js';

/**
 * 프리셋 관리자 - 탭 그룹 프리셋 저장 및 복원
 * Requirements: 2.2, 2.3, 2.4, 2.5, 9.1, 9.2, 9.3, 9.4
 */
class PresetManager {
  /**
   * 현재 탭 상태를 프리셋으로 저장
   * @param {string} name 프리셋 이름
   * @returns {Promise<boolean>} 저장 성공 여부
   */
  static async saveCurrentAsPreset(name) {
    try {
      const tabs = await chrome.tabs.query({});
      const groups = await chrome.tabGroups.query({});

      const presetData = {
        tabs,
        groups,
      };

      const success = await StorageUtils.savePreset(name, presetData);
      if (success) {
        console.log(`프리셋 저장 완료: ${name}`);
      }
      return success;
    } catch (error) {
      console.error('프리셋 저장 실패:', error);
      return false;
    }
  }

  /**
   * 프리셋 로드
   * @param {string} name 프리셋 이름
   * @returns {Promise<Object|null>} 프리셋 데이터 또는 null
   */
  static async loadPreset(name) {
    try {
      return await StorageUtils.loadPreset(name);
    } catch (error) {
      console.error('프리셋 로드 실패:', error);
      return null;
    }
  }

  /**
   * 프리셋을 새 윈도우에서 복원
   * @param {string} name 프리셋 이름
   * @returns {Promise<boolean>} 복원 성공 여부
   */
  static async restorePreset(name) {
    try {
      const preset = await this.loadPreset(name);
      if (!preset) {
        console.log(`프리셋을 찾을 수 없습니다: ${name}`);
        return false;
      }

      // 새 윈도우 생성
      const window = await chrome.windows.create({});

      // 프리셋 복원
      await this.restoreTabsAndGroups(preset, window.id);

      console.log(`프리셋 복원 완료: ${name}`);
      return true;
    } catch (error) {
      console.error('프리셋 복원 실패:', error);
      return false;
    }
  }

  /**
   * 탭과 그룹 복원 (세션 관리자와 공통 로직)
   * @param {Object} data 복원할 데이터
   * @param {number} windowId 대상 윈도우 ID
   */
  static async restoreTabsAndGroups(data, windowId) {
    const { tabs, groups } = data;

    // 그룹 생성
    const groupIdMap = new Map();
    for (const group of groups || []) {
      const newGroup = await chrome.tabGroups.create({
        windowId,
      });
      await chrome.tabGroups.update(newGroup.id, {
        title: group.title,
        color: group.color,
        collapsed: group.collapsed,
      });
      groupIdMap.set(group.id, newGroup.id);
    }

    // 탭 생성
    for (const tab of tabs || []) {
      const newTab = await chrome.tabs.create({
        url: tab.url,
        pinned: tab.pinned,
        windowId,
      });

      // 그룹에 할당
      if (tab.groupId && groupIdMap.has(tab.groupId)) {
        await chrome.tabs.group({
          tabIds: [newTab.id],
          groupId: groupIdMap.get(tab.groupId),
        });
      }
    }
  }

  /**
   * 모든 프리셋 목록 조회
   * @returns {Promise<Object>} 프리셋 목록
   */
  static async getAllPresets() {
    try {
      return await StorageUtils.loadPresets();
    } catch (error) {
      console.error('프리셋 목록 조회 실패:', error);
      return {};
    }
  }

  /**
   * 프리셋 삭제
   * @param {string} name 프리셋 이름
   * @returns {Promise<boolean>} 삭제 성공 여부
   */
  static async deletePreset(name) {
    try {
      const success = await StorageUtils.deletePreset(name);
      if (success) {
        console.log(`프리셋 삭제 완료: ${name}`);
      }
      return success;
    } catch (error) {
      console.error('프리셋 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 프리셋 데이터 유효성 검증
   * @param {Object} presetData 프리셋 데이터
   * @returns {boolean} 유효성 여부
   */
  static validatePresetData(presetData) {
    if (!presetData || typeof presetData !== 'object') {
      return false;
    }

    // 필수 필드 확인
    if (
      !presetData.name ||
      typeof presetData.name !== 'string' ||
      presetData.name.trim() === ''
    ) {
      return false;
    }

    if (!Array.isArray(presetData.tabs) || !Array.isArray(presetData.groups)) {
      return false;
    }

    // 탭 데이터 검증
    for (const tab of presetData.tabs) {
      if (!tab.url || typeof tab.url !== 'string') {
        return false;
      }
    }

    // 그룹 데이터 검증
    for (const group of presetData.groups) {
      if (!group.title || typeof group.title !== 'string') {
        return false;
      }
    }

    return true;
  }

  /**
   * 프리셋 정보 조회
   * @param {string} name 프리셋 이름
   * @returns {Promise<Object>} 프리셋 정보
   */
  static async getPresetInfo(name) {
    try {
      const preset = await this.loadPreset(name);

      if (!preset) {
        return {
          name,
          tabCount: 0,
          groupCount: 0,
          createdAt: null,
          updatedAt: null,
          exists: false,
        };
      }

      return {
        name: preset.name,
        tabCount: preset.tabs?.length || 0,
        groupCount: preset.groups?.length || 0,
        createdAt: preset.createdAt || null,
        updatedAt: preset.updatedAt || null,
        exists: true,
      };
    } catch (error) {
      console.error('프리셋 정보 조회 실패:', error);
      return {
        name,
        tabCount: 0,
        groupCount: 0,
        createdAt: null,
        updatedAt: null,
        exists: false,
      };
    }
  }

  /**
   * 프리셋 이름 중복 확인
   * @param {string} name 프리셋 이름
   * @returns {Promise<boolean>} 중복 여부
   */
  static async isPresetNameExists(name) {
    try {
      const preset = await this.loadPreset(name);
      return preset !== null;
    } catch (error) {
      console.error('프리셋 이름 중복 확인 실패:', error);
      return false;
    }
  }

  /**
   * 프리셋 업데이트
   * @param {string} name 프리셋 이름
   * @param {Object} newData 새로운 프리셋 데이터
   * @returns {Promise<boolean>} 업데이트 성공 여부
   */
  static async updatePreset(name, newData) {
    try {
      if (!this.validatePresetData({ name, ...newData })) {
        console.error('유효하지 않은 프리셋 데이터');
        return false;
      }

      const success = await StorageUtils.savePreset(name, newData);
      if (success) {
        console.log(`프리셋 업데이트 완료: ${name}`);
      }
      return success;
    } catch (error) {
      console.error('프리셋 업데이트 실패:', error);
      return false;
    }
  }
}

export default PresetManager;
