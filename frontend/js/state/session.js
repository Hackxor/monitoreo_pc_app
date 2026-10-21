import { ROLES } from '../domain/catalogs.js';

/**
 * Sesión del usuario autenticado. Se guarda en sessionStorage para que dure
 * mientras la pestaña esté abierta y desaparezca al cerrarla.
 */
const KEY = 'pec.session';
const listeners = new Set();
let current = read();

function read() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

function write(value) {
  try {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* almacenamiento no disponible: la sesión vive solo en memoria */
  }
}

export function getSession() {
  return current;
}

export function getToken() {
  return current?.token ?? null;
}

export function getUser() {
  return current?.usuario ?? null;
}

export function isAdmin() {
  return current?.usuario?.tipo === ROLES.ADMINISTRADOR;
}

/** @param {{ token: string, usuario: Object } | null} session */
export function setSession(session) {
  current = session;
  write(session);
  listeners.forEach((fn) => fn(current));
}

export function updateUser(patch) {
  if (!current) return;
  setSession({ ...current, usuario: { ...current.usuario, ...patch } });
}

export function clearSession() {
  setSession(null);
}

export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
