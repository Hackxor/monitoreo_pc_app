import { api } from './services/api.js';
import { onUnauthorized } from './services/http.js';
import { clearSession, getUser, isAdmin } from './state/session.js';
import { homeFor, routesFor } from './routes.js';
import { renderLogin } from './views/login.js';
import { createShell } from './views/shell.js';
import { openHelp } from './views/help.js';
import { isModalOpen } from './ui/modal.js';
import { errorState, showToast } from './ui/feedback.js';

const root = document.getElementById('app');
let shell = null;
let shellUserKey = null;

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { path, params: new URLSearchParams(query) };
}

export function navigate(path) {
  if (window.location.hash === `#${path}`) render();
  else window.location.hash = path;
}

function render() {
  const user = getUser();
  if (!user) {
    shell = null;
    shellUserKey = null;
    renderLogin(root, { onSuccess: () => navigate(homeFor(getUser().tipo)) });
    return;
  }

  const allowed = routesFor(user.tipo);
  const { path, params } = parseHash();
  const route = allowed.find((r) => r.path === path);
  if (!route) {
    navigate(homeFor(user.tipo));
    return;
  }

  const userKey = `${user.numeroControl}:${user.tipo}`;
  if (!shell || shellUserKey !== userKey) {
    shell = createShell({ user, routes: allowed, onLogout: logout, onHelp: openHelp });
    shellUserKey = userKey;
    root.replaceChildren(shell.el);
  }

  shell.setActive(route);
  try {
    route.render({ container: shell.content, params, navigate });
  } catch (error) {
    console.error(error);
    shell.content.replaceChildren(errorState(error, render));
  }
  shell.content.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

async function logout() {
  try {
    await api.logout();
  } catch {
    /* aunque falle el aviso al servidor, la sesión local se cierra */
  }
  clearSession();
  navigate('/');
}

onUnauthorized(() => {
  if (!getUser()) return;
  clearSession();
  showToast('Tu sesión expiró. Inicia sesión de nuevo.', 'warning');
  navigate('/');
});

document.addEventListener('keydown', (event) => {
  if (!getUser() || isModalOpen()) return;
  if (event.key === 'F1') {
    event.preventDefault();
    openHelp();
  } else if (event.key === 'F6' && isAdmin()) {
    event.preventDefault();
    navigate('/prestamo');
  }
});

window.addEventListener('hashchange', render);
render();
