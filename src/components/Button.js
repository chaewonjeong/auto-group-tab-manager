export function Button({ text, onClick, className = '' }) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.className = className;
  btn.addEventListener('click', onClick);
  return btn;
}
