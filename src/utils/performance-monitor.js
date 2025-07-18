/**
 * 성능 모니터링 유틸리티 클래스
 * 탭 그룹화 작업의 성능을 추적하고 분석합니다.
 */
class PerformanceMonitor {
  static metrics = {
    tabProcessingTimes: [],
    groupCreationTimes: [],
    urlChangeProcessingTimes: [],
    errorCounts: {
      tabProcessing: 0,
      groupCreation: 0,
      urlChangeProcessing: 0,
      apiErrors: 0,
    },
    totalOperations: {
      tabsProcessed: 0,
      groupsCreated: 0,
      urlChangesProcessed: 0,
      tabsReassigned: 0,
    },
    memoryUsage: [],
    lastResetTime: Date.now(),
  };

  /**
   * 작업 시간을 측정합니다.
   * @param {string} operationType - 작업 유형
   * @param {Function} operation - 실행할 작업
   * @returns {Promise<any>} 작업 결과
   */
  static async measureTime(operationType, operation) {
    const startTime = performance.now();
    let result;
    let error = null;

    try {
      result = await operation();
      this.recordSuccess(operationType, startTime);
    } catch (err) {
      error = err;
      this.recordError(operationType, startTime, err);
      throw err;
    }

    return result;
  }

  /**
   * 성공한 작업을 기록합니다.
   * @param {string} operationType - 작업 유형
   * @param {number} startTime - 시작 시간
   */
  static recordSuccess(operationType, startTime) {
    const duration = performance.now() - startTime;

    switch (operationType) {
      case 'tabProcessing':
        this.metrics.tabProcessingTimes.push(duration);
        this.metrics.totalOperations.tabsProcessed++;
        break;
      case 'groupCreation':
        this.metrics.groupCreationTimes.push(duration);
        this.metrics.totalOperations.groupsCreated++;
        break;
      case 'urlChangeProcessing':
        this.metrics.urlChangeProcessingTimes.push(duration);
        this.metrics.totalOperations.urlChangesProcessed++;
        break;
      case 'tabReassignment':
        this.metrics.totalOperations.tabsReassigned++;
        break;
    }

    // 메트릭 배열이 너무 커지지 않도록 제한
    this.limitMetricsSize();
  }

  /**
   * 실패한 작업을 기록합니다.
   * @param {string} operationType - 작업 유형
   * @param {number} startTime - 시작 시간
   * @param {Error} error - 발생한 오류
   */
  static recordError(operationType, startTime, error) {
    const duration = performance.now() - startTime;

    switch (operationType) {
      case 'tabProcessing':
        this.metrics.errorCounts.tabProcessing++;
        break;
      case 'groupCreation':
        this.metrics.errorCounts.groupCreation++;
        break;
      case 'urlChangeProcessing':
        this.metrics.errorCounts.urlChangeProcessing++;
        break;
      case 'apiError':
        this.metrics.errorCounts.apiErrors++;
        break;
    }

    console.warn(`성능 모니터링 - ${operationType} 오류:`, {
      duration,
      error: error.message,
      stack: error.stack,
    });
  }

  /**
   * 메트릭 배열 크기를 제한합니다.
   */
  static limitMetricsSize() {
    const maxSize = 1000;

    if (this.metrics.tabProcessingTimes.length > maxSize) {
      this.metrics.tabProcessingTimes = this.metrics.tabProcessingTimes.slice(
        -maxSize
      );
    }
    if (this.metrics.groupCreationTimes.length > maxSize) {
      this.metrics.groupCreationTimes = this.metrics.groupCreationTimes.slice(
        -maxSize
      );
    }
    if (this.metrics.urlChangeProcessingTimes.length > maxSize) {
      this.metrics.urlChangeProcessingTimes =
        this.metrics.urlChangeProcessingTimes.slice(-maxSize);
    }
  }

  /**
   * 메모리 사용량을 기록합니다.
   */
  static recordMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      const memoryInfo = {
        timestamp: Date.now(),
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };

      this.metrics.memoryUsage.push(memoryInfo);

      // 메모리 사용량 기록도 제한
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
      }
    }
  }

  /**
   * 성능 통계를 계산합니다.
   * @param {number[]} times - 시간 배열
   * @returns {Object} 통계 정보
   */
  static calculateStats(times) {
    if (times.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);

    return {
      avg: sum / times.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      count: times.length,
    };
  }

  /**
   * 성능 보고서를 생성합니다.
   * @returns {Object} 성능 보고서
   */
  static generateReport() {
    const now = Date.now();
    const uptime = now - this.metrics.lastResetTime;

    const report = {
      timestamp: now,
      uptime: uptime,
      uptimeFormatted: this.formatDuration(uptime),

      performance: {
        tabProcessing: this.calculateStats(this.metrics.tabProcessingTimes),
        groupCreation: this.calculateStats(this.metrics.groupCreationTimes),
        urlChangeProcessing: this.calculateStats(
          this.metrics.urlChangeProcessingTimes
        ),
      },

      operations: { ...this.metrics.totalOperations },

      errors: { ...this.metrics.errorCounts },

      errorRates: {
        tabProcessing: this.calculateErrorRate(
          this.metrics.errorCounts.tabProcessing,
          this.metrics.totalOperations.tabsProcessed
        ),
        groupCreation: this.calculateErrorRate(
          this.metrics.errorCounts.groupCreation,
          this.metrics.totalOperations.groupsCreated
        ),
        urlChangeProcessing: this.calculateErrorRate(
          this.metrics.errorCounts.urlChangeProcessing,
          this.metrics.totalOperations.urlChangesProcessed
        ),
      },

      throughput: {
        tabsPerMinute: this.calculateThroughput(
          this.metrics.totalOperations.tabsProcessed,
          uptime
        ),
        groupsPerMinute: this.calculateThroughput(
          this.metrics.totalOperations.groupsCreated,
          uptime
        ),
      },

      memory: this.getMemoryStats(),
    };

    return report;
  }

  /**
   * 오류율을 계산합니다.
   * @param {number} errors - 오류 수
   * @param {number} total - 전체 작업 수
   * @returns {number} 오류율 (백분율)
   */
  static calculateErrorRate(errors, total) {
    if (total === 0) return 0;
    return (errors / (errors + total)) * 100;
  }

  /**
   * 처리량을 계산합니다.
   * @param {number} operations - 작업 수
   * @param {number} timeMs - 시간 (밀리초)
   * @returns {number} 분당 처리량
   */
  static calculateThroughput(operations, timeMs) {
    if (timeMs === 0) return 0;
    return (operations / timeMs) * 60000; // 분당 처리량
  }

  /**
   * 메모리 통계를 가져옵니다.
   * @returns {Object} 메모리 통계
   */
  static getMemoryStats() {
    if (this.metrics.memoryUsage.length === 0) {
      return { current: null, peak: null, average: null };
    }

    const latest =
      this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    const peak = this.metrics.memoryUsage.reduce((max, current) =>
      current.usedJSHeapSize > max.usedJSHeapSize ? current : max
    );

    const avgUsed =
      this.metrics.memoryUsage.reduce(
        (sum, current) => sum + current.usedJSHeapSize,
        0
      ) / this.metrics.memoryUsage.length;

    return {
      current: {
        used: this.formatBytes(latest.usedJSHeapSize),
        total: this.formatBytes(latest.totalJSHeapSize),
        limit: this.formatBytes(latest.jsHeapSizeLimit),
      },
      peak: {
        used: this.formatBytes(peak.usedJSHeapSize),
        timestamp: peak.timestamp,
      },
      average: {
        used: this.formatBytes(avgUsed),
      },
    };
  }

  /**
   * 바이트를 읽기 쉬운 형태로 포맷합니다.
   * @param {number} bytes - 바이트 수
   * @returns {string} 포맷된 문자열
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 지속 시간을 읽기 쉬운 형태로 포맷합니다.
   * @param {number} ms - 밀리초
   * @returns {string} 포맷된 문자열
   */
  static formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 ${hours % 24}시간`;
    if (hours > 0) return `${hours}시간 ${minutes % 60}분`;
    if (minutes > 0) return `${minutes}분 ${seconds % 60}초`;
    return `${seconds}초`;
  }

  /**
   * 성능 보고서를 콘솔에 출력합니다.
   */
  static logReport() {
    const report = this.generateReport();

    console.log('=== 성능 모니터링 보고서 ===');
    console.log(`업타임: ${report.uptimeFormatted}`);
    console.log('');

    console.log('📊 작업 통계:');
    console.log(`  탭 처리: ${report.operations.tabsProcessed}개`);
    console.log(`  그룹 생성: ${report.operations.groupsCreated}개`);
    console.log(`  URL 변경 처리: ${report.operations.urlChangesProcessed}개`);
    console.log(`  탭 재할당: ${report.operations.tabsReassigned}개`);
    console.log('');

    console.log('⚡ 성능 지표:');
    console.log(
      `  탭 처리 평균: ${report.performance.tabProcessing.avg.toFixed(2)}ms`
    );
    console.log(
      `  그룹 생성 평균: ${report.performance.groupCreation.avg.toFixed(2)}ms`
    );
    console.log(
      `  URL 변경 처리 평균: ${report.performance.urlChangeProcessing.avg.toFixed(
        2
      )}ms`
    );
    console.log('');

    console.log('🚨 오류율:');
    console.log(`  탭 처리: ${report.errorRates.tabProcessing.toFixed(2)}%`);
    console.log(`  그룹 생성: ${report.errorRates.groupCreation.toFixed(2)}%`);
    console.log(
      `  URL 변경 처리: ${report.errorRates.urlChangeProcessing.toFixed(2)}%`
    );
    console.log('');

    console.log('🔄 처리량:');
    console.log(`  탭/분: ${report.throughput.tabsPerMinute.toFixed(2)}`);
    console.log(`  그룹/분: ${report.throughput.groupsPerMinute.toFixed(2)}`);

    if (report.memory.current) {
      console.log('');
      console.log('💾 메모리 사용량:');
      console.log(
        `  현재: ${report.memory.current.used} / ${report.memory.current.total}`
      );
      console.log(`  최대: ${report.memory.peak.used}`);
      console.log(`  평균: ${report.memory.average.used}`);
    }

    console.log('========================');
  }

  /**
   * 메트릭을 초기화합니다.
   */
  static reset() {
    this.metrics = {
      tabProcessingTimes: [],
      groupCreationTimes: [],
      urlChangeProcessingTimes: [],
      errorCounts: {
        tabProcessing: 0,
        groupCreation: 0,
        urlChangeProcessing: 0,
        apiErrors: 0,
      },
      totalOperations: {
        tabsProcessed: 0,
        groupsCreated: 0,
        urlChangesProcessed: 0,
        tabsReassigned: 0,
      },
      memoryUsage: [],
      lastResetTime: Date.now(),
    };

    console.log('성능 모니터링 메트릭이 초기화되었습니다.');
  }

  /**
   * 주기적으로 메모리 사용량을 기록합니다.
   */
  static startMemoryMonitoring() {
    // 5분마다 메모리 사용량 기록
    setInterval(() => {
      this.recordMemoryUsage();
    }, 5 * 60 * 1000);

    // 초기 기록
    this.recordMemoryUsage();
  }

  /**
   * 주기적으로 성능 보고서를 출력합니다.
   */
  static startPeriodicReporting() {
    // 30분마다 성능 보고서 출력
    setInterval(() => {
      this.logReport();
    }, 30 * 60 * 1000);
  }
}

export default PerformanceMonitor;
