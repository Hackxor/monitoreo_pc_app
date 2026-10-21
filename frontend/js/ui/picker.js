import { h, uid } from './dom.js';
import { searchInput } from './form.js';

const normalize = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Lista con búsqueda para elegir un elemento (listbox accesible).
 * describe(item) → { title, meta, aside }
 */
export function createPicker({ label, placeholder, getKey, describe, searchText, isDisabled = () => false, onSelect, emptyText = 'Sin resultados.' }) {
  let items = [];
  let query = '';
  let selectedKey = null;
  const listId = uid('picker');

  const list = h('ul', { class: 'picker__list', role: 'listbox', id: listId, 'aria-label': label, tabindex: '0' });
  const search = searchInput({
    placeholder,
    label: `Buscar en ${label}`,
    onInput: (value) => {
      query = normalize(value.trim());
      render();
    },
  });
  search.input.setAttribute('aria-controls', listId);

  function visible() {
    return query ? items.filter((item) => normalize(searchText(item)).includes(query)) : items;
  }

  function choose(item) {
    if (isDisabled(item)) return;
    selectedKey = getKey(item);
    render();
    onSelect(item);
  }

  list.addEventListener('keydown', (event) => {
    const rows = visible().filter((i) => !isDisabled(i));
    if (!rows.length) return;
    const index = rows.findIndex((i) => getKey(i) === selectedKey);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown' ? Math.min(rows.length - 1, index + 1) : Math.max(0, index - 1);
      choose(rows[next]);
      list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }
  });

  function render() {
    const rows = visible();
    if (!rows.length) {
      list.replaceChildren(h('li', { class: 'picker__empty' }, items.length ? 'Ninguna coincidencia con la búsqueda.' : emptyText));
      return;
    }
    list.replaceChildren(
      ...rows.map((item) => {
        const key = getKey(item);
        const { title, meta, aside } = describe(item);
        const disabled = isDisabled(item);
        return h(
          'li',
          {
            class: 'picker__item',
            role: 'option',
            'aria-selected': String(key === selectedKey),
            'aria-disabled': disabled ? 'true' : null,
            'aria-label': [title, meta, disabled ? 'no disponible' : null].filter(Boolean).join('. '),
            onClick: () => choose(item),
          },
          h('div', { class: 'picker__main' }, h('div', { class: 'picker__title' }, title), meta ? h('div', { class: 'picker__meta' }, meta) : null),
          aside,
        );
      }),
    );
  }

  return {
    el: h('div', { class: 'picker' }, search.el, list),
    setItems(next) {
      items = next;
      if (selectedKey && !items.some((i) => getKey(i) === selectedKey && !isDisabled(i))) selectedKey = null;
      render();
    },
    clear() {
      selectedKey = null;
      render();
    },
    get selectedKey() {
      return selectedKey;
    },
    focusSearch() {
      search.input.focus();
    },
  };
}
