/**
 * 이벤트 스로틀링 및 디바운싱 유틸리티 클래스
 * 과도한 이벤트 처리를 방지하여 성능을 최적화합니다.
 */
class EventThrottler {
  static pendingUpdates = new Map();
  static DEBOUNCE_DELAY = 500; // 500ms

  /**
   * 디바운싱된 탭 업데이트 처리
   * @param {number} tabId - 탭 ID
   * @param {Object} changeInfo - 변경 정보
   * @param {chrome.tabs.Tab} tab - 탭 객체
   * @param {Function} handler - 처리 함수
   */
  static async throttledUpdate(tabId, changeInfo, tab, handler) {
    // 기존 타이머 취소
    if (this.pendingUpdates.has(tabId)) {
      clearTimeout(this.pendingUpdates.get(tabId));
    }

    // 새 타이머 설정
    const timer = setTimeout(async () => {
      try {
        await handler(tabId, changeInfo, tab);
      } catch (error) {
        console.error('스로틀된 업데이트 처리 중 오류:', error);
      } finally {
        this.pendingUpdates.delete(tabId);
      }
    }, this.DEBOUNCE_DELAY);

    this.pendingUpdates.set(tabId, timer);
  }

  /**
   * 일반적인 디바운싱 함수
   * @param {Function} func - 실행할 함수
   * @param {number} wait - 대기 시간 (ms)
   * @returns {Function} 디바운싱된 함수
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 스로틀링 함수
   * @param {Function} func - 실행할 함수
   * @param {number} limit - 제한 시간 (ms)
   * @returns {Function} 스로틀된 함수
   */
  static throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * 지연 함수
   * @param {number} ms - 지연 시간 (ms)
   * @returns {Promise} 지연 Promise
   */
  static delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 모든 대기 중인 업데이트를 취소합니다.
   */
  static cancelAllPendingUpdates() {
    for (const timer of this.pendingUpdates.values()) {
      clearTimeout(timer);
    }
    this.pendingUpdates.clear();
    console.log('모든 대기 중인 업데이트가 취소되었습니다.');
  }

  /**
   * 특정 탭의 대기 중인 업데이트를 취소합니다.
   * @param {number} tabId - 탭 ID
   */
  static cancelPendingUpdate(tabId) {
    if (this.pendingUpdates.has(tabId)) {
      clearTimeout(this.pendingUpdates.get(tabId));
      this.pendingUpdates.delete(tabId);
      console.log(`탭 ${tabId}의 대기 중인 업데이트가 취소되었습니다.`);
    }
  }

  /**
   * 현재 대기 중인 업데이트 수를 반환합니다.
   * @returns {number} 대기 중인 업데이트 수
   */
  static getPendingUpdateCount() {
    return this.pendingUpdates.size;
  }
}

export default EventThrottler;
