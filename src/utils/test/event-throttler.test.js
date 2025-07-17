import EventThrottler from '../event-throttler.js';

describe('EventThrottler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    EventThrottler.cancelAllPendingUpdates();
  });

  afterEach(() => {
    jest.useRealTimers();
    EventThrottler.cancelAllPendingUpdates();
  });

  describe('throttledUpdate', () => {
    test('동일한 탭에 대한 연속적인 업데이트를 디바운싱해야 함', async () => {
      const mockHandler = jest.fn().mockResolvedValue();
      const tabId = 1;
      const changeInfo = { url: 'https://example.com' };
      const tab = { id: 1, url: 'https://example.com' };

      // 연속적인 업데이트 호출
      EventThrottler.throttledUpdate(tabId, changeInfo, tab, mockHandler);
      EventThrottler.throttledUpdate(tabId, changeInfo, tab, mockHandler);
      EventThrottler.throttledUpdate(tabId, changeInfo, tab, mockHandler);

      // 아직 핸들러가 호출되지 않아야 함
      expect(mockHandler).not.toHaveBeenCalled();

      // 디바운스 시간 경과
      jest.advanceTimersByTime(EventThrottler.DEBOUNCE_DELAY);

      // 마지막 호출만 실행되어야 함
      await Promise.resolve(); // Promise 해결 대기
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith(tabId, changeInfo, tab);
    });

    test('다른 탭에 대한 업데이트는 독립적으로 처리되어야 함', async () => {
      const mockHandler = jest.fn().mockResolvedValue();

      const tab1 = { id: 1, url: 'https://example1.com' };
      const tab2 = { id: 2, url: 'https://example2.com' };
      const changeInfo1 = { url: 'https://example1.com' };
      const changeInfo2 = { url: 'https://example2.com' };

      EventThrottler.throttledUpdate(1, changeInfo1, tab1, mockHandler);
      EventThrottler.throttledUpdate(2, changeInfo2, tab2, mockHandler);

      jest.advanceTimersByTime(EventThrottler.DEBOUNCE_DELAY);

      await Promise.resolve();
      expect(mockHandler).toHaveBeenCalledTimes(2);
      expect(mockHandler).toHaveBeenCalledWith(1, changeInfo1, tab1);
      expect(mockHandler).toHaveBeenCalledWith(2, changeInfo2, tab2);
    });

    test('핸들러에서 오류가 발생해도 정상적으로 정리되어야 함', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Test error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const tabId = 1;
      const changeInfo = { url: 'https://example.com' };
      const tab = { id: 1, url: 'https://example.com' };

      EventThrottler.throttledUpdate(tabId, changeInfo, tab, mockHandler);

      jest.advanceTimersByTime(EventThrottler.DEBOUNCE_DELAY);
      await Promise.resolve();

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        '스로틀된 업데이트 처리 중 오류:',
        expect.any(Error)
      );
      expect(EventThrottler.getPendingUpdateCount()).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('debounce', () => {
    test('연속적인 호출을 디바운싱해야 함', () => {
      const mockFn = jest.fn();
      const debouncedFn = EventThrottler.debounce(mockFn, 100);

      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });
  });

  describe('throttle', () => {
    test('지정된 시간 내에 한 번만 실행되어야 함', () => {
      const mockFn = jest.fn();
      const throttledFn = EventThrottler.throttle(mockFn, 100);

      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');

      jest.advanceTimersByTime(100);

      throttledFn('arg4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('arg4');
    });
  });

  describe('delay', () => {
    test('지정된 시간만큼 지연되어야 함', async () => {
      const startTime = Date.now();
      const delayPromise = EventThrottler.delay(100);

      jest.advanceTimersByTime(100);
      await delayPromise;

      // 실제 시간은 fake timer로 인해 변경되지 않으므로 Promise 해결만 확인
      expect(delayPromise).resolves.toBeUndefined();
    });
  });

  describe('cancelAllPendingUpdates', () => {
    test('모든 대기 중인 업데이트를 취소해야 함', () => {
      const mockHandler = jest.fn();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      EventThrottler.throttledUpdate(1, {}, {}, mockHandler);
      EventThrottler.throttledUpdate(2, {}, {}, mockHandler);

      expect(EventThrottler.getPendingUpdateCount()).toBe(2);

      EventThrottler.cancelAllPendingUpdates();

      expect(EventThrottler.getPendingUpdateCount()).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        '모든 대기 중인 업데이트가 취소되었습니다.'
      );

      jest.advanceTimersByTime(EventThrottler.DEBOUNCE_DELAY);
      expect(mockHandler).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('cancelPendingUpdate', () => {
    test('특정 탭의 대기 중인 업데이트를 취소해야 함', () => {
      const mockHandler = jest.fn();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      EventThrottler.throttledUpdate(1, {}, {}, mockHandler);
      EventThrottler.throttledUpdate(2, {}, {}, mockHandler);

      expect(EventThrottler.getPendingUpdateCount()).toBe(2);

      EventThrottler.cancelPendingUpdate(1);

      expect(EventThrottler.getPendingUpdateCount()).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        '탭 1의 대기 중인 업데이트가 취소되었습니다.'
      );

      consoleSpy.mockRestore();
    });

    test('존재하지 않는 탭 ID로 취소 시도해도 오류가 발생하지 않아야 함', () => {
      expect(() => {
        EventThrottler.cancelPendingUpdate(999);
      }).not.toThrow();
    });
  });

  describe('getPendingUpdateCount', () => {
    test('대기 중인 업데이트 수를 정확히 반환해야 함', () => {
      const mockHandler = jest.fn();

      expect(EventThrottler.getPendingUpdateCount()).toBe(0);

      EventThrottler.throttledUpdate(1, {}, {}, mockHandler);
      expect(EventThrottler.getPendingUpdateCount()).toBe(1);

      EventThrottler.throttledUpdate(2, {}, {}, mockHandler);
      expect(EventThrottler.getPendingUpdateCount()).toBe(2);

      EventThrottler.cancelPendingUpdate(1);
      expect(EventThrottler.getPendingUpdateCount()).toBe(1);

      EventThrottler.cancelAllPendingUpdates();
      expect(EventThrottler.getPendingUpdateCount()).toBe(0);
    });
  });
});
