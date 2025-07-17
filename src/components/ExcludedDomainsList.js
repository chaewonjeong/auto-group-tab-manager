export function ExcludedDomainsList({ domains, onRemove }) {
  const ul = document.createElement('ul');
  domains.forEach((domain) => {
    const li = document.createElement('li');
    li.textContent = domain;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '삭제';
    removeBtn.onclick = () => onRemove(domain);
    li.appendChild(removeBtn);
    ul.appendChild(li);
  });
  return ul;
}
