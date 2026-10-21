/**
 * DATOS SIMULADOS — solo para desarrollar y demostrar la interfaz sin back end.
 * No representan información real de la institución.
 *
 * Cuentas de demostración (solo existen en el modo simulado):
 *   Administrador  ADM-001   / admin123
 *   Alumno         20230145  / alumno123   (tiene un préstamo vencido → bloqueado)
 *   Docente        DOC-017   / docente123
 *
 * Las fechas se generan relativas al día de hoy para que siempre existan
 * préstamos vigentes, vencidos y devueltos.
 */
import { addDays, todayISO } from '../../utils/dates.js';

export function buildSeed() {
  const today = todayISO();
  const d = (offset) => addDays(today, offset);

  const usuarios = [
    { numeroControl: 'ADM-001', nombre: 'Laura Méndez Ortiz', correo: 'laura.mendez@institucion.edu.mx', telefono: '4421234567', tipo: 'ADMINISTRADOR', activo: true, password: 'admin123' },
    { numeroControl: 'ADM-002', nombre: 'Ricardo Salinas Vega', correo: 'ricardo.salinas@institucion.edu.mx', telefono: '4429876543', tipo: 'ADMINISTRADOR', activo: true, password: 'admin123' },
    { numeroControl: '20230145', nombre: 'Daniela Torres Ruiz', correo: 'daniela.torres@alumnos.edu.mx', telefono: '4425550101', tipo: 'ALUMNO', activo: true, password: 'alumno123' },
    { numeroControl: '20230211', nombre: 'Kevin Ramírez Luna', correo: 'kevin.ramirez@alumnos.edu.mx', telefono: '4425550102', tipo: 'ALUMNO', activo: true, password: 'alumno123' },
    { numeroControl: '20220378', nombre: 'Sofía Herrera Campos', correo: 'sofia.herrera@alumnos.edu.mx', telefono: '4425550103', tipo: 'ALUMNO', activo: true, password: 'alumno123' },
    { numeroControl: '20240019', nombre: 'Emilio Castro Navarro', correo: 'emilio.castro@alumnos.edu.mx', telefono: '4425550104', tipo: 'ALUMNO', activo: true, password: 'alumno123' },
    { numeroControl: '20210456', nombre: 'Valeria Gómez Ibarra', correo: 'valeria.gomez@alumnos.edu.mx', telefono: '4425550105', tipo: 'ALUMNO', activo: false, password: 'alumno123' },
    { numeroControl: 'DOC-017', nombre: 'Héctor Aguilar Robles', correo: 'hector.aguilar@institucion.edu.mx', telefono: '4425550201', tipo: 'DOCENTE', activo: true, password: 'docente123' },
    { numeroControl: 'DOC-024', nombre: 'Patricia Núñez Delgado', correo: 'patricia.nunez@institucion.edu.mx', telefono: '4425550202', tipo: 'DOCENTE', activo: true, password: 'docente123' },
  ];

  const equipos = [
    { clave: 'LAP-001', nombre: 'Laptop Dell Latitude 5440', tipo: 'LAPTOP', marca: 'Dell', modelo: 'Latitude 5440', numeroSerie: 'DL5440-8H2K91', estado: 'DISPONIBLE' },
    { clave: 'LAP-002', nombre: 'Laptop Dell Latitude 5440', tipo: 'LAPTOP', marca: 'Dell', modelo: 'Latitude 5440', numeroSerie: 'DL5440-8H2K92', estado: 'PRESTAMO' },
    { clave: 'LAP-003', nombre: 'Laptop Lenovo ThinkPad E14', tipo: 'LAPTOP', marca: 'Lenovo', modelo: 'ThinkPad E14 Gen 5', numeroSerie: 'LNV-E14-55021', estado: 'PRESTAMO' },
    { clave: 'LAP-004', nombre: 'Laptop HP ProBook 440', tipo: 'LAPTOP', marca: 'HP', modelo: 'ProBook 440 G10', numeroSerie: 'HP440-5CD3341', estado: 'MANTENIMIENTO' },
    { clave: 'LAP-005', nombre: 'Laptop Lenovo ThinkPad E14', tipo: 'LAPTOP', marca: 'Lenovo', modelo: 'ThinkPad E14 Gen 5', numeroSerie: 'LNV-E14-55022', estado: 'DISPONIBLE' },
    { clave: 'MON-001', nombre: 'Monitor 24" Full HD', tipo: 'MONITOR', marca: 'Samsung', modelo: 'S24C310', numeroSerie: 'SMS24-0091AB', estado: 'DISPONIBLE' },
    { clave: 'MON-002', nombre: 'Monitor 27" QHD', tipo: 'MONITOR', marca: 'LG', modelo: '27QN600', numeroSerie: 'LG27-77310Q', estado: 'PRESTAMO' },
    { clave: 'MON-003', nombre: 'Monitor 22" Full HD', tipo: 'MONITOR', marca: 'Acer', modelo: 'V226HQL', numeroSerie: 'ACR22-11092', estado: 'BAJA' },
    { clave: 'BOC-001', nombre: 'Bocina Bluetooth portátil', tipo: 'BOCINA', marca: 'JBL', modelo: 'Flip 6', numeroSerie: 'JBLF6-339201', estado: 'DISPONIBLE' },
    { clave: 'BOC-002', nombre: 'Bocinas de escritorio', tipo: 'BOCINA', marca: 'Logitech', modelo: 'Z207', numeroSerie: 'LGZ207-88123', estado: 'DISPONIBLE' },
    { clave: 'TAB-001', nombre: 'Tablet 10.9"', tipo: 'TABLET', marca: 'Apple', modelo: 'iPad 10a gen', numeroSerie: 'DMPXK2-10931', estado: 'PRESTAMO' },
    { clave: 'TAB-002', nombre: 'Tablet 11"', tipo: 'TABLET', marca: 'Samsung', modelo: 'Galaxy Tab S9 FE', numeroSerie: 'SMX510-44020', estado: 'DISPONIBLE' },
    { clave: 'ADP-001', nombre: 'Adaptador USB-C a HDMI', tipo: 'ADAPTADOR', marca: 'Ugreen', modelo: 'CM297', numeroSerie: 'UGC-HDMI-0012', estado: 'DISPONIBLE' },
    { clave: 'ADP-002', nombre: 'Adaptador USB-C multipuerto', tipo: 'ADAPTADOR', marca: 'Anker', modelo: 'A8346', numeroSerie: 'ANK-8346-7710', estado: 'PRESTAMO' },
    { clave: 'ADP-003', nombre: 'Adaptador DisplayPort a VGA', tipo: 'ADAPTADOR', marca: 'StarTech', modelo: 'DP2VGA', numeroSerie: 'STK-DPV-00451', estado: 'DISPONIBLE' },
    { clave: 'CAB-001', nombre: 'Cable HDMI 2 m', tipo: 'CABLE', marca: 'Belkin', modelo: 'F3Y021', numeroSerie: 'BLK-HDMI-2M-01', estado: 'DISPONIBLE' },
    { clave: 'CAB-002', nombre: 'Cable de red Cat6 3 m', tipo: 'CABLE', marca: 'Steren', modelo: 'UTP-6-3', numeroSerie: 'STR-CAT6-3M-07', estado: 'DISPONIBLE' },
    { clave: 'CAB-003', nombre: 'Cable USB-C 1 m', tipo: 'CABLE', marca: 'Anker', modelo: 'PowerLine III', numeroSerie: 'ANK-USBC-1M-22', estado: 'DISPONIBLE' },
  ];

  const loan = (id, numeroControl, claveEquipo, inicio, extra = {}) => ({
    id,
    numeroControl,
    claveEquipo,
    fechaPrestamo: d(inicio),
    fechaDevolucionPrevista: d(inicio + 14),
    fechaDevolucionReal: null,
    estadoEquipoDevolucion: null,
    observaciones: '',
    entrego: 'ADM-001',
    recibio: null,
    ...extra,
  });
  const returned = (offset, estado = 'DISPONIBLE', observaciones = '') => ({
    fechaDevolucionReal: d(offset),
    estadoEquipoDevolucion: estado,
    observaciones,
    recibio: 'ADM-001',
  });

  const prestamos = [
    // Abiertos: vigentes y vencidos
    loan(1, '20230145', 'LAP-002', -21),
    loan(2, '20230145', 'ADP-002', -3),
    loan(3, '20230211', 'LAP-003', -5),
    loan(4, 'DOC-017', 'MON-002', -16),
    loan(5, '20220378', 'TAB-001', -1),
    // Devueltos (historial para reportes por período)
    loan(6, '20230211', 'LAP-001', -40, returned(-28)),
    loan(7, '20240019', 'BOC-001', -55, returned(-44)),
    loan(8, 'DOC-024', 'LAP-004', -35, returned(-18, 'MANTENIMIENTO', 'La pantalla presenta líneas verticales; se envía a revisión.')),
    loan(9, '20220378', 'CAB-001', -70, returned(-60)),
    loan(10, '20210456', 'TAB-002', -95, returned(-80)),
    loan(11, 'DOC-017', 'ADP-001', -120, returned(-109)),
    loan(12, '20230145', 'MON-001', -150, returned(-140)),
    loan(13, '20240019', 'LAP-005', -200, returned(-190)),
    loan(14, 'DOC-024', 'BOC-002', -260, returned(-250)),
    loan(15, '20230211', 'CAB-002', -12, returned(-6)),
  ];

  const now = Date.now();
  const at = (minutesAgo) => new Date(now - minutesAgo * 60000).toISOString();
  const movimientos = [
    { id: 1, fechaHora: at(60 * 24 * 21 + 30), operador: 'ADM-001', tipo: 'PRESTAMO', entidad: 'Préstamo', entidadId: '1', antes: null, despues: { usuario: '20230145', equipo: 'LAP-002', fechaDevolucionPrevista: d(-7) } },
    { id: 2, fechaHora: at(60 * 24 * 18 + 10), operador: 'ADM-001', tipo: 'DEVOLUCION', entidad: 'Préstamo', entidadId: '8', antes: { estado: 'Vigente' }, despues: { estado: 'Devuelto', estadoEquipo: 'MANTENIMIENTO' } },
    { id: 3, fechaHora: at(60 * 24 * 18 + 9), operador: 'ADM-001', tipo: 'CAMBIO_ESTADO_EQUIPO', entidad: 'Equipo', entidadId: 'LAP-004', antes: { estado: 'PRESTAMO' }, despues: { estado: 'MANTENIMIENTO' } },
    { id: 4, fechaHora: at(60 * 24 * 10), operador: 'ADM-002', tipo: 'BAJA_EQUIPO', entidad: 'Equipo', entidadId: 'MON-003', antes: { estado: 'MANTENIMIENTO' }, despues: { estado: 'BAJA' } },
    { id: 5, fechaHora: at(60 * 24 * 7), operador: 'ADM-001', tipo: 'DESACTIVACION_USUARIO', entidad: 'Usuario', entidadId: '20210456', antes: { activo: true }, despues: { activo: false } },
    { id: 6, fechaHora: at(60 * 24 * 5), operador: 'ADM-001', tipo: 'PRESTAMO', entidad: 'Préstamo', entidadId: '3', antes: null, despues: { usuario: '20230211', equipo: 'LAP-003', fechaDevolucionPrevista: d(9) } },
    { id: 7, fechaHora: at(60 * 24 * 3), operador: 'ADM-002', tipo: 'PRESTAMO', entidad: 'Préstamo', entidadId: '2', antes: null, despues: { usuario: '20230145', equipo: 'ADP-002', fechaDevolucionPrevista: d(11) } },
    { id: 8, fechaHora: at(60 * 24 * 2), operador: 'ADM-001', tipo: 'EDICION_EQUIPO', entidad: 'Equipo', entidadId: 'TAB-002', antes: { modelo: 'Galaxy Tab S9' }, despues: { modelo: 'Galaxy Tab S9 FE' } },
    { id: 9, fechaHora: at(60 * 24 + 15), operador: 'ADM-001', tipo: 'PRESTAMO', entidad: 'Préstamo', entidadId: '5', antes: null, despues: { usuario: '20220378', equipo: 'TAB-001', fechaDevolucionPrevista: d(13) } },
  ];

  return { usuarios, equipos, prestamos, movimientos, seq: { prestamo: 16, movimiento: 10 } };
}
