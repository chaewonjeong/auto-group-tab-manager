export function Modal({ content, onClose, className = '' }) {
  const modal = document.createElement('div');
  modal.className = `modal ${className}`;
  modal.innerHTML = content;
  modal.addEventListener('click', (e) => {
    if (e.target === modal && onClose) onClose();
  });
  return modal;
}
