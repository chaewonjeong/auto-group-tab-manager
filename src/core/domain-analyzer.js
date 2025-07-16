/**
 * 도메인 분석 클래스
 * URL에서 도메인을 추출하고 사이트명을 생성하며, 로컬 파일을 처리합니다.
 */
class DomainAnalyzer {
  /**
   * URL에서 사이트명을 추출합니다.
   * @param {string} url - 분석할 URL
   * @returns {string} 추출된 사이트명
   */
  static extractSiteName(url) {
    try {
      if (!url || typeof url !== 'string') {
        return 'unknown';
      }

      // 로컬 파일 처리
      if (url.startsWith('file://')) {
        return this.extractDirectoryName(url);
      }

      // 크롬 내부 페이지 처리
      if (url.startsWith('chrome://')) {
        const match = url.match(/chrome:\/\/([^\/]+)/);
        return match ? `chrome-${match[1]}` : 'chrome';
      }

      // 확장 프로그램 페이지 처리
      if (url.startsWith('chrome-extension://')) {
        return 'extensions';
      }

      // 일반 웹 URL 처리
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // www. 제거
      const domain = hostname.replace(/^www\./, '');

      // 도메인에서 사이트명 추출
      const parts = domain.split('.');

      // 특별한 도메인 처리
      const specialDomains = {
        'github.com': 'github',
        'stackoverflow.com': 'stackoverflow',
        'google.com': 'google',
        'youtube.com': 'youtube',
        'facebook.com': 'facebook',
        'twitter.com': 'twitter',
        'linkedin.com': 'linkedin',
        'reddit.com': 'reddit',
        'wikipedia.org': 'wikipedia',
        'amazon.com': 'amazon',
        'netflix.com': 'netflix',
        'naver.com': 'naver',
        'daum.net': 'daum',
        'kakao.com': 'kakao',
      };

      if (specialDomains[domain]) {
        return specialDomains[domain];
      }

      // 일반적인 경우: 최상위 도메인 이전의 마지막 부분 사용
      if (parts.length >= 2) {
        return parts[parts.length - 2];
      }

      return domain;
    } catch (error) {
      console.error('사이트명 추출 중 오류:', error);
      return 'unknown';
    }
  }

  /**
   * 로컬 파일 URL에서 디렉토리명을 추출합니다.
   * @param {string} fileUrl - 로컬 파일 URL
   * @returns {string} 디렉토리명
   */
  static extractDirectoryName(fileUrl) {
    try {
      if (!fileUrl.startsWith('file://')) {
        return 'local-files';
      }

      // file:// 제거
      const path = decodeURIComponent(fileUrl.replace('file://', ''));

      // 경로를 분할하여 디렉토리 구조 분석
      const pathParts = path.split('/').filter((part) => part.length > 0);

      if (pathParts.length === 0) {
        return 'root';
      }

      // 파일명 제거 (마지막 부분이 파일인 경우)
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart.includes('.')) {
        pathParts.pop();
      }

      if (pathParts.length === 0) {
        return 'root';
      }

      // 마지막 디렉토리명 사용
      const dirName = pathParts[pathParts.length - 1];

      // 특별한 디렉토리명 처리
      const specialDirs = {
        Desktop: 'desktop',
        Documents: 'documents',
        Downloads: 'downloads',
        Pictures: 'pictures',
        Music: 'music',
        Videos: 'videos',
        dev: 'development',
        projects: 'projects',
        work: 'work',
      };

      return specialDirs[dirName] || dirName.toLowerCase();
    } catch (error) {
      console.error('디렉토리명 추출 중 오류:', error);
      return 'local-files';
    }
  }

  /**
   * URL이 파일 URL인지 확인합니다.
   * @param {string} url - 확인할 URL
   * @returns {boolean} 파일 URL 여부
   */
  static isFileUrl(url) {
    return url && url.startsWith('file://');
  }

  /**
   * 도메인이 제외 목록에 있는지 확인합니다.
   * @param {string} domain - 확인할 도메인
   * @param {string[]} excludedDomains - 제외 도메인 목록
   * @returns {boolean} 제외 여부
   */
  static isExcludedDomain(domain, excludedDomains = []) {
    if (!domain || !Array.isArray(excludedDomains)) {
      return false;
    }

    const lowerDomain = domain.toLowerCase();
    return excludedDomains.some((excluded) => {
      const lowerExcluded = excluded.toLowerCase();
      return (
        lowerDomain === lowerExcluded ||
        lowerDomain.endsWith(`.${lowerExcluded}`)
      );
    });
  }

  /**
   * URL에서 전체 도메인을 추출합니다.
   * @param {string} url - 분석할 URL
   * @returns {string} 도메인
   */
  static extractDomain(url) {
    try {
      if (!url || typeof url !== 'string') {
        return '';
      }

      if (url.startsWith('file://')) {
        return 'file://';
      }

      if (url.startsWith('chrome://')) {
        return 'chrome://';
      }

      if (url.startsWith('chrome-extension://')) {
        return 'chrome-extension://';
      }

      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch (error) {
      console.error('도메인 추출 중 오류:', error);
      return '';
    }
  }
}
