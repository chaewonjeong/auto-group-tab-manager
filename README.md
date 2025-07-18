# Tab Group Manager

Chrome extension for automatic tab grouping by domain with preset management and session restoration.

---

## Features

- 🗂️ **Automatic Tab Grouping**: New tabs are automatically grouped by domain
- 💾 **Preset Management**: Save and restore frequently used tab configurations
- 🔄 **Session Restoration**: Restore important tab groups after browser restart
- 🧭 **Tab Navigator**: Visual sidebar to manage all tabs and groups
- ⚙️ **Customizable Settings**: Configure grouping behavior and excluded domains

---

## Project Structure (Feature-based, Webpack Bundled)

```
auto-tab/
├── src/
│   ├── core/                # Business logic (domain, color, tab group, etc.)
│   ├── utils/               # Utility functions
│   ├── components/          # Pure UI components (Vanilla JS)
│   ├── features/
│   │   ├── popup/           # Popup page (JS, HTML, CSS)
│   │   ├── options/         # Options/settings page
│   │   └── onboarding/      # Onboarding/first-run page
│   ├── assets/
│   │   └── icons/           # Extension icons
│   └── background/          # Service worker entry (index.js)
├── dist/                    # Webpack build output (for Chrome load)
│   ├── background.js
│   ├── popup.html / popup.js / Popup.css
│   ├── options.html / options.js / Options.css
│   ├── onboarding.html / onboarding.js / Onboarding.css
│   ├── assets/icons/
│   ├── manifest.json
│   └── navigator.js
├── tests/                   # Jest setup and e2e/integration tests
├── config/                  # (이전) 설정 파일 보관용
├── manifest.json            # Source manifest (copied to dist)
├── webpack.config.js
├── babel.config.js
├── jest.config.js
├── package.json / package-lock.json
├── README.md
└── 기타 설정/숨김 파일
```

---

## Architecture & Design Pattern

### 계층 구조 및 책임 분리

- **background/index.js**

  - Chrome 이벤트(탭 생성/업데이트 등)를 **한 곳에서만** 리스닝
  - 모든 탭 관련 처리는 **TabService**로 위임

- **TabService**

  - **비즈니스 정책/필터링의 단일 진입점**
    - 도메인/사이트명 추출, 내부 페이지/제외 도메인/권한 체크 등 모든 정책 담당
    - 그룹화/재할당 필요성 판단
  - 하위 매니저(TabGroupManager, TabReassignmentManager)는 **직접 이벤트를 듣지 않고**, 오직 서비스에서 호출될 때만 동작
  - 상태(state) 관리(외부에서 주입)

- **TabGroupManager**

  - **순수 그룹 조작만 담당**
    - 그룹 생성/탭 할당/병합/정리 등
    - 정책/판단 로직 없음 (siteName만 받아서 동작)

- **TabReassignmentManager**
  - **그룹 mismatch 감지 및 재할당만 담당**
    - 그룹 title과 siteName 비교, 필요시 그룹 재할당
    - 정책/필터링 없음 (모든 정책은 TabService에서만)

### 설계 원칙

- **이벤트 리스너 단일화**: background에서만 이벤트를 듣고, 서비스로 위임
- **비즈니스 정책/필터링의 집중화**: TabService에서만 정책/필터링
- **매니저의 순수 기능화**: TabGroupManager/TabReassignmentManager는 "명령만 수행"
- **SRP(단일 책임 원칙) 준수**: 각 계층/모듈이 한 가지 역할만 담당

### 이점

- 정책/필터링이 한 곳(TabService)에 집중되어 유지보수/확장/테스트가 용이
- 매니저는 순수하게 그룹 조작만 담당하므로, 재사용성과 예측 가능성 향상
- 이벤트/정책/실행 계층이 명확히 분리되어 코드 가독성 및 안정성 증가

---

## Development & Build

```bash
# Install dependencies
npm install

# Run all tests (Jest)
npm test

# Build extension (outputs to /dist)
npm run build
```

- **src/**에서 개발, **dist/**에서 크롬 확장 로드
- Webpack이 JS/HTML/CSS/manifest/assets를 번들링 및 복사
- import/export, 모듈화, ES6+ 문법 자유롭게 사용 가능

---

## Usage

### First Time Setup

1. After installation, the onboarding wizard will guide you through initial setup
2. Choose whether to apply grouping to existing tabs or only new ones
3. Click "Get Started" to activate the extension

### Managing Tab Groups

- New tabs are automatically grouped by domain
- Click the extension icon to access presets and navigator
- Use the tab navigator to see all groups and quickly switch between tabs

### Creating Presets

1. Arrange your tabs and groups as desired
2. Click the extension icon
3. Click "Save current state as preset"
4. Enter a name for your preset
5. Use the preset later by selecting it from the popup menu

### Settings

Access settings through the extension popup or right-click the extension icon:

- **Auto Grouping**: Enable/disable automatic grouping
- **Session Restore**: Choose between full restore or initial preset only
- **Excluded Domains**: Specify domains that should not be grouped
- **File URL Access**: Enable grouping for local files

---

## Permissions

The extension requires the following permissions:

- `tabs`: To read and manage browser tabs
- `tabGroups`: To create and manage tab groups
- `storage`: To save settings and presets
- `activeTab`: To interact with the current tab
- `<all_urls>`: To group tabs from any website
- `file:///*` (optional): To group local files by directory

---

## Privacy

This extension:

- Only processes data locally in your browser
- Does not send any data to external servers
- Stores settings and presets using Chrome's local storage API
- Only accesses tab URLs for grouping purposes

---

## Contributing

- Feature-based, modular architecture
- Webpack + Babel + Jest 기반 개발 환경
- Chrome Extension Manifest V3 best practices 준수
- Contributions are welcome!

---

## License

MIT License - see LICENSE file for details
