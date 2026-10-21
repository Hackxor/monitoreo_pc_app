import { h, clear } from './dom.js';
import { icon } from './icons.js';
import { searchInput, filterSelect } from './form.js';
import { emptyState, errorState, loadingState } from './feedback.js';

const normalize = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Tabla con búsqueda, filtros, orden, paginación y selección del lado del cliente.
 *
 * columns: [{ key, label, render?(row), sortValue?(row), searchValue?(row), sortable?, className? }]
 * filters: [{ label, options, allLabel?, value?, predicate(row, value) }]
 */
export function createDataTable({
  columns,
  rowKey,
  searchPlaceholder = 'Buscar…',
  searchable = true,
  filters = [],
  toolbarExtra = [],
  pageSize = 10,
  selectable = false,
  isSelectable = () => true,
  onSelectionChange,
  rowClass,
  onRowClick,
  emptyTitle = 'Sin registros',
  emptyText = 'Todavía no hay información para mostrar.',
  initialSort = null,
}) {
  let rows = [];
  let query = '';
  let page = 1;
  let sort = initialSort;
  const filterValues = filters.map((f) => f.value ?? '');
  const selected = new Set();

  const body = h('div', { class: 'table-body' });
  const foot = h('div', { class: 'table-foot' });

  const toolbarItems = [];
  if (searchable) {
    toolbarItems.push(
      searchInput({
        placeholder: searchPlaceholder,
        onInput: (value) => {
          query = normalize(value.trim());
          page = 1;
          render();
        },
      }).el,
    );
  }
  filters.forEach((filter, index) => {
    toolbarItems.push(
      filterSelect({
        label: filter.label,
        options: filter.options,
        allLabel: filter.allLabel || `${filter.label}: todos`,
        value: filterValues[index],
        onChange: (value) => {
          filterValues[index] = value;
          page = 1;
          render();
        },
      }),
    );
  });
  if (toolbarExtra.length) toolbarItems.push(h('div', { class: 'table-toolbar__extra' }, toolbarExtra));

  const el = h(
    'div',
    { class: 'card' },
    toolbarItems.length ? h('div', { class: 'table-toolbar' }, toolbarItems) : null,
    body,
    foot,
  );

  function searchText(row) {
    return normalize(
      columns
        .map((col) => (col.searchValue ? col.searchValue(row) : typeof row[col.key] === 'object' ? '' : row[col.key]))
        .join(' '),
    );
  }

  function visibleRows() {
    let result = rows.filter((row) => filters.every((filter, i) => !filterValues[i] || filter.predicate(row, filterValues[i])));
    if (query) result = result.filter((row) => searchText(row).includes(query));
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      const value = (row) => (col.sortValue ? col.sortValue(row) : row[col.key]);
      result = [...result].sort((a, b) => {
        const va = value(a);
        const vb = value(b);
        const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : normalize(va).localeCompare(normalize(vb), 'es', { numeric: true });
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }

  function emitSelection() {
    onSelectionChange?.(rows.filter((row) => selected.has(rowKey(row))));
  }

  function headerCell(col) {
    if (col.sortable === false) return h('th', { scope: 'col', class: col.className }, col.label);
    const active = sort?.key === col.key;
    const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    return h(
      'th',
      { scope: 'col', class: col.className, 'aria-sort': ariaSort },
      h(
        'button',
        {
          class: 'table__sort',
          type: 'button',
          onClick: () => {
            sort = { key: col.key, dir: active && sort.dir === 'asc' ? 'desc' : 'asc' };
            render();
          },
        },
        col.label,
        icon(active ? (sort.dir === 'asc' ? 'sortUp' : 'sortDown') : 'sort', { size: 14 }),
      ),
    );
  }

  function render() {
    const all = visibleRows();
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    page = Math.min(page, pages);
    const pageRows = all.slice((page - 1) * pageSize, page * pageSize);

    clear(body);
    clear(foot);

    if (!all.length) {
      const filtered = rows.length > 0;
      body.append(
        emptyState({
          iconName: filtered ? 'search' : 'box',
          title: filtered ? 'Sin coincidencias' : emptyTitle,
          text: filtered ? 'Ningún registro coincide con la búsqueda o los filtros.' : emptyText,
        }),
      );
      foot.hidden = true;
      return;
    }
    foot.hidden = false;

    const selectableOnPage = pageRows.filter(isSelectable);
    const allOnPageSelected = selectableOnPage.length > 0 && selectableOnPage.every((r) => selected.has(rowKey(r)));

    const thead = h(
      'thead',
      {},
      h(
        'tr',
        {},
        selectable
          ? h(
              'th',
              { class: 'table__check', scope: 'col' },
              h('input', {
                type: 'checkbox',
                'aria-label': 'Seleccionar todos los de esta página',
                checked: allOnPageSelected,
                disabled: !selectableOnPage.length,
                onChange: (e) => {
                  selectableOnPage.forEach((r) => (e.target.checked ? selected.add(rowKey(r)) : selected.delete(rowKey(r))));
                  emitSelection();
                  render();
                },
              }),
            )
          : null,
        columns.map(headerCell),
      ),
    );

    const tbody = h(
      'tbody',
      {},
      pageRows.map((row) => {
        const key = rowKey(row);
        const isSelected = selected.has(key);
        const classes = [rowClass?.(row), isSelected ? 'row--selected' : '', onRowClick ? 'row--clickable' : ''].filter(Boolean).join(' ');
        const tr = h(
          'tr',
          { class: classes || null },
          selectable
            ? h(
                'td',
                { class: 'table__check' },
                h('input', {
                  type: 'checkbox',
                  'aria-label': 'Seleccionar fila',
                  checked: isSelected,
                  disabled: !isSelectable(row),
                  onClick: (e) => e.stopPropagation(),
                  onChange: (e) => {
                    if (e.target.checked) selected.add(key);
                    else selected.delete(key);
                    emitSelection();
                    render();
                  },
                }),
              )
            : null,
          columns.map((col) => h('td', { class: col.className }, col.render ? col.render(row) : row[col.key] ?? '—')),
        );
        if (onRowClick) tr.addEventListener('click', (e) => {
          if (!e.target.closest('button, a, input')) onRowClick(row);
        });
        return tr;
      }),
    );

    body.append(h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, thead, tbody)));

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, all.length);
    foot.append(
      h('span', {}, `Mostrando ${from}–${to} de ${all.length}${selected.size ? ` · ${selected.size} seleccionado(s)` : ''}`),
      pages > 1
        ? h(
            'div',
            { class: 'pager' },
            h('button', { class: 'btn btn--secondary btn--sm', type: 'button', disabled: page === 1, 'aria-label': 'Página anterior', onClick: () => { page -= 1; render(); } }, icon('chevronLeft', { size: 16 })),
            h('span', {}, `Página ${page} de ${pages}`),
            h('button', { class: 'btn btn--secondary btn--sm', type: 'button', disabled: page === pages, 'aria-label': 'Página siguiente', onClick: () => { page += 1; render(); } }, icon('chevronRight', { size: 16 })),
          )
        : null,
    );
  }

  return {
    el,
    setRows(next) {
      rows = next;
      const keys = new Set(rows.map(rowKey));
      [...selected].forEach((key) => !keys.has(key) && selected.delete(key));
      render();
    },
    setLoading(text) {
      clear(body).append(loadingState(text));
      foot.hidden = true;
    },
    showState(node) {
      clear(body).append(node);
      foot.hidden = true;
    },
    setError(error, onRetry) {
      clear(body).append(errorState(error, onRetry));
      foot.hidden = true;
    },
    getSelected: () => rows.filter((row) => selected.has(rowKey(row))),
    clearSelection() {
      selected.clear();
      emitSelection();
      render();
    },
  };
}
