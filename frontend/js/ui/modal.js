import { h, uid } from './dom.js';
import { icon } from './icons.js';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;
export function isModalOpen() {
  return openCount > 0;
}

/**
 * Abre una ventana modal accesible.
 * @param {{ title: string, content: Node, footer?: Node[], size?: 'lg', onClose?: () => void, dismissible?: boolean }} options
 * @returns {{ close: () => void, body: HTMLElement }}
 */
export function openModal({ title, content, footer = [], size, onClose, dismissible = true }) {
  const previousFocus = document.activeElement;
  const titleId = uid('modal-title');

  const body = h('div', { class: 'modal__body' }, content);
  const dialog = h(
    'div',
    { class: `modal${size ? ` modal--${size}` : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h(
      'div',
      { class: 'modal__head' },
      h('h2', { class: 'modal__title', id: titleId }, title),
      h('button', { class: 'btn btn--ghost btn--icon', type: 'button', 'aria-label': 'Cerrar', onClick: () => close() }, icon('x')),
    ),
    body,
    footer.length ? h('div', { class: 'modal__foot' }, footer) : null,
  );
  const backdrop = h('div', { class: 'modal-backdrop' }, dialog);

  function onKeydown(event) {
    if (event.key === 'Escape' && dismissible) {
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      const items = [...dialog.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    openCount -= 1;
    backdrop.remove();
    document.removeEventListener('keydown', onKeydown, true);
    previousFocus?.focus?.();
    onClose?.();
  }

  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop && dismissible) close();
  });
  document.addEventListener('keydown', onKeydown, true);
  document.body.append(backdrop);
  openCount += 1;

  const autofocus = dialog.querySelector('[autofocus]') || body.querySelector(FOCUSABLE) || dialog.querySelector(FOCUSABLE);
  autofocus?.focus();

  return { close, body };
}

/** Confirmación antes de acciones importantes. Resuelve `true` si se acepta. */
export function confirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    const confirmBtn = h(
      'button',
      {
        class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`,
        type: 'button',
        onClick: () => {
          result = true;
          modal.close();
        },
      },
      confirmLabel,
    );
    const modal = openModal({
      title,
      content: h('p', {}, message),
      footer: [h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => modal.close() }, 'Cancelar'), confirmBtn],
      onClose: () => resolve(result),
    });
    confirmBtn.focus();
  });
}
