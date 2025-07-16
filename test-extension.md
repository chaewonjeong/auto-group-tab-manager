# Service Worker 테스트 가이드

## 구현된 기능 (Task 2.1)

### 1. 기본 Service Worker 설정

- ✅ background.js 파일 생성 및 기본 구조 작성
- ✅ 전역 상태 관리 시스템
- ✅ 초기화 함수 및 설정 로드/저장
- ✅ Chrome Storage API 연동

### 2. 탭 이벤트 리스너 등록

- ✅ chrome.tabs.onCreated - 새 탭 생성 감지
- ✅ chrome.tabs.onUpdated - 탭 URL 변경 감지
- ✅ chrome.tabs.onRemoved - 탭 제거 감지
- ✅ 에러 처리 및 로깅

### 3. 탭 그룹 이벤트 리스너 등록

- ✅ chrome.tabGroups.onCreated - 그룹 생성 감지
- ✅ chrome.tabGroups.onUpdated - 그룹 업데이트 감지
- ✅ chrome.tabGroups.onRemoved - 그룹 제거 감지
- ✅ 그룹 내 탭 수 확인 기능

### 4. Chrome Tabs API 및 TabGroups API 연동 테스트

- ✅ 포괄적인 API 테스트 함수 구현
- ✅ 탭 조회, 그룹 조회, 그룹 생성/업데이트 테스트
- ✅ 권한 확인 및 에러 처리
- ✅ 테스트 결과 상세 로깅

### 5. 메시지 처리 시스템

- ✅ chrome.runtime.onMessage 리스너
- ✅ 설정 관리 메시지 처리
- ✅ API 테스트 실행 메시지 처리
- ✅ 파일 권한 요청 처리

### 6. 확장 생명주기 관리

- ✅ chrome.runtime.onInstalled - 설치/업데이트 처리
- ✅ chrome.runtime.onStartup - 브라우저 시작 처리
- ✅ 온보딩 페이지 자동 열기

## 테스트 방법

1. Chrome 브라우저에서 chrome://extensions/ 접속
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. 프로젝트 폴더 선택
5. 확장 프로그램 로드 후 콘솔에서 로그 확인

## 확인할 로그 메시지

- "Tab Group Manager - Service Worker 초기화 중..."
- "Chrome Tabs API 및 TabGroups API 연동 테스트 시작..."
- "✓ 현재 열린 탭 수: X"
- "✓ 현재 존재하는 탭 그룹 수: X"
- "탭 생성됨: [탭ID] [URL]"
- "탭 그룹 생성됨: [그룹정보]"

## 다음 태스크에서 구현할 기능

- DomainAnalyzer 클래스 (도메인 분석)
- TabGroupManager 클래스 (그룹 관리)
- 실제 자동 그룹화 로직
