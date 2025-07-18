# Auto Tab Group (Chrome Extension)

Automatically group your Chrome tabs by domain, manage tab presets, and restore sessions with ease.

![화면 기록 2025-07-18 오후 10 26 35](https://github.com/user-attachments/assets/cdd51c27-1c8c-4dae-b0a9-54b9b59c59d2)


---

## Features

- 🗂️ **Automatic Tab Grouping**: New tabs are automatically grouped by domain.
- 💾 **Preset Management**: Save and restore your favorite tab configurations.
- 🔄 **Session Restoration**: Restore important tab groups after restarting your browser.
- 🧭 **Tab Navigator**: Visual sidebar to manage all tabs and groups.
- ⚙️ **Customizable Settings**: Configure grouping behavior and exclude specific domains.

---

## Project Structure

```
auto-tab/
├── src/
│   ├── assets/
│   │   └── icons/           # Extension icons
│   ├── background/          # Background scripts (service worker entry)
│   ├── components/          # UI components (Vanilla JS)
│   ├── core/                # Core business logic (domain, color, tab group, etc.)
│   │   └── test/            # Unit tests for core logic
│   ├── features/
│   │   ├── onboarding/      # Onboarding/first-run page (HTML, JS, CSS)
│   │   ├── options/         # Options/settings page (HTML, JS, CSS)
│   │   └── popup/           # Popup page (HTML, JS, CSS, tests)
│   ├── managers/            # State and logic managers
│   │   └── test/            # Unit tests for managers
│   ├── services/            # Service layer (tab, session, settings, etc.)
│   │   └── test/            # Unit tests for services
│   └── utils/               # Utility functions
│       └── test/            # Unit tests for utils
├── tests/                   # Test setup and integration
├── manifest.json            # Chrome extension manifest
├── webpack.config.js        # Webpack configuration
├── babel.config.js          # Babel configuration
├── jest.config.js           # Jest configuration
├── package.json / package-lock.json
└── README.md
```

---

## Usage

1. **Install** the extension in Chrome (see releases or load unpacked from `dist/`).
2. On first run, the onboarding wizard will guide you through setup.
3. New tabs will be grouped by domain automatically.
4. Use the extension popup to manage tab groups, save/load presets, and access settings.

---

## Permissions

This extension requests the following permissions:

- `tabs`: Read and manage browser tabs
- `tabGroups`: Create and manage tab groups
- `storage`: Save settings and presets
- `activeTab`: Interact with the current tab
- `<all_urls>`: Group tabs from any website
- `file:///*` (optional): Group local files by directory

---

## Privacy

- All data is processed locally in your browser.
- No data is sent to external servers.
- Settings and presets are stored using Chrome's local storage API.
- Only tab URLs are accessed for grouping purposes.

---

## Contributing

Contributions are welcome! Please open issues or pull requests for features, bug fixes, or suggestions.

- **Layered Modular Architecture**
- Follows Chrome Extension Manifest V3 best practices
- See the `docs/` directory (coming soon) for development and build instructions

---

## License

MIT License – see the LICENSE file for details.
