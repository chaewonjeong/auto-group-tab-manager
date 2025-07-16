// Onboarding JavaScript - Placeholder for future implementation
console.log('Tab Group Manager - Onboarding loaded');

// DOM elements
const applyExistingRadio = document.getElementById('apply-existing');
const newTabsOnlyRadio = document.getElementById('new-tabs-only');
const getStartedBtn = document.getElementById('get-started-btn');

// Event listeners - placeholders for future implementation
applyExistingRadio.addEventListener('change', () => {
  if (applyExistingRadio.checked) {
    console.log('Selected: Apply to existing tabs');
    // TODO: Store user preference
  }
});

newTabsOnlyRadio.addEventListener('change', () => {
  if (newTabsOnlyRadio.checked) {
    console.log('Selected: New tabs only');
    // TODO: Store user preference
  }
});

getStartedBtn.addEventListener('click', async () => {
  console.log('Get Started clicked');

  const applyToExisting = applyExistingRadio.checked;
  console.log('Apply to existing tabs:', applyToExisting);

  // TODO: Implement onboarding completion logic
  // - Save user preferences
  // - Apply grouping to existing tabs if selected
  // - Mark onboarding as completed
  // - Close onboarding page or redirect to main extension

  // Placeholder: Close the onboarding page
  window.close();
});

// Initialize onboarding
document.addEventListener('DOMContentLoaded', () => {
  console.log('Onboarding DOM loaded');
  // TODO: Check if onboarding was already completed
  // TODO: Load any saved preferences
});
