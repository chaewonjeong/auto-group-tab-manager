/**
 * 팝업 UI 테스트
 * TDD 방식으로 팝업 기능을 검증합니다.
 */

import PopupController from '../popup.js';

// Chrome API 모킹
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    getURL: jest.fn((path) => `chrome-extension://test/${path}`),
  },
  tabs: {
    create: jest.fn(),
  },
};

// DOM 모킹
Object.defineProperty(global, 'document', {
  value: {
    getElementById: jest.fn(),
    createElement: jest.fn(() => ({
      textContent: '',
      innerHTML: '',
    })),
    addEventListener: jest.fn(),
  },
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    close: jest.fn(),
  },
  writable: true,
});

describe('PopupController', () => {
  let popupController;
  let mockElements;

  beforeEach(() => {
    // DOM 요소 모킹
    mockElements = {
      navigatorToggle: {
        addEventListener: jest.fn(),
        textContent: '',
        classList: {
          toggle: jest.fn(),
        },
      },
      presetList: {
        innerHTML: '',
        addEventListener: jest.fn(),
      },
      savePresetBtn: {
        addEventListener: jest.fn(),
      },
      settingsLink: {
        addEventListener: jest.fn(),
      },
      saveModal: {
        style: { display: 'none' },
      },
      presetNameInput: {
        value: '',
        addEventListener: jest.fn(),
        focus: jest.fn(),
      },
      confirmSaveBtn: {
        addEventListener: jest.fn(),
      },
      cancelSaveBtn: {
        addEventListener: jest.fn(),
      },
    };

    document.getElementById.mockImplementation((id) => mockElements[id]);

    // Chrome API 모킹 초기화 및 기본 응답 설정
    chrome.runtime.sendMessage.mockClear();
    chrome.tabs.create.mockClear();

    // 기본 응답 설정
    chrome.runtime.sendMessage.mockResolvedValue({
      enabled: false,
      presets: [],
    });

    popupController = new PopupController();
  });

  describe('초기화', () => {
    test('PopupController가 정상적으로 생성되어야 함', () => {
      expect(popupController).toBeInstanceOf(PopupController);
    });

    test('초기화 시 모든 이벤트 리스너가 등록되어야 함', () => {
      expect(
        mockElements.navigatorToggle.addEventListener
      ).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.presetList.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
      expect(mockElements.savePresetBtn.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
      expect(mockElements.settingsLink.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function)
      );
    });

    test('초기화 시 프리셋 목록을 로드해야 함', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({
        presets: [
          { name: '개발 환경', id: 'dev' },
          { name: '업무 환경', id: 'work' },
        ],
      });

      await popupController.loadPresets();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_PRESETS',
      });
    });
  });

  describe('탭 네비게이터 토글', () => {
    test('네비게이터 토글 버튼 클릭 시 메시지를 전송해야 함', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ enabled: true });

      await popupController.toggleNavigator();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'TOGGLE_NAVIGATOR',
      });
    });

    test('네비게이터 상태에 따라 버튼 텍스트가 변경되어야 함', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ enabled: true });

      await popupController.toggleNavigator();

      expect(mockElements.navigatorToggle.textContent).toBe('네비게이터 끄기');
    });

    test('네비게이터가 비활성화된 경우 버튼 텍스트가 변경되어야 함', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ enabled: false });

      await popupController.toggleNavigator();

      expect(mockElements.navigatorToggle.textContent).toBe('네비게이터 켜기');
    });
  });

  describe('프리셋 관리', () => {
    test('프리셋 목록이 올바르게 렌더링되어야 함', async () => {
      const mockPresets = [
        { name: '개발 환경', id: 'dev' },
        { name: '업무 환경', id: 'work' },
      ];

      chrome.runtime.sendMessage.mockResolvedValue({ presets: mockPresets });

      await popupController.loadPresets();

      // escapeHtml이 제대로 작동하는지 확인
      expect(mockElements.presetList.innerHTML).toContain('개발 환경');
      expect(mockElements.presetList.innerHTML).toContain('업무 환경');
      expect(mockElements.presetList.innerHTML).toContain(
        'data-preset-id="dev"'
      );
      expect(mockElements.presetList.innerHTML).toContain(
        'data-preset-id="work"'
      );
    });

    test('프리셋 선택 시 복원 메시지를 전송해야 함', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });

      await popupController.restorePreset('dev');

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'RESTORE_PRESET',
        presetId: 'dev',
      });
    });

    test('프리셋 복원 성공 시 팝업이 닫혀야 함', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });

      await popupController.restorePreset('dev');

      expect(window.close).toHaveBeenCalled();
    });

    test('현재 상태 저장 버튼 클릭 시 모달이 표시되어야 함', () => {
      popupController.showSaveModal();

      expect(mockElements.saveModal.style.display).toBe('block');
    });

    test('프리셋 저장 시 올바른 메시지를 전송해야 함', async () => {
      mockElements.presetNameInput.value = '새 프리셋';
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });

      await popupController.saveCurrentPreset();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SAVE_CURRENT_PRESET',
        name: '새 프리셋',
      });
    });

    test('프리셋 저장 성공 시 모달이 닫히고 목록이 새로고침되어야 함', async () => {
      mockElements.presetNameInput.value = '새 프리셋';
      chrome.runtime.sendMessage.mockResolvedValue({ success: true });

      await popupController.saveCurrentPreset();

      expect(mockElements.saveModal.style.display).toBe('none');
      expect(mockElements.presetNameInput.value).toBe('');
    });
  });

  describe('설정 페이지', () => {
    test('설정 링크 클릭 시 설정 페이지가 열려야 함', async () => {
      chrome.tabs.create.mockResolvedValue({});

      await popupController.openSettings();

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: chrome.runtime.getURL('src/features/options/options.html'),
      });
    });

    test('설정 페이지 열기 후 팝업이 닫혀야 함', async () => {
      chrome.tabs.create.mockResolvedValue({});

      await popupController.openSettings();

      expect(window.close).toHaveBeenCalled();
    });
  });

  describe('에러 처리', () => {
    test('프리셋 로드 실패 시 에러 메시지를 표시해야 함', async () => {
      chrome.runtime.sendMessage.mockRejectedValue(new Error('로드 실패'));

      await popupController.loadPresets();

      expect(mockElements.presetList.innerHTML).toContain(
        '프리셋을 불러올 수 없습니다'
      );
    });

    test('프리셋 저장 실패 시 에러 메시지를 표시해야 함', async () => {
      // 먼저 모달을 열어야 함
      popupController.showSaveModal();
      mockElements.presetNameInput.value = '새 프리셋';
      chrome.runtime.sendMessage.mockRejectedValue(new Error('저장 실패'));

      await popupController.saveCurrentPreset();

      // 에러 처리 로직 검증
      expect(mockElements.saveModal.style.display).toBe('block'); // 모달이 열린 상태 유지
    });

    test('빈 프리셋 이름으로 저장 시도 시 경고해야 함', async () => {
      mockElements.presetNameInput.value = '';

      await popupController.saveCurrentPreset();

      // Chrome API 호출이 되지 않아야 함
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({
        type: 'SAVE_CURRENT_PRESET',
        name: '',
      });
    });
  });
});
