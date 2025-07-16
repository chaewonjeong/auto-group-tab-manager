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

## Development

### Project Structure

```
auto-tab-grouping/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service Worker for tab management
├── popup.html/js          # Extension popup interface
├── options.html/js        # Settings page
├── onboarding.html/js     # First-time setup wizard
├── navigator.js           # Content script for tab navigator
├── styles/                # CSS files
│   ├── popup.css
│   ├── options.css
│   └── onboarding.css
├── icons/                 # Extension icons
└── package.json           # Development dependencies
```

### Development Setup

```bash
# Install development dependencies
npm install

# Package extension for distribution
npm run package
```

### Architecture

The extension uses Chrome's Manifest V3 architecture:

- **Service Worker** (`background.js`): Handles tab events and core logic
- **Popup UI** (`popup.html`): Main interface for presets and settings
- **Content Script** (`navigator.js`): Injects tab navigator into web pages
- **Options Page** (`options.html`): Comprehensive settings management
- **Onboarding** (`onboarding.html`): First-time setup experience

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
