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

## Installation (for Users)

1. Download the latest release or build the extension (see below)
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the **dist** directory
5. The extension icon will appear in your toolbar

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
