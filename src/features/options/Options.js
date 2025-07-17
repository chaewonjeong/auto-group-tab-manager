// Options JavaScript - Placeholder for future implementation
console.log('Tab Group Manager - Options loaded');

// DOM elements
const autoGroupingToggle = document.getElementById('auto-grouping-toggle');
const restoreFull = document.getElementById('restore-full');
const restoreInitial = document.getElementById('restore-initial');
const excludedDomainsList = document.getElementById('excluded-domains-list');
const newDomainInput = document.getElementById('new-domain-input');
const addDomainBtn = document.getElementById('add-domain-btn');
const filePermissionStatus = document.getElementById('file-permission-status');
const requestFilePermission = document.getElementById(
  'request-file-permission'
);
const saveSettingsBtn = document.getElementById('save-settings-btn');
const resetSettingsBtn = document.getElementById('reset-settings-btn');

// Event listeners - placeholders for future implementation
autoGroupingToggle.addEventListener('change', () => {
  console.log('Auto grouping toggle changed:', autoGroupingToggle.checked);
  // TODO: Implement auto grouping toggle functionality
});

restoreFull.addEventListener('change', () => {
  if (restoreFull.checked) {
    console.log('Restore mode: full');
    // TODO: Update restore mode setting
  }
});

restoreInitial.addEventListener('change', () => {
  if (restoreInitial.checked) {
    console.log('Restore mode: initial');
    // TODO: Update restore mode setting
  }
});

addDomainBtn.addEventListener('click', () => {
  const domain = newDomainInput.value.trim();
  if (domain) {
    console.log('Adding excluded domain:', domain);
    // TODO: Implement add domain functionality
    newDomainInput.value = '';
  }
});

newDomainInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addDomainBtn.click();
  }
});

requestFilePermission.addEventListener('click', () => {
  console.log('Requesting file permission');
  // TODO: Implement file permission request
});

saveSettingsBtn.addEventListener('click', () => {
  console.log('Saving settings');
  // TODO: Implement settings save functionality
});

resetSettingsBtn.addEventListener('click', () => {
  if (confirm('모든 설정을 기본값으로 재설정하시겠습니까?')) {
    console.log('Resetting settings');
    // TODO: Implement settings reset functionality
  }
});

// Helper functions - placeholders for future implementation
import { ExcludedDomainsList } from '../../components/ExcludedDomainsList.js';

function renderExcludedDomains(domains) {
  const listContainer = document.getElementById('excluded-domains-list');
  listContainer.innerHTML = '';
  listContainer.appendChild(
    ExcludedDomainsList({
      domains,
      onRemove: (domain) => {
        removeDomain(domain);
      },
    })
  );
}

function removeDomain(domain) {
  console.log('Removing domain:', domain);
  // TODO: Implement domain removal
}

function updateFilePermissionStatus(granted) {
  console.log('File permission status:', granted);
  // TODO: Update permission status display
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  console.log('Options DOM loaded');
  // TODO: Load current settings
  // TODO: Update UI with current settings
  // TODO: Check file permission status
});
