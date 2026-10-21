import { h, uid } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { createDataTable } from '../ui/dataTable.js';
import { emptyState, showToast, withBusy } from '../ui/feedback.js';
import { button, pageHead } from '../ui/page.js';
import { api } from '../services/api.js';
import { errorMessage } from '../services/apiError.js';
import { getUser } from '../state/session.js';
import { MONTHS, formatDate, formatDateTime, periodLabel, todayISO } from '../utils/dates.js';
import { labelEstadoEquipo, labelEstadoPrestamo, labelTipoEquipo } from '../domain/catalogs.js';
import { estadoEquipoBadge, estadoPrestamoBadge } from '../domain/badges.js';
import { createTablePdf, downloadBlob } from '../pdf/pdfTable.js';

/** Fecha de devolución que se muestra en el Reporte 2: la real si ya se devolvió, si no la prevista. */
const fechaDevolucion = (p) => (p.fechaDevolucionReal ? formatDate(p.fechaDevolucionReal) : `${formatDate(p.fechaDevolucionPrevista)} (prevista)`);

/** Definición de los tres reportes acordados con el cliente (FM-06, FM-07, FM-08). */
const REPORTS = [
  {
    id: 'disponibles',
    tab: 'Equipos disponibles',
    title: 'Reporte 1 · Equipos disponibles',
    description: 'Todos los equipos que hoy se pueden prestar.',
    usesPeriod: false,
    load: () => api.reporteDisponibles(),
    rowKey: (e) => e.clave,
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'tipo', label: 'Tipo', render: (e) => labelTipoEquipo(e.tipo), searchValue: (e) => labelTipoEquipo(e.tipo) },
      { key: 'marca', label: 'Marca' },
      { key: 'estado', label: 'Estado', render: (e) => estadoEquipoBadge(e.estado) },
    ],
    pdf: {
      orientation: 'portrait',
      columns: [
        { label: 'Nombre', width: 4 },
        { label: 'Tipo', width: 1.6 },
        { label: 'Marca', width: 1.8 },
        { label: 'Estado', width: 1.6 },
      ],
      row: (e) => [e.nombre, labelTipoEquipo(e.tipo), e.marca, labelEstadoEquipo(e.estado)],
    },
  },
  {
    id: 'prestamos',
    tab: 'Préstamos por período',
    title: 'Reporte 2 · Préstamos por período',
    description: 'Préstamos registrados en el mes o año elegido.',
    usesPeriod: true,
    load: (periodo) => api.reportePrestamos(periodo),
    rowKey: (p) => p.id,
    columns: [
      { key: 'usuarioNombre', label: 'Usuario', render: (p) => h('div', {}, p.usuarioNombre, h('div', { class: 'muted mono' }, p.numeroControl)), searchValue: (p) => `${p.usuarioNombre} ${p.numeroControl}` },
      { key: 'equipoNombre', label: 'Equipo', render: (p) => h('div', {}, p.equipoNombre, h('div', { class: 'muted mono' }, p.claveEquipo)), searchValue: (p) => `${p.equipoNombre} ${p.claveEquipo}` },
      { key: 'fechaPrestamo', label: 'Fecha de préstamo', render: (p) => h('span', { class: 'nowrap' }, formatDate(p.fechaPrestamo)) },
      { key: 'fechaDevolucion', label: 'Fecha de devolución', sortValue: (p) => p.fechaDevolucionReal || p.fechaDevolucionPrevista, render: (p) => h('span', { class: 'nowrap' }, fechaDevolucion(p)) },
      { key: 'estado', label: 'Estado', render: (p) => estadoPrestamoBadge(p.estado) },
    ],
    pdf: {
      orientation: 'landscape',
      columns: [
        { label: 'Usuario', width: 3.2 },
        { label: 'Equipo', width: 3.4 },
        { label: 'Fecha de préstamo', width: 1.6 },
        { label: 'Fecha de devolución', width: 2.2 },
        { label: 'Estado', width: 1.3 },
      ],
      row: (p) => [`${p.usuarioNombre} (${p.numeroControl})`, `${p.equipoNombre} (${p.claveEquipo})`, formatDate(p.fechaPrestamo), fechaDevolucion(p), labelEstadoPrestamo(p.estado)],
    },
  },
  {
    id: 'vencidos',
    tab: 'Préstamos vencidos',
    title: 'Reporte 3 · Préstamos vencidos',
    description: 'Préstamos cuya fecha de devolución prevista cae en el período y que no se han devuelto.',
    usesPeriod: true,
    load: (periodo) => api.reporteVencidos(periodo),
    rowKey: (p) => p.id,
    initialSort: { key: 'diasAtraso', dir: 'desc' },
    columns: [
      { key: 'usuarioNombre', label: 'Usuario', render: (p) => h('div', {}, p.usuarioNombre, h('div', { class: 'muted mono' }, p.numeroControl)), searchValue: (p) => `${p.usuarioNombre} ${p.numeroControl}` },
      { key: 'equipoNombre', label: 'Equipo', render: (p) => h('div', {}, p.equipoNombre, h('div', { class: 'muted mono' }, p.claveEquipo)), searchValue: (p) => `${p.equipoNombre} ${p.claveEquipo}` },
      { key: 'fechaPrestamo', label: 'Fecha de préstamo', render: (p) => h('span', { class: 'nowrap' }, formatDate(p.fechaPrestamo)) },
      { key: 'fechaDevolucionPrevista', label: 'Devolución prevista', render: (p) => h('span', { class: 'nowrap' }, formatDate(p.fechaDevolucionPrevista)) },
      { key: 'diasAtraso', label: 'Días de atraso', className: 'num', render: (p) => h('strong', { style: { color: 'var(--danger)' } }, p.diasAtraso) },
    ],
    pdf: {
      orientation: 'landscape',
      columns: [
        { label: 'Usuario', width: 3.2 },
        { label: 'Equipo', width: 3.4 },
        { label: 'Fecha de préstamo', width: 1.6 },
        { label: 'Devolución prevista', width: 1.7 },
        { label: 'Días de atraso', width: 1.3, align: 'right' },
      ],
      row: (p) => [`${p.usuarioNombre} (${p.numeroControl})`, `${p.equipoNombre} (${p.claveEquipo})`, formatDate(p.fechaPrestamo), formatDate(p.fechaDevolucionPrevista), String(p.diasAtraso)],
    },
  },
];

function periodControl(onChange) {
  const now = new Date();
  const state = { tipo: 'mes', anio: now.getFullYear(), mes: now.getMonth() + 1 };

  const mesBtn = h('button', { type: 'button', 'aria-pressed': 'true' }, 'Mensual');
  const anioBtn = h('button', { type: 'button', 'aria-pressed': 'false' }, 'Anual');
  const mes = h('select', { class: 'select', 'aria-label': 'Mes', style: { width: 'auto' } }, MONTHS.map((m, i) => h('option', { value: i + 1 }, m)));
  mes.value = String(state.mes);
  const anio = h('input', { class: 'input', type: 'number', min: '2000', max: '2100', step: '1', 'aria-label': 'Año', value: String(state.anio), style: { width: '100px' } });

  function setTipo(tipo) {
    state.tipo = tipo;
    mesBtn.setAttribute('aria-pressed', String(tipo === 'mes'));
    anioBtn.setAttribute('aria-pressed', String(tipo === 'anio'));
    mes.hidden = tipo !== 'mes';
    onChange();
  }
  mesBtn.addEventListener('click', () => setTipo('mes'));
  anioBtn.addEventListener('click', () => setTipo('anio'));
  mes.addEventListener('change', () => {
    state.mes = Number(mes.value);
    onChange();
  });
  anio.addEventListener('change', () => {
    state.anio = Number(anio.value);
    onChange();
  });

  return {
    el: h('div', { class: 'row' }, h('span', { class: 'field__label' }, 'Período'), h('div', { class: 'segmented', role: 'group', 'aria-label': 'Tipo de período' }, mesBtn, anioBtn), mes, anio),
    get value() {
      return state.tipo === 'mes' ? { tipo: 'mes', anio: state.anio, mes: state.mes } : { tipo: 'anio', anio: state.anio };
    },
    isValid: () => Number.isInteger(state.anio) && state.anio >= 2000 && state.anio <= 2100,
  };
}

/** V-07 · Reportes (UC-09, RF-11). Solo Administrador. */
export function renderReportes({ container }) {
  const panel = h('div', { class: 'stack' });
  const tabs = REPORTS.map((report, index) => {
    const tab = h('button', { class: 'tab', role: 'tab', type: 'button', id: uid('tab'), 'aria-selected': String(index === 0), onClick: () => select(index) }, icon('report', { size: 16 }), report.tab);
    tab.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const next = (index + (event.key === 'ArrowRight' ? 1 : REPORTS.length - 1)) % REPORTS.length;
        select(next);
        tabs[next].focus();
      }
    });
    return tab;
  });

  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      pageHead({ title: 'Reportes', description: 'Genera los reportes y expórtalos a PDF.' }),
      h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Reportes' }, tabs),
      h('div', { role: 'tabpanel' }, panel),
    ),
  );

  function select(index) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    panel.parentElement.setAttribute('aria-labelledby', tabs[index].id);
    renderReport(REPORTS[index]);
  }

  function renderReport(report) {
    let data = null;
    let generatedFor = null;

    const table = createDataTable({
      rowKey: report.rowKey,
      columns: report.columns,
      pageSize: 15,
      initialSort: report.initialSort || null,
      searchPlaceholder: 'Filtrar resultados en pantalla…',
      emptyTitle: report.usesPeriod ? 'Sin registros para el período' : 'No hay equipos disponibles',
      emptyText: report.usesPeriod ? 'No hay préstamos que cumplan las condiciones en el período elegido.' : 'Todos los equipos están prestados, en mantenimiento o dados de baja.',
    });

    const period = report.usesPeriod ? periodControl(() => (exportBtn.disabled = true)) : null;
    const generateBtn = button(report.usesPeriod ? 'Generar' : 'Actualizar', { variant: report.usesPeriod ? 'primary' : 'secondary', iconName: report.usesPeriod ? 'report' : 'refresh', onClick: generate });
    const exportBtn = button('Exportar PDF', { variant: report.usesPeriod ? 'secondary' : 'primary', iconName: 'download', disabled: true, onClick: exportPdf });
    const info = h('p', { class: 'muted', 'aria-live': 'polite' });

    panel.replaceChildren(
      h(
        'div',
        { class: 'card card__body stack' },
        h('div', {}, h('h2', { class: 'card__title' }, report.title), h('p', { class: 'muted' }, report.description)),
        h('div', { class: 'row', style: { justifyContent: 'space-between' } }, period ? period.el : h('span'), h('div', { class: 'row' }, generateBtn, exportBtn)),
        info,
      ),
      table.el,
    );

    async function generate() {
      if (period && !period.isValid()) {
        showToast('Escribe un año válido (2000 a 2100).', 'warning');
        return;
      }
      const periodo = period?.value;
      exportBtn.disabled = true;
      table.setLoading('Generando reporte…');
      try {
        data = await withBusy(generateBtn, () => report.load(periodo), 'Generando…');
        generatedFor = periodo;
        table.setRows(data);
        info.textContent = `${periodo ? `${periodLabel(periodo)} · ` : ''}${data.length} registro(s) · generado el ${formatDateTime(new Date())}`;
        exportBtn.disabled = false;
      } catch (error) {
        data = null;
        info.textContent = '';
        table.setError(error, generate);
        showToast(errorMessage(error), 'error');
      }
    }

    function exportPdf() {
      if (!data) return;
      const user = getUser();
      const subtitle = [
        'Sistema de Préstamo de Equipo de Cómputo',
        generatedFor ? `Período: ${periodLabel(generatedFor)}` : `Al ${formatDate(todayISO())}`,
        `Generado el ${formatDateTime(new Date())} por ${user.nombre} (${user.numeroControl})`,
      ];
      const blob = createTablePdf({
        title: report.title,
        subtitle,
        orientation: report.pdf.orientation,
        columns: report.pdf.columns,
        rows: data.map(report.pdf.row),
        footer: 'Sistema de Préstamo de Equipo de Cómputo · Documento generado automáticamente',
        emptyText: 'Sin registros para el período seleccionado.',
      });
      const suffix = generatedFor ? (generatedFor.tipo === 'mes' ? `${generatedFor.anio}-${String(generatedFor.mes).padStart(2, '0')}` : String(generatedFor.anio)) : todayISO();
      downloadBlob(blob, `reporte-${report.id}-${suffix}.pdf`);
      showToast('PDF generado. Revisa tu carpeta de descargas.');
    }

    if (!report.usesPeriod) generate();
    else table.showState(emptyState({ iconName: 'calendar', title: 'Elige un período', text: 'Selecciona si el reporte es mensual o anual y pulsa "Generar".' }));
  }

  select(0);
}
