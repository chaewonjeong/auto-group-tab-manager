import DomainAnalyzer from '../domain-analyzer.js';

describe('DomainAnalyzer', () => {
  describe('extractSiteName', () => {
    it('일반 URL에서 사이트명을 올바르게 추출해야 한다', () => {
      expect(
        DomainAnalyzer.extractSiteName('https://www.google.com/search?q=test')
      ).toBe('google');
      expect(
        DomainAnalyzer.extractSiteName('https://github.com/user/repo')
      ).toBe('github');
      expect(DomainAnalyzer.extractSiteName('https://www.naver.com')).toBe(
        'naver'
      );
      expect(
        DomainAnalyzer.extractSiteName('https://stackoverflow.com/questions')
      ).toBe('stackoverflow');
    });
    it('서브도메인 URL에서 사이트명을 올바르게 추출해야 한다', () => {
      expect(
        DomainAnalyzer.extractSiteName('https://music.youtube.com/watch?v=123')
      ).toBe('youtube');
      expect(DomainAnalyzer.extractSiteName('https://mail.google.com')).toBe(
        'google'
      );
      expect(DomainAnalyzer.extractSiteName('https://blog.naver.com')).toBe(
        'naver'
      );
    });
    it('파일 URL에서 디렉토리명을 추출해야 한다', () => {
      expect(
        DomainAnalyzer.extractSiteName(
          'file:///Users/user/projects/my-app/index.html'
        )
      ).toBe('my-app');
      expect(
        DomainAnalyzer.extractSiteName(
          'file:///Users/user/Desktop/document.pdf'
        )
      ).toBe('desktop');
      expect(
        DomainAnalyzer.extractSiteName(
          'file:///Users/user/Documents/work/report.docx'
        )
      ).toBe('work');
    });
    it('크롬 내부/확장 URL을 올바르게 처리해야 한다', () => {
      expect(DomainAnalyzer.extractSiteName('chrome://settings/')).toBe(
        'chrome-settings'
      );
      expect(DomainAnalyzer.extractSiteName('chrome://extensions/')).toBe(
        'chrome-extensions'
      );
      expect(
        DomainAnalyzer.extractSiteName(
          'chrome-extension://abcdef123456/popup.html'
        )
      ).toBe('extensions');
    });
    it('잘못된 입력에 대해 "unknown"을 반환해야 한다', () => {
      expect(DomainAnalyzer.extractSiteName('')).toBe('unknown');
      expect(DomainAnalyzer.extractSiteName(null)).toBe('unknown');
      expect(DomainAnalyzer.extractSiteName(undefined)).toBe('unknown');
      expect(DomainAnalyzer.extractSiteName(123)).toBe('unknown');
    });
  });

  describe('extractDirectoryName', () => {
    it('파일 경로에서 디렉토리명을 추출해야 한다', () => {
      expect(
        DomainAnalyzer.extractDirectoryName(
          'file:///Users/user/projects/my-app/index.html'
        )
      ).toBe('my-app');
      expect(
        DomainAnalyzer.extractDirectoryName(
          'file:///Users/user/Desktop/file.txt'
        )
      ).toBe('desktop');
      expect(
        DomainAnalyzer.extractDirectoryName(
          'file:///Users/user/Documents/work/report.pdf'
        )
      ).toBe('work');
    });
    it('특수 디렉토리명을 올바르게 처리해야 한다', () => {
      expect(
        DomainAnalyzer.extractDirectoryName(
          'file:///Users/user/Desktop/file.txt'
        )
      ).toBe('desktop');
      expect(
        DomainAnalyzer.extractDirectoryName(
          'file:///Users/user/Documents/file.txt'
        )
      ).toBe('documents');
      expect(
        DomainAnalyzer.extractDirectoryName(
          'file:///Users/user/Downloads/file.txt'
        )
      ).toBe('downloads');
      expect(
        DomainAnalyzer.extractDirectoryName('file:///Users/user/dev/file.txt')
      ).toBe('development');
    });
    it('file URL이 아닌 경우 "local-files"를 반환해야 한다', () => {
      expect(DomainAnalyzer.extractDirectoryName('https://example.com')).toBe(
        'local-files'
      );
      expect(DomainAnalyzer.extractDirectoryName('')).toBe('local-files');
    });
    it('루트 또는 빈 경로를 올바르게 처리해야 한다', () => {
      expect(DomainAnalyzer.extractDirectoryName('file:///')).toBe('root');
      expect(DomainAnalyzer.extractDirectoryName('file:///file.txt')).toBe(
        'root'
      );
    });
  });

  describe('extractDomain', () => {
    it('일반 URL에서 도메인을 올바르게 추출해야 한다', () => {
      expect(
        DomainAnalyzer.extractDomain('https://www.google.com/search')
      ).toBe('www.google.com');
      expect(DomainAnalyzer.extractDomain('https://github.com/user/repo')).toBe(
        'github.com'
      );
      expect(DomainAnalyzer.extractDomain('http://example.com:8080/path')).toBe(
        'example.com'
      );
    });
    it('특수 프로토콜을 올바르게 처리해야 한다', () => {
      expect(DomainAnalyzer.extractDomain('file:///path/to/file.html')).toBe(
        'file://'
      );
      expect(DomainAnalyzer.extractDomain('chrome://settings/')).toBe(
        'chrome://'
      );
      expect(
        DomainAnalyzer.extractDomain('chrome-extension://id/popup.html')
      ).toBe('chrome-extension://');
    });
    it('잘못된 입력에 대해 빈 문자열을 반환해야 한다', () => {
      expect(DomainAnalyzer.extractDomain('')).toBe('');
      expect(DomainAnalyzer.extractDomain(null)).toBe('');
      expect(DomainAnalyzer.extractDomain(undefined)).toBe('');
    });
  });

  describe('isFileUrl', () => {
    it('file URL을 올바르게 판별해야 한다', () => {
      expect(DomainAnalyzer.isFileUrl('file:///path/to/file.html')).toBe(true);
      expect(DomainAnalyzer.isFileUrl('file://localhost/path/file.txt')).toBe(
        true
      );
    });
    it('file URL이 아닌 경우 false를 반환해야 한다', () => {
      expect(DomainAnalyzer.isFileUrl('https://example.com')).toBe(false);
      expect(DomainAnalyzer.isFileUrl('http://localhost:3000')).toBe(false);
      expect(DomainAnalyzer.isFileUrl('chrome://settings')).toBe(false);
      expect(DomainAnalyzer.isFileUrl('')).toBe(false);
      expect(DomainAnalyzer.isFileUrl(null)).toBe(false);
    });
  });

  describe('isExcludedDomain', () => {
    const excludedDomains = ['localhost', 'example.com', 'test.local'];
    it('제외 도메인을 올바르게 판별해야 한다', () => {
      expect(
        DomainAnalyzer.isExcludedDomain('localhost', excludedDomains)
      ).toBe(true);
      expect(
        DomainAnalyzer.isExcludedDomain('example.com', excludedDomains)
      ).toBe(true);
      expect(
        DomainAnalyzer.isExcludedDomain('test.local', excludedDomains)
      ).toBe(true);
    });
    it('서브도메인도 제외로 판별해야 한다', () => {
      expect(
        DomainAnalyzer.isExcludedDomain('sub.example.com', excludedDomains)
      ).toBe(true);
      expect(
        DomainAnalyzer.isExcludedDomain('api.test.local', excludedDomains)
      ).toBe(true);
      expect(
        DomainAnalyzer.isExcludedDomain('www.localhost', excludedDomains)
      ).toBe(true);
    });
    it('제외되지 않은 도메인은 false를 반환해야 한다', () => {
      expect(
        DomainAnalyzer.isExcludedDomain('google.com', excludedDomains)
      ).toBe(false);
      expect(
        DomainAnalyzer.isExcludedDomain('github.com', excludedDomains)
      ).toBe(false);
      expect(
        DomainAnalyzer.isExcludedDomain('stackoverflow.com', excludedDomains)
      ).toBe(false);
    });
    it('잘못된 입력에 대해 false를 반환해야 한다', () => {
      expect(DomainAnalyzer.isExcludedDomain('', excludedDomains)).toBe(false);
      expect(DomainAnalyzer.isExcludedDomain(null, excludedDomains)).toBe(
        false
      );
      expect(DomainAnalyzer.isExcludedDomain('example.com', null)).toBe(false);
      expect(DomainAnalyzer.isExcludedDomain('example.com', 'not-array')).toBe(
        false
      );
    });
    it('빈 제외 목록에 대해 false를 반환해야 한다', () => {
      expect(DomainAnalyzer.isExcludedDomain('example.com', [])).toBe(false);
    });
  });
});
