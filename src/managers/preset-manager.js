import StorageUtils from '../utils/storage-utils.js';

/**
 * 프리셋 관리자 - 순수 실행 기능만 담당 (정책 없음)
 * 정책 결정은 PresetService에서 수행
 * Requirements: 2.2, 2.3, 2.4, 2.5, 9.1, 9.2, 9.3, 9.4
 */
class PresetManager {
  /**
   * 프리셋 데이터 저장 (순수 기능)
   * @param {string} name 프리셋 이름
   * @param {Object} presetData 프리셋 데이터
   * @returns {Promise<boolean>} 저장 성공 여부
   */
  static async savePresetData(name, presetData) {
    try {
      const success = await StorageUtils.savePreset(name, presetData);
      if (success) {
        console.log(`프리셋 데이터 저장 완료: ${name}`);
      }
      return success;
    } catch (error) {
      console.error('프리셋 데이터 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 현재 탭 상태를 프리셋으로 저장 (기존 호환성 유지)
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

      return await this.savePresetData(name, presetData);
    } catch (error) {
      console.error('프리셋 저장 실패:', error);
      return false;
    }
  }

  /**
   * 프리셋 데이터 로드 (순수 기능)
   * @param {string} name 프리셋 이름
   * @returns {Promise<Object|null>} 프리셋 데이터 또는 null
   */
  static async loadPresetData(name) {
    try {
      return await StorageUtils.loadPreset(name);
    } catch (error) {
      console.error('프리셋 데이터 로드 실패:', error);
      return null;
    }
  }

  /**
   * 프리셋 로드 (기존 호환성 유지)
   * @param {string} name 프리셋 이름
   * @returns {Promise<Object|null>} 프리셋 데이터 또는 null
   */
  static async loadPreset(name) {
    return await this.loadPresetData(name);
  }

  /**
   * 프리셋 데이터 복원 (순수 기능)
   * @param {Object} presetData 프리셋 데이터
   * @param {string} restoreMode 복원 모드
   * @param {Object} conflictResolution 충돌 해결 정보
   * @returns {Promise<boolean>} 복원 성공 여부
   */
  static async restorePresetData(
    presetData,
    restoreMode,
    conflictResolution = null
  ) {
    try {
      let windowId;

      if (restoreMode === 'new-window') {
        const window = await chrome.windows.create({});
        windowId = window.id;
      } else {
        const currentWindow = await chrome.windows.getCurrent();
        windowId = currentWindow.id;
      }

      // 충돌 해결이 있는 경우 해당 데이터만 복원
      if (conflictResolution) {
        await this.restoreTabsAndGroups(
          {
            tabs: conflictResolution.tabsToCreate,
            groups: conflictResolution.groupsToCreate,
          },
          windowId
        );
      } else {
        await this.restoreTabsAndGroups(presetData, windowId);
      }

      console.log(`프리셋 데이터 복원 완료 (${restoreMode} 모드)`);
      return true;
    } catch (error) {
      console.error('프리셋 데이터 복원 실패:', error);
      throw error;
    }
  }

  /**
   * 프리셋을 새 윈도우에서 복원 (기존 호환성 유지)
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

      return await this.restorePresetData(preset, 'new-window');
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
   * 프리셋 업데이트 (순수 기능)
   * @param {string} name 프리셋 이름
   * @param {Object} newData 새로운 프리셋 데이터
   * @returns {Promise<boolean>} 업데이트 성공 여부
   */
  static async updatePresetData(name, newData) {
    try {
      const success = await StorageUtils.savePreset(name, newData);
      if (success) {
        console.log(`프리셋 데이터 업데이트 완료: ${name}`);
      }
      return success;
    } catch (error) {
      console.error('프리셋 데이터 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 프리셋 업데이트 (기존 호환성 유지)
   * @param {string} name 프리셋 이름
   * @param {Object} newData 새로운 프리셋 데이터
   * @returns {Promise<boolean>} 업데이트 성공 여부
   */
  static async updatePreset(name, newData) {
    try {
      return await this.updatePresetData(name, newData);
    } catch (error) {
      console.error('프리셋 업데이트 실패:', error);
      return false;
    }
  }
}

export default PresetManager;
