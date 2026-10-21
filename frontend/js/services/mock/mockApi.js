/**
 * BACK END SIMULADO — solo para desarrollo y demostración de la interfaz.
 *
 * Reproduce las reglas acordadas (1 equipo por préstamo, +14 días, bloqueo por
 * vencido, auditoría) para poder probar las pantallas sin servidor. Los datos
 * se guardan en sessionStorage de esta pestaña: NO llegan a ningún servidor
 * ni a la base de datos MariaDB.
 */
import { config } from '../../config.js';
import { getUser } from '../../state/session.js';
import { addDays, diffDays, localDateOf, periodRange, todayISO } from '../../utils/dates.js';
import { ApiError } from '../apiError.js';
import { buildSeed } from './mockData.js';

const STORAGE_KEY = 'pec.mock.db.v1';
let db = load();

function load() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch {
    /* se usa la semilla */
  }
  return buildSeed();
}

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* sin almacenamiento: los cambios viven en memoria */
  }
}

/** Restablece los datos de demostración. */
export function resetMockData() {
  db = buildSeed();
  persist();
}

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (value) => JSON.parse(JSON.stringify(value));

function requireSession() {
  const user = getUser();
  if (!user) throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', { status: 401 });
  return user;
}

function requireAdmin() {
  const user = requireSession();
  if (user.tipo !== 'ADMINISTRADOR') throw new ApiError('No tienes permiso para realizar esta acción.', { status: 403 });
  return user;
}

function log(tipo, entidad, entidadId, antes, despues) {
  db.movimientos.push({
    id: db.seq.movimiento++,
    fechaHora: new Date().toISOString(),
    operador: getUser()?.numeroControl ?? '—',
    tipo,
    entidad,
    entidadId: String(entidadId),
    antes,
    despues,
  });
}

function changes(before, after, keys) {
  const antes = {};
  const despues = {};
  for (const key of keys) {
    if (before[key] !== after[key]) {
      antes[key] = before[key];
      despues[key] = after[key];
    }
  }
  return [antes, despues];
}

// ----- Proyecciones (lo que devolvería el servidor) -----

function loanStatus(p, today = todayISO()) {
  if (p.fechaDevolucionReal) return 'DEVUELTO';
  return p.fechaDevolucionPrevista < today ? 'VENCIDO' : 'VIGENTE';
}

function toPrestamo(p) {
  const today = todayISO();
  const usuario = db.usuarios.find((u) => u.numeroControl === p.numeroControl);
  const equipo = db.equipos.find((e) => e.clave === p.claveEquipo);
  const estado = loanStatus(p, today);
  const fin = p.fechaDevolucionReal || today;
  return {
    ...clone(p),
    usuarioNombre: usuario?.nombre ?? '—',
    usuarioTipo: usuario?.tipo ?? null,
    equipoNombre: equipo?.nombre ?? '—',
    equipoTipo: equipo?.tipo ?? null,
    estado,
    diasAtraso: Math.max(0, diffDays(p.fechaDevolucionPrevista, fin)),
  };
}

function overdueCount(numeroControl) {
  const today = todayISO();
  return db.prestamos.filter((p) => p.numeroControl === numeroControl && loanStatus(p, today) === 'VENCIDO').length;
}

function toUsuario(u) {
  const { password, ...rest } = u;
  const vencidos = overdueCount(u.numeroControl);
  return {
    ...clone(rest),
    prestamosAbiertos: db.prestamos.filter((p) => p.numeroControl === u.numeroControl && !p.fechaDevolucionReal).length,
    prestamosVencidos: vencidos,
    bloqueado: vencidos > 0,
  };
}

function findUsuario(numeroControl) {
  const usuario = db.usuarios.find((u) => u.numeroControl === numeroControl);
  if (!usuario) throw new ApiError('El usuario no existe.', { status: 404 });
  return usuario;
}

function findEquipo(clave) {
  const equipo = db.equipos.find((e) => e.clave === clave);
  if (!equipo) throw new ApiError('El equipo no existe.', { status: 404 });
  return equipo;
}

const USER_FIELDS = ['nombre', 'correo', 'telefono', 'tipo'];
const EQUIPO_FIELDS = ['nombre', 'tipo', 'marca', 'modelo', 'numeroSerie', 'estado'];

// ----- API simulada (misma forma que remoteApi) -----

export const mockApi = {
  async login({ numeroControl, password }) {
    await delay(400);
    const usuario = db.usuarios.find((u) => u.numeroControl.toLowerCase() === String(numeroControl).toLowerCase());
    if (!usuario || usuario.password !== password) {
      throw new ApiError('Número de control o contraseña incorrectos.', { status: 401, code: 'CREDENCIALES_INVALIDAS' });
    }
    if (!usuario.activo) {
      throw new ApiError('Tu cuenta está desactivada. Acude con el Administrador.', { status: 403, code: 'USUARIO_INACTIVO' });
    }
    const result = { token: `mock-${usuario.numeroControl}-${Date.now()}`, usuario: toUsuario(usuario) };
    db.movimientos.push({
      id: db.seq.movimiento++,
      fechaHora: new Date().toISOString(),
      operador: usuario.numeroControl,
      tipo: 'INICIO_SESION',
      entidad: 'Usuario',
      entidadId: usuario.numeroControl,
      antes: null,
      despues: null,
    });
    persist();
    return result;
  },

  async logout() {
    await delay(100);
    return null;
  },

  async listUsuarios() {
    await delay();
    requireAdmin();
    return db.usuarios.map(toUsuario);
  },

  async createUsuario(data) {
    await delay();
    requireAdmin();
    if (db.usuarios.some((u) => u.numeroControl.toLowerCase() === data.numeroControl.toLowerCase())) {
      throw new ApiError('Ya existe un usuario con ese número de control.', {
        status: 409,
        code: 'NUMERO_CONTROL_DUPLICADO',
        fields: { numeroControl: 'Ya existe un usuario con ese número de control.' },
      });
    }
    const usuario = { ...data, activo: true };
    db.usuarios.push(usuario);
    log('ALTA_USUARIO', 'Usuario', usuario.numeroControl, null, { nombre: usuario.nombre, tipo: usuario.tipo });
    persist();
    return toUsuario(usuario);
  },

  async updateUsuario(numeroControl, data) {
    await delay();
    requireAdmin();
    const usuario = findUsuario(numeroControl);
    const before = { ...usuario };
    USER_FIELDS.forEach((key) => {
      if (data[key] !== undefined) usuario[key] = data[key];
    });
    const [antes, despues] = changes(before, usuario, USER_FIELDS);
    if (Object.keys(despues).length) log('EDICION_USUARIO', 'Usuario', numeroControl, antes, despues);
    persist();
    return toUsuario(usuario);
  },

  async setUsuarioActivo(numeroControl, activo) {
    await delay();
    const admin = requireAdmin();
    const usuario = findUsuario(numeroControl);
    if (!activo && usuario.numeroControl === admin.numeroControl) {
      throw new ApiError('No puedes desactivar tu propia cuenta.', { status: 409, code: 'AUTO_DESACTIVACION' });
    }
    if (usuario.activo !== activo) {
      usuario.activo = activo;
      log(activo ? 'REACTIVACION_USUARIO' : 'DESACTIVACION_USUARIO', 'Usuario', numeroControl, { activo: !activo }, { activo });
      persist();
    }
    return toUsuario(usuario);
  },

  async listEquipos() {
    await delay();
    requireSession();
    return clone(db.equipos);
  },

  async createEquipo(data) {
    await delay();
    requireAdmin();
    const fields = {};
    if (db.equipos.some((e) => e.clave.toLowerCase() === data.clave.toLowerCase())) fields.clave = 'Ya existe un equipo con esa clave.';
    if (db.equipos.some((e) => e.numeroSerie.toLowerCase() === data.numeroSerie.toLowerCase())) fields.numeroSerie = 'Ya existe un equipo con ese número de serie.';
    if (Object.keys(fields).length) throw new ApiError('Hay datos duplicados.', { status: 409, code: 'EQUIPO_DUPLICADO', fields });
    const equipo = { ...data, estado: data.estado || 'DISPONIBLE' };
    db.equipos.push(equipo);
    log('ALTA_EQUIPO', 'Equipo', equipo.clave, null, { nombre: equipo.nombre, tipo: equipo.tipo, estado: equipo.estado });
    persist();
    return clone(equipo);
  },

  async updateEquipo(clave, data) {
    await delay();
    requireAdmin();
    const equipo = findEquipo(clave);
    if (equipo.estado === 'BAJA') throw new ApiError('No se puede editar un equipo dado de baja.', { status: 409 });
    if (data.numeroSerie && db.equipos.some((e) => e.clave !== clave && e.numeroSerie.toLowerCase() === data.numeroSerie.toLowerCase())) {
      throw new ApiError('Hay datos duplicados.', { status: 409, fields: { numeroSerie: 'Ya existe un equipo con ese número de serie.' } });
    }
    if (data.estado && data.estado !== equipo.estado && (equipo.estado === 'PRESTAMO' || ['PRESTAMO', 'BAJA'].includes(data.estado))) {
      throw new ApiError('Ese cambio de estado no se permite desde la edición.', { status: 409, code: 'CAMBIO_ESTADO_INVALIDO' });
    }
    const before = { ...equipo };
    EQUIPO_FIELDS.forEach((key) => {
      if (data[key] !== undefined) equipo[key] = data[key];
    });
    const [antes, despues] = changes(before, equipo, EQUIPO_FIELDS);
    if (Object.keys(despues).length) {
      const tipo = Object.keys(despues).length === 1 && 'estado' in despues ? 'CAMBIO_ESTADO_EQUIPO' : 'EDICION_EQUIPO';
      log(tipo, 'Equipo', clave, antes, despues);
    }
    persist();
    return clone(equipo);
  },

  async darDeBajaEquipo(clave) {
    await delay();
    requireAdmin();
    const equipo = findEquipo(clave);
    if (equipo.estado === 'PRESTAMO') throw new ApiError('El equipo está prestado. Registra su devolución antes de darlo de baja.', { status: 409, code: 'EQUIPO_EN_PRESTAMO' });
    if (equipo.estado === 'BAJA') throw new ApiError('El equipo ya está dado de baja.', { status: 409 });
    log('BAJA_EQUIPO', 'Equipo', clave, { estado: equipo.estado }, { estado: 'BAJA' });
    equipo.estado = 'BAJA';
    persist();
    return clone(equipo);
  },

  async listPrestamosAbiertos() {
    await delay();
    requireAdmin();
    return db.prestamos.filter((p) => !p.fechaDevolucionReal).map(toPrestamo);
  },

  async registrarPrestamo({ numeroControl, claveEquipo }) {
    await delay(350);
    const admin = requireAdmin();
    const usuario = findUsuario(numeroControl);
    const equipo = findEquipo(claveEquipo);
    if (!usuario.activo) throw new ApiError('El usuario está desactivado y no puede recibir préstamos.', { status: 409, code: 'USUARIO_INACTIVO' });
    if (overdueCount(numeroControl) > 0) {
      throw new ApiError('El usuario tiene préstamos vencidos y no puede recibir uno nuevo hasta devolverlos.', { status: 409, code: 'USUARIO_BLOQUEADO' });
    }
    if (equipo.estado !== 'DISPONIBLE') {
      throw new ApiError('El equipo no está disponible para préstamo.', { status: 409, code: 'EQUIPO_NO_DISPONIBLE' });
    }
    const today = todayISO();
    const prestamo = {
      id: db.seq.prestamo++,
      numeroControl,
      claveEquipo,
      fechaPrestamo: today,
      fechaDevolucionPrevista: addDays(today, config.loanDays),
      fechaDevolucionReal: null,
      estadoEquipoDevolucion: null,
      observaciones: '',
      entrego: admin.numeroControl,
      recibio: null,
    };
    db.prestamos.push(prestamo);
    equipo.estado = 'PRESTAMO';
    log('PRESTAMO', 'Préstamo', prestamo.id, null, { usuario: numeroControl, equipo: claveEquipo, fechaDevolucionPrevista: prestamo.fechaDevolucionPrevista });
    log('CAMBIO_ESTADO_EQUIPO', 'Equipo', claveEquipo, { estado: 'DISPONIBLE' }, { estado: 'PRESTAMO' });
    persist();
    return toPrestamo(prestamo);
  },

  async registrarDevoluciones(items) {
    await delay(350);
    const admin = requireAdmin();
    // Validar todo antes de aplicar para que la operación sea completa o nada.
    const targets = items.map((item) => {
      const prestamo = db.prestamos.find((p) => p.id === item.prestamoId);
      if (!prestamo) throw new ApiError(`El préstamo ${item.prestamoId} no existe.`, { status: 404 });
      if (prestamo.fechaDevolucionReal) throw new ApiError(`El préstamo ${item.prestamoId} ya fue devuelto.`, { status: 409 });
      if (!['DISPONIBLE', 'MANTENIMIENTO'].includes(item.estadoEquipo)) throw new ApiError('Estado de equipo no válido.', { status: 422 });
      if (item.estadoEquipo === 'MANTENIMIENTO' && !item.observaciones?.trim()) {
        throw new ApiError('Las observaciones son obligatorias cuando el equipo pasa a Mantenimiento.', { status: 422 });
      }
      if (item.fechaDevolucionReal < prestamo.fechaPrestamo || item.fechaDevolucionReal > todayISO()) {
        throw new ApiError('La fecha de devolución debe estar entre la fecha del préstamo y hoy.', { status: 422 });
      }
      return { prestamo, item };
    });

    const result = targets.map(({ prestamo, item }) => {
      prestamo.fechaDevolucionReal = item.fechaDevolucionReal;
      prestamo.estadoEquipoDevolucion = item.estadoEquipo;
      prestamo.observaciones = item.observaciones?.trim() || '';
      prestamo.recibio = admin.numeroControl;
      const equipo = db.equipos.find((e) => e.clave === prestamo.claveEquipo);
      if (equipo) {
        equipo.estado = item.estadoEquipo;
        log('CAMBIO_ESTADO_EQUIPO', 'Equipo', equipo.clave, { estado: 'PRESTAMO' }, { estado: item.estadoEquipo });
      }
      log('DEVOLUCION', 'Préstamo', prestamo.id, { estado: 'Abierto' }, { estado: 'Devuelto', fechaDevolucionReal: item.fechaDevolucionReal, estadoEquipo: item.estadoEquipo, observaciones: prestamo.observaciones || undefined });
      return toPrestamo(prestamo);
    });
    persist();
    return result;
  },

  async historialUsuario(numeroControl) {
    await delay();
    requireAdmin();
    findUsuario(numeroControl);
    return db.prestamos.filter((p) => p.numeroControl === numeroControl).map(toPrestamo);
  },

  async miHistorial() {
    await delay();
    const user = requireSession();
    return db.prestamos.filter((p) => p.numeroControl === user.numeroControl).map(toPrestamo);
  },

  async reporteDisponibles() {
    await delay();
    requireAdmin();
    return db.equipos.filter((e) => e.estado === 'DISPONIBLE').map(({ clave, nombre, tipo, marca, estado }) => ({ clave, nombre, tipo, marca, estado }));
  },

  async reportePrestamos(periodo) {
    await delay();
    requireAdmin();
    const [desde, hasta] = periodRange(periodo);
    return db.prestamos.filter((p) => p.fechaPrestamo >= desde && p.fechaPrestamo <= hasta).map(toPrestamo);
  },

  async reporteVencidos(periodo) {
    await delay();
    requireAdmin();
    const [desde, hasta] = periodRange(periodo);
    return db.prestamos
      .map(toPrestamo)
      .filter((p) => p.estado === 'VENCIDO' && p.fechaDevolucionPrevista >= desde && p.fechaDevolucionPrevista <= hasta);
  },

  async listMovimientos({ tipo, desde, hasta } = {}) {
    await delay();
    requireAdmin();
    return clone(db.movimientos)
      .filter((m) => !tipo || m.tipo === tipo)
      .filter((m) => {
        const day = localDateOf(m.fechaHora);
        return (!desde || day >= desde) && (!hasta || day <= hasta);
      })
      .reverse();
  },
};
