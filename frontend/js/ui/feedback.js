import { h } from './dom.js';
import { icon } from './icons.js';

const TOAST_ICONS = { success: 'checkCircle', error: 'alertCircle', warning: 'alert', info: 'info' };

let toastRegion;

function ensureToastRegion() {
  if (!toastRegion) {
    toastRegion = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastRegion);
  }
  return toastRegion;
}

/** Notificación temporal en la esquina inferior. */
export function showToast(message, type = 'success', timeoutMs = 4500) {
  const region = ensureToastRegion();
  const toast = h(
    'div',
    { class: `toast toast--${type}` },
    icon(TOAST_ICONS[type] || 'info'),
    h('div', { class: 'toast__msg' }, message),
    h('button', { class: 'btn btn--ghost btn--icon btn--sm', type: 'button', 'aria-label': 'Cerrar aviso', onClick: () => toast.remove() }, icon('x', { size: 16 })),
  );
  region.append(toast);
  if (timeoutMs) setTimeout(() => toast.remove(), timeoutMs);
}

/** Aviso fijo dentro de la página. */
export function alertBox(type, title, text) {
  const icons = { danger: 'alertCircle', warning: 'alert', info: 'info', success: 'checkCircle' };
  return h(
    'div',
    { class: `alert alert--${type}`, role: type === 'danger' ? 'alert' : null },
    icon(icons[type] || 'info'),
    h('div', {}, title && h('div', { class: 'alert__title' }, title), text && h('div', {}, text)),
  );
}

export function badge(label, tone = 'neutral', { plain = false } = {}) {
  return h('span', { class: `badge tone-${tone}${plain ? ' badge--plain' : ''}` }, label);
}

export function loadingState(text = 'Cargando…') {
  return h('div', { class: 'state', role: 'status' }, h('div', { class: 'spinner' }), h('div', {}, text));
}

export function emptyState({ iconName = 'box', title, text, action } = {}) {
  return h(
    'div',
    { class: 'state' },
    h('div', { class: 'state__icon' }, icon(iconName, { size: 22 })),
    title && h('div', { class: 'state__title' }, title),
    text && h('div', {}, text),
    action,
  );
}

export function errorState(error, onRetry) {
  return h(
    'div',
    { class: 'state', role: 'alert' },
    h('div', { class: 'state__icon tone-danger' }, icon('alertCircle', { size: 22 })),
    h('div', { class: 'state__title' }, 'No se pudo cargar la información'),
    h('div', {}, error?.message || 'Ocurrió un error inesperado.'),
    onRetry &&
      h('button', { class: 'btn btn--secondary', type: 'button', onClick: onRetry }, icon('refresh'), 'Reintentar'),
  );
}

/** Pone un botón en estado "procesando" mientras se resuelve `task`. */
export async function withBusy(button, task, busyLabel = 'Procesando…') {
  const original = [...button.childNodes];
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.replaceChildren(h('span', { class: 'btn__spinner', 'aria-hidden': 'true' }), busyLabel);
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.replaceChildren(...original);
  }
}
