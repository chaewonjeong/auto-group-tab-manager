# Tab Group Manager

Chrome extension for automatic tab grouping by domain with preset management and session restoration.

## Features

- 🗂️ **Automatic Tab Grouping**: New tabs are automatically grouped by domain
- 💾 **Preset Management**: Save and restore frequently used tab configurations
- 🔄 **Session Restoration**: Restore important tab groups after browser restart
- 🧭 **Tab Navigator**: Visual sidebar to manage all tabs and groups
- ⚙️ **Customizable Settings**: Configure grouping behavior and excluded domains

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension icon will appear in your toolbar

## Project Structure (2024 리팩토링 기준)

```
auto-tab/
├── src/
│   ├── core/
│   │   ├── color-manager.js
│   │   ├── domain-analyzer.js
│   │   ├── tab-group-manager.js
│   │   └── test/
│   │       ├── color-manager.test.js
│   │       ├── domain-analyzer.test.js
│   │       └── tab-group-manager.test.js
│   ├── utils/
│   │   ├── api-utils.js
│   │   ├── storage-utils.js
│   │   └── test/
│   │       └── api-utils.test.js
├── tests/
│   └── setup.js
├── styles/
│   ├── popup.css
│   ├── onboarding.css
│   └── options.css
├── icons/
│   └── icon.svg
├── background.js
├── manifest.json
├── popup.html / popup.js
├── options.html / options.js
├── onboarding.html / onboarding.js
├── navigator.js
├── README.md
├── package.json / package-lock.json
├── jest.config.js / babel.config.js
├── .gitignore
├── .vscode/
├── .kiro/
├── .cursor/
```

- 서비스 코드와 테스트는 src 하위에만 존재
- tests/ 폴더는 Jest 환경 설정만 유지
- legacy 테스트/실험 파일은 모두 삭제됨

## Development & Testing

```bash
# Install dependencies
npm install

# Run all tests (Jest)
npm test
```

- 테스트는 src/core/test, src/utils/test 등 각 모듈별 test 폴더에 위치
- 테스트 커버리지, watch 모드 등은 jest 옵션 참고

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

## Permissions

The extension requires the following permissions:

- `tabs`: To read and manage browser tabs
- `tabGroups`: To create and manage tab groups
- `storage`: To save settings and presets
- `activeTab`: To interact with the current tab
- `<all_urls>`: To group tabs from any website
- `file:///*` (optional): To group local files by directory

## Privacy

This extension:

- Only processes data locally in your browser
- Does not send any data to external servers
- Stores settings and presets using Chrome's local storage API
- Only accesses tab URLs for grouping purposes

## Contributing

This extension is built following Chrome Extension Manifest V3 best practices. Contributions are welcome!

## License

MIT License - see LICENSE file for details
