/**
 * Menu - main menu and game selection UI.
 */

export type GameEntry = {
  id: string;
  name: string;
  start: (mount: HTMLElement) => () => void;
};

export function renderMenu(
  container: HTMLElement,
  games: GameEntry[],
  onSelect: (game: GameEntry) => void
): void {
  container.innerHTML = '';
  container.style.cssText = `
    font-family: system-ui, sans-serif;
    padding: 2rem;
    max-width: 480px;
    margin: 0 auto;
    color: #e2e8f0;
    background: #0f172a;
    min-height: 100vh;
    box-sizing: border-box;
  `;

  const title = document.createElement('h1');
  title.textContent = 'Mini Roblox';
  title.style.cssText = 'margin: 0 0 1.5rem; font-size: 2rem; color: #f8fafc;';
  container.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Pick a game to play';
  subtitle.style.cssText = 'margin: 0 0 1.5rem; color: #94a3b8;';
  container.appendChild(subtitle);

  const list = document.createElement('div');
  list.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';

  for (const game of games) {
    const btn = document.createElement('button');
    btn.textContent = game.name;
    btn.style.cssText = `
      padding: 0.75rem 1.25rem;
      font-size: 1rem;
      cursor: pointer;
      background: #334155;
      color: #f1f5f9;
      border: none;
      border-radius: 8px;
      text-align: left;
      transition: background 0.15s;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#475569';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#334155';
    });
    btn.addEventListener('click', () => onSelect(game));
    list.appendChild(btn);
  }

  container.appendChild(list);
}

export function renderBackButton(container: HTMLElement, label: string, onClick: () => void): void {
  const wrap = container.querySelector('.menu-actions') ?? (() => {
    const div = document.createElement('div');
    div.className = 'menu-actions';
    div.style.cssText = 'margin-top: 1rem;';
    container.appendChild(div);
    return div;
  })();
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = `
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    cursor: pointer;
    background: #475569;
    color: #f1f5f9;
    border: none;
    border-radius: 6px;
  `;
  btn.addEventListener('click', onClick);
  wrap.appendChild(btn);
}
