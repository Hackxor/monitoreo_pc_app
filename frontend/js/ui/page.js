import { h } from './dom.js';
import { icon } from './icons.js';

export function pageHead({ title, description, actions = [] }) {
  return h(
    'div',
    { class: 'page-head' },
    h('div', {}, h('h1', { class: 'page-head__title' }, title), description && h('p', { class: 'page-head__desc' }, description)),
    actions.length ? h('div', { class: 'page-head__actions' }, actions) : null,
  );
}

export function button(label, { variant = 'secondary', iconName, size, onClick, type = 'button', disabled, title, ariaLabel } = {}) {
  return h(
    'button',
    {
      class: `btn btn--${variant}${size ? ` btn--${size}` : ''}${!label ? ' btn--icon' : ''}`,
      type,
      disabled,
      title,
      'aria-label': ariaLabel || (!label ? title : null),
      onClick,
    },
    iconName ? icon(iconName, { size: size === 'sm' ? 16 : 18 }) : null,
    label,
  );
}

export function card({ title, iconName, actions = [], body, flush = false }) {
  return h(
    'section',
    { class: 'card' },
    title &&
      h(
        'div',
        { class: 'card__head' },
        h('h2', { class: 'card__title' }, iconName ? icon(iconName) : null, title),
        actions.length ? h('div', { class: 'row' }, actions) : null,
      ),
    h('div', { class: `card__body${flush ? ' card__body--flush' : ''}` }, body),
  );
}
