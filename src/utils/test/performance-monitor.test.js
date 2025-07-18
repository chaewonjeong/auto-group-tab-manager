import PerformanceMonitor from '../performance-monitor.js';

// Performance API 모킹
global.performance = {
  now: jest.fn(),
  memory: {
    usedJSHeapSize: 1024 * 1024 * 10, // 10MB
    totalJSHeapSize: 1024 * 1024 * 20, // 20MB
    jsHeapSizeLimit: 1024 * 1024 * 100, // 100MB
  },
};

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PerformanceMonitor.reset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('measureTime', () => {
    test('성공한 작업의 시간을 측정하고 기록해야 함', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await PerformanceMonitor.measureTime(
        'tabProcessing',
        mockOperation
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);

      const report = PerformanceMonitor.generateReport();
      expect(report.performance.tabProcessing.count).toBe(1);
      expect(report.operations.tabsProcessed).toBe(1);
    });

    test('실패한 작업의 오류를 기록하고 다시 던져야 함', async () => {
      const error = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await expect(
        PerformanceMonitor.measureTime('tabProcessing', mockOperation)
      ).rejects.toThrow('Test error');

      const report = PerformanceMonitor.generateReport();
      expect(report.errors.tabProcessing).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        '성능 모니터링 - tabProcessing 오류:',
        expect.objectContaining({
          error: 'Test error',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('recordSuccess', () => {
    test('다양한 작업 유형의 성공을 기록해야 함', () => {
      PerformanceMonitor.recordSuccess('tabProcessing', 1000);
      PerformanceMonitor.recordSuccess('groupCreation', 1000);
      PerformanceMonitor.recordSuccess('urlChangeProcessing', 1000);
      PerformanceMonitor.recordSuccess('tabReassignment', 1000);

      const report = PerformanceMonitor.generateReport();
      expect(report.operations.tabsProcessed).toBe(1);
      expect(report.operations.groupsCreated).toBe(1);
      expect(report.operations.urlChangesProcessed).toBe(1);
      expect(report.operations.tabsReassigned).toBe(1);
    });
  });

  describe('recordError', () => {
    test('다양한 작업 유형의 오류를 기록해야 함', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const error = new Error('Test error');

      PerformanceMonitor.recordError('tabProcessing', 1000, error);
      PerformanceMonitor.recordError('groupCreation', 1000, error);
      PerformanceMonitor.recordError('urlChangeProcessing', 1000, error);
      PerformanceMonitor.recordError('apiError', 1000, error);

      const report = PerformanceMonitor.generateReport();
      expect(report.errors.tabProcessing).toBe(1);
      expect(report.errors.groupCreation).toBe(1);
      expect(report.errors.urlChangeProcessing).toBe(1);
      expect(report.errors.apiErrors).toBe(1);

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      consoleSpy.mockRestore();
    });
  });

  describe('limitMetricsSize', () => {
    test('메트릭 배열 크기를 제한해야 함', () => {
      // 1001개의 메트릭 추가
      for (let i = 0; i < 1001; i++) {
        PerformanceMonitor.recordSuccess('tabProcessing', 1000);
      }

      const report = PerformanceMonitor.generateReport();
      expect(report.performance.tabProcessing.count).toBe(1000); // 최대 1000개로 제한
      expect(report.operations.tabsProcessed).toBe(1001); // 총 작업 수는 유지
    });
  });

  describe('recordMemoryUsage', () => {
    test('메모리 사용량을 기록해야 함', () => {
      // performance.memory가 있는 경우에만 테스트
      if (global.performance.memory) {
        PerformanceMonitor.recordMemoryUsage();

        const report = PerformanceMonitor.generateReport();
        expect(report.memory.current).toBeDefined();
        expect(report.memory.current).not.toBeNull();
        if (report.memory.current) {
          expect(report.memory.current.used).toContain('MB');
        }
      } else {
        // performance.memory가 없는 경우 기본 동작 확인
        PerformanceMonitor.recordMemoryUsage();
        const report = PerformanceMonitor.generateReport();
        expect(report.memory.current).toBeNull();
      }
    });

    test('performance.memory가 없으면 기록하지 않아야 함', () => {
      const originalMemory = global.performance.memory;
      delete global.performance.memory;

      PerformanceMonitor.recordMemoryUsage();

      const report = PerformanceMonitor.generateReport();
      expect(report.memory.current).toBeNull();

      global.performance.memory = originalMemory;
    });
  });

  describe('calculateStats', () => {
    test('빈 배열에 대해 기본값을 반환해야 함', () => {
      const stats = PerformanceMonitor.calculateStats([]);
      expect(stats).toEqual({
        avg: 0,
        min: 0,
        max: 0,
        count: 0,
      });
    });

    test('통계를 올바르게 계산해야 함', () => {
      const times = [100, 200, 300, 400, 500];
      const stats = PerformanceMonitor.calculateStats(times);

      expect(stats.avg).toBe(300);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(500);
      expect(stats.median).toBe(300);
      expect(stats.p95).toBe(500);
      expect(stats.count).toBe(5);
    });
  });

  describe('generateReport', () => {
    test('포괄적인 성능 보고서를 생성해야 함', () => {
      // 일부 메트릭 추가
      PerformanceMonitor.recordSuccess('tabProcessing', 1000);
      PerformanceMonitor.recordSuccess('groupCreation', 1000);
      PerformanceMonitor.recordError('tabProcessing', 1000, new Error('Test'));
      PerformanceMonitor.recordMemoryUsage();

      const report = PerformanceMonitor.generateReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('uptime');
      expect(report).toHaveProperty('uptimeFormatted');
      expect(report).toHaveProperty('performance');
      expect(report).toHaveProperty('operations');
      expect(report).toHaveProperty('errors');
      expect(report).toHaveProperty('errorRates');
      expect(report).toHaveProperty('throughput');
      expect(report).toHaveProperty('memory');

      expect(report.operations.tabsProcessed).toBe(1);
      expect(report.operations.groupsCreated).toBe(1);
      expect(report.errors.tabProcessing).toBe(1);
    });
  });

  describe('calculateErrorRate', () => {
    test('오류율을 올바르게 계산해야 함', () => {
      const errorRate = PerformanceMonitor.calculateErrorRate(1, 9); // 1 error, 9 success
      expect(errorRate).toBe(10); // 10%
    });

    test('전체 작업이 0이면 0을 반환해야 함', () => {
      const errorRate = PerformanceMonitor.calculateErrorRate(0, 0);
      expect(errorRate).toBe(0);
    });
  });

  describe('calculateThroughput', () => {
    test('처리량을 올바르게 계산해야 함', () => {
      const throughput = PerformanceMonitor.calculateThroughput(60, 60000); // 60 operations in 60 seconds
      expect(throughput).toBe(60); // 60 per minute
    });

    test('시간이 0이면 0을 반환해야 함', () => {
      const throughput = PerformanceMonitor.calculateThroughput(10, 0);
      expect(throughput).toBe(0);
    });
  });

  describe('formatBytes', () => {
    test('바이트를 올바르게 포맷해야 함', () => {
      expect(PerformanceMonitor.formatBytes(0)).toBe('0 Bytes');
      expect(PerformanceMonitor.formatBytes(1024)).toBe('1 KB');
      expect(PerformanceMonitor.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(PerformanceMonitor.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('formatDuration', () => {
    test('지속 시간을 올바르게 포맷해야 함', () => {
      expect(PerformanceMonitor.formatDuration(1000)).toBe('1초');
      expect(PerformanceMonitor.formatDuration(60000)).toBe('1분 0초');
      expect(PerformanceMonitor.formatDuration(3600000)).toBe('1시간 0분');
      expect(PerformanceMonitor.formatDuration(86400000)).toBe('1일 0시간');
    });
  });

  describe('logReport', () => {
    test('성능 보고서를 콘솔에 출력해야 함', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      PerformanceMonitor.recordSuccess('tabProcessing', 1000);
      PerformanceMonitor.logReport();

      expect(consoleSpy).toHaveBeenCalledWith('=== 성능 모니터링 보고서 ===');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('업타임:')
      );
      expect(consoleSpy).toHaveBeenCalledWith('📊 작업 통계:');

      consoleSpy.mockRestore();
    });
  });

  describe('reset', () => {
    test('모든 메트릭을 초기화해야 함', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // 일부 메트릭 추가
      PerformanceMonitor.recordSuccess('tabProcessing', 1000);
      PerformanceMonitor.recordError('tabProcessing', 1000, new Error('Test'));

      // 초기화
      PerformanceMonitor.reset();

      const report = PerformanceMonitor.generateReport();
      expect(report.operations.tabsProcessed).toBe(0);
      expect(report.errors.tabProcessing).toBe(0);
      expect(report.performance.tabProcessing.count).toBe(0);

      expect(consoleSpy).toHaveBeenCalledWith(
        '성능 모니터링 메트릭이 초기화되었습니다.'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('startMemoryMonitoring', () => {
    test('메모리 모니터링을 시작해야 함', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      PerformanceMonitor.startMemoryMonitoring();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5분
      );

      setIntervalSpy.mockRestore();
    });
  });

  describe('startPeriodicReporting', () => {
    test('주기적 보고를 시작해야 함', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      PerformanceMonitor.startPeriodicReporting();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        30 * 60 * 1000 // 30분
      );

      setIntervalSpy.mockRestore();
    });
  });
});
