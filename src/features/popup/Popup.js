// Popup JavaScript - Placeholder for future implementation
console.log('Tab Group Manager - Popup loaded');

// DOM elements
const navigatorToggle = document.getElementById('navigator-toggle');
const presetsList = document.getElementById('presets-list');
const savePresetBtn = document.getElementById('save-preset-btn');
const settingsBtn = document.getElementById('settings-btn');
const savePresetModal = document.getElementById('save-preset-modal');
const presetNameInput = document.getElementById('preset-name-input');
const savePresetConfirm = document.getElementById('save-preset-confirm');
const savePresetCancel = document.getElementById('save-preset-cancel');

// Event listeners - placeholders for future implementation
navigatorToggle.addEventListener('change', () => {
  console.log('Navigator toggle changed:', navigatorToggle.checked);
  // TODO: Implement navigator toggle functionality
});

// Preset 저장 모달 생성 및 표시 함수 예시
function showSavePresetModal() {
  const content = `
    <div class="modal-content">
      <input id="preset-name-input" placeholder="프리셋 이름" />
      <div class="modal-actions"></div>
    </div>
  `;
  const modal = Modal({
    content,
    onClose: () => {
      document.body.removeChild(modal);
    },
    className: 'save-preset-modal',
  });
  // 버튼 생성 및 추가
  const actions = modal.querySelector('.modal-actions');
  const confirmBtn = Button({
    text: '저장',
    onClick: () => {
      const presetName = modal.querySelector('#preset-name-input').value.trim();
      if (presetName) {
        console.log('Saving preset:', presetName);
        // TODO: Implement preset saving functionality
        document.body.removeChild(modal);
      }
    },
  });
  const cancelBtn = Button({
    text: '취소',
    onClick: () => {
      document.body.removeChild(modal);
    },
  });
  actions.appendChild(confirmBtn);
  actions.appendChild(cancelBtn);
  document.body.appendChild(modal);
  modal.querySelector('#preset-name-input').focus();
}

savePresetBtn.addEventListener('click', showSavePresetModal);

settingsBtn.addEventListener('click', () => {
  console.log('Settings button clicked');
  chrome.runtime.openOptionsPage();
});

savePresetConfirm.addEventListener('click', () => {
  const presetName = presetNameInput.value.trim();
  if (presetName) {
    console.log('Saving preset:', presetName);
    // TODO: Implement preset saving functionality
    savePresetModal.classList.add('hidden');
    presetNameInput.value = '';
  }
});

savePresetCancel.addEventListener('click', () => {
  savePresetModal.classList.add('hidden');
  presetNameInput.value = '';
});

// Close modal on outside click
savePresetModal.addEventListener('click', (e) => {
  if (e.target === savePresetModal) {
    savePresetModal.classList.add('hidden');
    presetNameInput.value = '';
  }
});

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded');
  // TODO: Load and display presets
  // TODO: Load navigator toggle state
});
