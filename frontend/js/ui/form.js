import { h, uid } from './dom.js';
import { icon } from './icons.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9][0-9 ()+-]{6,19}$/;

/**
 * @typedef {Object} FieldSpec
 * @property {string} name
 * @property {string} label
 * @property {'text'|'email'|'tel'|'password'|'date'|'number'|'select'|'textarea'|'radio'} [type]
 * @property {boolean} [required]
 * @property {{value: string, label: string}[]} [options]
 * @property {string} [placeholder]
 * @property {string} [hint]
 * @property {boolean} [readonly]
 * @property {boolean} [disabled]
 * @property {boolean} [full] ocupa las dos columnas
 * @property {number} [maxLength]
 * @property {string} [autocomplete]
 * @property {string} [min]
 * @property {string} [max]
 * @property {(value: string, values: Object) => string|null} [validate]
 */

function buildControl(spec, id, describedBy) {
  const common = {
    id,
    name: spec.name,
    required: spec.required,
    readonly: spec.readonly,
    disabled: spec.disabled,
    placeholder: spec.placeholder,
    maxlength: spec.maxLength,
    autocomplete: spec.autocomplete || 'off',
    'aria-describedby': describedBy,
  };
  if (spec.type === 'select') {
    return h(
      'select',
      { ...common, class: 'select' },
      spec.placeholder !== undefined ? h('option', { value: '' }, spec.placeholder || 'Selecciona…') : null,
      spec.options.map((opt) => h('option', { value: opt.value }, opt.label)),
    );
  }
  if (spec.type === 'textarea') {
    return h('textarea', { ...common, class: 'textarea', rows: 3 });
  }
  if (spec.type === 'radio') {
    return h(
      'div',
      { class: 'radio-group', role: 'radiogroup', id, 'aria-describedby': describedBy },
      spec.options.map((opt) =>
        h(
          'label',
          { class: 'radio-card' },
          // Nombre único por instancia para que dos formularios en la misma página no compartan el grupo.
          h('input', { type: 'radio', name: `${spec.name}-${id}`, value: opt.value, disabled: spec.disabled }),
          opt.label,
        ),
      ),
    );
  }
  return h('input', { ...common, class: 'input', type: spec.type || 'text', min: spec.min, max: spec.max });
}

/** Construye un formulario con validación en el cliente. */
export function createForm(specs, { values = {} } = {}) {
  const fields = new Map();
  const grid = h('div', { class: 'form-grid' });

  for (const spec of specs) {
    const id = uid(`f-${spec.name}`);
    const hintId = spec.hint ? `${id}-hint` : null;
    const errorId = `${id}-error`;
    const control = buildControl(spec, id, [hintId, errorId].filter(Boolean).join(' '));
    const error = h('div', { class: 'field__error', id: errorId });
    const wrapper = h(
      'div',
      { class: `field${spec.full || spec.type === 'textarea' ? ' field--full' : ''}` },
      h(
        spec.type === 'radio' ? 'span' : 'label',
        { class: 'field__label', for: spec.type === 'radio' ? null : id },
        spec.label,
        spec.required ? h('span', { class: 'field__req', 'aria-hidden': 'true' }, '*') : null,
      ),
      control,
      spec.hint ? h('div', { class: 'field__hint', id: hintId }, spec.hint) : null,
      error,
    );
    grid.append(wrapper);
    fields.set(spec.name, { spec, control, error, wrapper });

    const clearOwnError = () => setError(spec.name, null);
    control.addEventListener('input', clearOwnError);
    control.addEventListener('change', clearOwnError);
  }

  function getValue(name) {
    const { spec, control } = fields.get(name);
    if (spec.type === 'radio') return control.querySelector('input:checked')?.value ?? '';
    return spec.type === 'password' ? control.value : control.value.trim();
  }

  function setValue(name, value) {
    const field = fields.get(name);
    if (!field) return;
    if (field.spec.type === 'radio') {
      field.control.querySelectorAll('input').forEach((input) => {
        input.checked = input.value === value;
      });
    } else {
      field.control.value = value ?? '';
    }
  }

  function setError(name, message) {
    const field = fields.get(name);
    if (!field) return;
    if (message) {
      field.control.setAttribute('aria-invalid', 'true');
      field.error.replaceChildren(icon('alertCircle', { size: 14 }), message);
    } else {
      field.control.removeAttribute('aria-invalid');
      field.error.replaceChildren();
    }
  }

  function getValues() {
    const result = {};
    for (const name of fields.keys()) result[name] = getValue(name);
    return result;
  }

  function validateField(spec, value, all) {
    if (spec.disabled || spec.readonly) return null;
    if (spec.required && !value) return 'Este campo es obligatorio.';
    if (value && spec.type === 'email' && !EMAIL_RE.test(value)) return 'Escribe un correo válido, por ejemplo nombre@dominio.mx.';
    if (value && spec.type === 'tel' && !PHONE_RE.test(value)) return 'Escribe un teléfono válido (solo números, de 7 a 20 caracteres).';
    // Las reglas propias se evalúan también con el campo vacío (p. ej. observaciones obligatorias según otro campo).
    return spec.validate ? spec.validate(value, all) : null;
  }

  /** Valida todo el formulario, muestra los errores y enfoca el primero. */
  function validate() {
    const all = getValues();
    let firstInvalid = null;
    for (const [name, { spec, control }] of fields) {
      const message = validateField(spec, all[name], all);
      setError(name, message);
      if (message && !firstInvalid) firstInvalid = spec.type === 'radio' ? control.querySelector('input') : control;
    }
    firstInvalid?.focus();
    return !firstInvalid;
  }

  /** Muestra errores devueltos por el servidor, p. ej. { clave: 'Ya existe' }. */
  function setErrors(errors = {}) {
    for (const [name, message] of Object.entries(errors)) setError(name, message);
  }

  for (const [name, value] of Object.entries(values)) setValue(name, value);

  return {
    el: grid,
    getValues,
    getValue,
    setValue,
    setError,
    setErrors,
    validate,
    control: (name) => fields.get(name)?.control,
    field: (name) => fields.get(name)?.wrapper,
  };
}

/** Caja de búsqueda con ícono. */
export function searchInput({ placeholder = 'Buscar…', label = 'Buscar', onInput }) {
  const input = h('input', { class: 'input', type: 'search', placeholder, 'aria-label': label });
  input.addEventListener('input', () => onInput(input.value));
  return { el: h('div', { class: 'search' }, icon('search', { size: 16 }), input), input };
}

/** Lista desplegable sencilla para filtros. */
export function filterSelect({ label, options, allLabel = 'Todos', onChange, value = '' }) {
  const select = h(
    'select',
    { class: 'select', 'aria-label': label },
    h('option', { value: '' }, allLabel),
    options.map((opt) => h('option', { value: opt.value }, opt.label)),
  );
  select.value = value;
  select.addEventListener('change', () => onChange(select.value));
  return select;
}
