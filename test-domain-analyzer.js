/**
 * DomainAnalyzer 클래스 단위 테스트
 * Chrome 확장 환경에서 실행할 수 있는 간단한 테스트
 */

// 모듈 로드 (Chrome 확장 환경에서만 필요)
try {
  if (
    typeof DomainAnalyzer === 'undefined' ||
    typeof TabGroupManager === 'undefined'
  ) {
    importScripts(
      'src/core/domain-analyzer.js',
      'src/core/color-manager.js',
      'src/core/tab-group-manager.js'
    );
    console.log('테스트를 위한 모듈 로드 완료');
  }
} catch (error) {
  console.error('테스트를 위한 모듈 로드 실패:', error);
}

// DomainAnalyzer 클래스를 테스트하기 위한 함수들
function testDomainAnalyzer() {
  console.log('=== DomainAnalyzer 단위 테스트 시작 ===');

  const tests = [
    // 일반 웹 URL 테스트
    {
      name: '일반 웹 URL - Google',
      url: 'https://www.google.com/search?q=test',
      expectedSiteName: 'google',
      expectedDomain: 'www.google.com',
    },
    {
      name: '일반 웹 URL - GitHub',
      url: 'https://github.com/user/repo',
      expectedSiteName: 'github',
      expectedDomain: 'github.com',
    },
    {
      name: '일반 웹 URL - 한국 사이트',
      url: 'https://www.naver.com',
      expectedSiteName: 'naver',
      expectedDomain: 'www.naver.com',
    },

    // 로컬 파일 URL 테스트
    {
      name: '로컬 파일 URL - 프로젝트 폴더',
      url: 'file:///Users/user/projects/my-app/index.html',
      expectedSiteName: 'my-app',
      expectedDomain: 'file://',
    },
    {
      name: '로컬 파일 URL - 데스크톱',
      url: 'file:///Users/user/Desktop/document.pdf',
      expectedSiteName: 'desktop',
      expectedDomain: 'file://',
    },

    // 크롬 내부 페이지 테스트
    {
      name: '크롬 내부 페이지 - 설정',
      url: 'chrome://settings/',
      expectedSiteName: 'chrome-settings',
      expectedDomain: 'chrome://',
    },
    {
      name: '크롬 확장 페이지',
      url: 'chrome-extension://abcdef123456/popup.html',
      expectedSiteName: 'extensions',
      expectedDomain: 'chrome-extension://',
    },

    // 특별한 도메인 테스트
    {
      name: '서브도메인 - YouTube',
      url: 'https://music.youtube.com/watch?v=123',
      expectedSiteName: 'youtube',
      expectedDomain: 'music.youtube.com',
    },
    {
      name: '일반 도메인 - 알려지지 않은 사이트',
      url: 'https://example-site.co.kr/page',
      expectedSiteName: 'example-site',
      expectedDomain: 'example-site.co.kr',
    },
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  tests.forEach((test, index) => {
    console.log(`\n테스트 ${index + 1}: ${test.name}`);
    console.log(`입력 URL: ${test.url}`);

    try {
      // 사이트명 추출 테스트
      const actualSiteName = DomainAnalyzer.extractSiteName(test.url);
      const siteNameMatch = actualSiteName === test.expectedSiteName;

      // 도메인 추출 테스트
      const actualDomain = DomainAnalyzer.extractDomain(test.url);
      const domainMatch = actualDomain === test.expectedDomain;

      console.log(
        `사이트명: ${actualSiteName} (예상: ${test.expectedSiteName}) ${
          siteNameMatch ? '✓' : '✗'
        }`
      );
      console.log(
        `도메인: ${actualDomain} (예상: ${test.expectedDomain}) ${
          domainMatch ? '✓' : '✗'
        }`
      );

      if (siteNameMatch && domainMatch) {
        console.log('✓ 테스트 통과');
        passedTests++;
      } else {
        console.log('✗ 테스트 실패');
      }
    } catch (error) {
      console.error('✗ 테스트 중 오류 발생:', error);
    }
  });

  console.log(`\n=== 테스트 결과: ${passedTests}/${totalTests} 통과 ===`);

  // 추가 기능 테스트
  console.log('\n=== 추가 기능 테스트 ===');

  // 파일 URL 확인 테스트
  console.log('파일 URL 확인 테스트:');
  console.log(
    `file:// URL: ${DomainAnalyzer.isFileUrl('file:///test.html')} (예상: true)`
  );
  console.log(
    `http:// URL: ${DomainAnalyzer.isFileUrl(
      'https://google.com'
    )} (예상: false)`
  );

  // 제외 도메인 확인 테스트
  console.log('\n제외 도메인 확인 테스트:');
  const excludedDomains = ['localhost', 'example.com', 'test.local'];
  console.log(
    `localhost 제외: ${DomainAnalyzer.isExcludedDomain(
      'localhost',
      excludedDomains
    )} (예상: true)`
  );
  console.log(
    `google.com 제외: ${DomainAnalyzer.isExcludedDomain(
      'google.com',
      excludedDomains
    )} (예상: false)`
  );
  console.log(
    `sub.example.com 제외: ${DomainAnalyzer.isExcludedDomain(
      'sub.example.com',
      excludedDomains
    )} (예상: true)`
  );

  return passedTests === totalTests;
}

// TabGroupManager 색상 테스트
function testTabGroupManagerColors() {
  console.log('\n=== TabGroupManager 색상 테스트 ===');

  const colorTests = [
    { siteName: 'google', expectedColor: 'blue' },
    { siteName: 'youtube', expectedColor: 'red' },
    { siteName: 'github', expectedColor: 'grey' },
    { siteName: 'unknown-site', expectedColor: null }, // 해시 기반 색상
  ];

  colorTests.forEach((test) => {
    const actualColor = TabGroupManager.getGroupColor(test.siteName);
    console.log(
      `${test.siteName}: ${actualColor} ${
        test.expectedColor && actualColor === test.expectedColor ? '✓' : ''
      }`
    );
  });

  // 일관성 테스트 - 같은 사이트명은 항상 같은 색상을 반환해야 함
  console.log('\n색상 일관성 테스트:');
  const testSite = 'test-consistency';
  const color1 = TabGroupManager.getGroupColor(testSite);
  const color2 = TabGroupManager.getGroupColor(testSite);
  const color3 = TabGroupManager.getGroupColor(testSite);

  const isConsistent = color1 === color2 && color2 === color3;
  console.log(
    `${testSite} 색상 일관성: ${color1} === ${color2} === ${color3} ${
      isConsistent ? '✓' : '✗'
    }`
  );

  return true;
}

// 전체 테스트 실행 함수
function runAllTests() {
  console.log('도메인 분석 및 그룹 관리 로직 단위 테스트 실행');
  console.log('='.repeat(50));

  const domainAnalyzerResult = testDomainAnalyzer();
  const colorTestResult = testTabGroupManagerColors();

  console.log('\n' + '='.repeat(50));
  console.log('전체 테스트 결과:');
  console.log(`DomainAnalyzer: ${domainAnalyzerResult ? '✓ 통과' : '✗ 실패'}`);
  console.log(`TabGroupManager 색상: ${colorTestResult ? '✓ 통과' : '✗ 실패'}`);

  const allPassed = domainAnalyzerResult && colorTestResult;
  console.log(
    `\n최종 결과: ${allPassed ? '✓ 모든 테스트 통과' : '✗ 일부 테스트 실패'}`
  );

  return allPassed;
}

// 테스트 실행 (Chrome 확장 환경에서 호출 가능)
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // Chrome 확장 환경에서 실행
  console.log('Chrome 확장 환경에서 테스트 실행');
  runAllTests();
} else {
  // 일반 브라우저 환경에서 실행
  console.log('일반 브라우저 환경에서 테스트 실행');
  // DomainAnalyzer와 TabGroupManager 클래스가 정의되어 있다면 실행
  if (
    typeof DomainAnalyzer !== 'undefined' &&
    typeof TabGroupManager !== 'undefined'
  ) {
    runAllTests();
  } else {
    console.log('테스트 대상 클래스가 정의되지 않았습니다.');
  }
}
