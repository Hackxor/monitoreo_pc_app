"""
Servidor HTTP multi-hilo para el Sistema de Préstamo de Equipo de Cómputo.
- Expone la API REST en /api/*
- Sirve los archivos estáticos de la interfaz en frontend/
- Sin dependencias externas: usa la biblioteca estándar de Python (http.server, sqlite3, etc.)
- Soporta CORS para desarrollo o despliegue en red local
"""
import json
import mimetypes
import os
import posixpath
import re
import sys
import urllib.parse
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Asegurar que el directorio backend esté en sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from auth import create_session, get_session_user_nc, hash_password, invalidate_session, verify_password
from database import close_db, get_db, init_db
from logic import (
    BusinessError,
    create_equipo,
    create_usuario,
    dar_de_baja_equipo,
    get_usuario_by_nc,
    historial_usuario,
    list_equipos,
    list_movimientos,
    list_prestamos_abiertos,
    list_usuarios,
    log_movimiento,
    registrar_devoluciones,
    registrar_prestamo,
    reporte_equipos_disponibles,
    reporte_prestamos,
    reporte_prestamos_vencidos,
    set_usuario_activo,
    update_equipo,
    update_usuario,
)

# Extensiones MIME conocidas
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('font/woff2', '.woff2')
mimetypes.add_type('font/woff', '.woff')


class AppRequestHandler(SimpleHTTPRequestHandler):
    """Manejador de peticiones para API y archivos estáticos."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    # ── Utilidades de respuesta ──────────────────────────────────────────────

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')

    def send_json(self, status: int, data: any):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def send_error_json(self, status: int, message: str, code: str = None, fields: dict = None):
        err = {"message": message}
        if code:
            err["code"] = code
        if fields:
            err["fields"] = fields
        self.send_json(status, err)

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_cors_headers()
        self.end_headers()

    # ── Autenticación y lectura de cuerpo ────────────────────────────────────

    def read_json_body(self) -> dict:
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length <= 0:
            return {}
        raw = self.rfile.read(content_length).decode('utf-8')
        try:
            return json.loads(raw)
        except Exception:
            raise BusinessError("JSON inválido.", status_code=400)

    def get_token_from_header(self) -> str | None:
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:].strip()
        return None

    def get_authenticated_user(self) -> dict:
        token = self.get_token_from_header()
        if not token:
            raise BusinessError("Tu sesión expiró. Inicia sesión de nuevo.", status_code=401)
        nc = get_session_user_nc(token)
        if not nc:
            raise BusinessError("Tu sesión expiró. Inicia sesión de nuevo.", status_code=401)
        try:
            user = get_usuario_by_nc(nc)
        except BusinessError:
            raise BusinessError("Tu sesión expiró. Inicia sesión de nuevo.", status_code=401)

        if not user['activo']:
            raise BusinessError("Tu cuenta está desactivada. Acude con el Administrador.", status_code=403, code="USUARIO_INACTIVO")

        return user

    def require_admin(self) -> dict:
        user = self.get_authenticated_user()
        if user['tipo'] != 'ADMINISTRADOR':
            raise BusinessError("No tienes permiso para realizar esta acción.", status_code=403)
        return user

    # ── Enrutamiento HTTP ───────────────────────────────────────────────────

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path.rstrip('/')
        query = dict(urllib.parse.parse_qsl(url.query))

        if path.startswith('/api'):
            self.handle_api_get(path, query)
        else:
            self.handle_static()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path.rstrip('/')
        if path.startswith('/api'):
            self.handle_api_post(path)
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    def do_PUT(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path.rstrip('/')
        if path.startswith('/api'):
            self.handle_api_put(path)
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    def do_PATCH(self):
        url = urllib.parse.urlparse(self.path)
        path = url.path.rstrip('/')
        if path.startswith('/api'):
            self.handle_api_patch(path)
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    # ── Archivos estáticos ───────────────────────────────────────────────────

    def handle_static(self):
        url = urllib.parse.urlparse(self.path)
        req_path = url.path
        if req_path == '' or req_path == '/':
            req_path = '/index.html'

        # Limpiar ruta
        req_path = posixpath.normpath(urllib.parse.unquote(req_path))
        words = [w for w in req_path.split('/') if w and w != '..']
        filepath = os.path.join(FRONTEND_DIR, *words)

        if os.path.isdir(filepath):
            filepath = os.path.join(filepath, 'index.html')

        if not os.path.exists(filepath) or not os.path.isfile(filepath):
            self.send_error(HTTPStatus.NOT_FOUND, "Archivo no encontrado")
            return

        ctype, _ = mimetypes.guess_type(filepath)
        if not ctype:
            ctype = 'application/octet-stream'

        try:
            with open(filepath, 'rb') as f:
                content = f.read()

            self.send_response(HTTPStatus.OK)
            self.send_cors_headers()
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception:
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR)

    # ── Controladores API ────────────────────────────────────────────────────

    def handle_api_get(self, path: str, query: dict):
        try:
            # GET /api/usuarios
            if path == '/api/usuarios':
                self.require_admin()
                self.send_json(200, list_usuarios())
                return

            # GET /api/usuarios/{nc}/prestamos
            m_user_loans = re.match(r'^/api/usuarios/([^/]+)/prestamos$', path)
            if m_user_loans:
                self.require_admin()
                nc = urllib.parse.unquote(m_user_loans.group(1))
                self.send_json(200, historial_usuario(nc))
                return

            # GET /api/me/prestamos
            if path == '/api/me/prestamos':
                user = self.get_authenticated_user()
                self.send_json(200, historial_usuario(user['numeroControl']))
                return

            # GET /api/equipos
            if path == '/api/equipos':
                self.get_authenticated_user()
                self.send_json(200, list_equipos())
                return

            # GET /api/prestamos?estado=ABIERTO
            if path == '/api/prestamos':
                self.require_admin()
                if query.get('estado') == 'ABIERTO':
                    self.send_json(200, list_prestamos_abiertos())
                else:
                    self.send_json(200, list_prestamos_abiertos())
                return

            # GET /api/reportes/equipos-disponibles
            if path == '/api/reportes/equipos-disponibles':
                self.require_admin()
                self.send_json(200, reporte_equipos_disponibles())
                return

            # GET /api/reportes/prestamos
            if path == '/api/reportes/prestamos':
                self.require_admin()
                self.send_json(200, reporte_prestamos(query))
                return

            # GET /api/reportes/prestamos-vencidos
            if path == '/api/reportes/prestamos-vencidos':
                self.require_admin()
                self.send_json(200, reporte_prestamos_vencidos(query))
                return

            # GET /api/movimientos
            if path == '/api/movimientos':
                self.require_admin()
                self.send_json(200, list_movimientos(
                    tipo=query.get('tipo'),
                    desde=query.get('desde'),
                    hasta=query.get('hasta')
                ))
                return

            self.send_error_json(404, "Endpoint no encontrado.")
        except BusinessError as be:
            self.send_error_json(be.status_code, be.message, be.code, be.fields)
        except Exception as e:
            self.send_error_json(500, f"Error interno: {str(e)}")

    def handle_api_post(self, path: str):
        try:
            body = self.read_json_body()

            # POST /api/auth/login
            if path == '/api/auth/login':
                nc = (body.get('numeroControl') or '').strip()
                pwd = body.get('password') or ''
                if not nc or not pwd:
                    raise BusinessError("Número de control y contraseña requeridos.", status_code=400)

                db = get_db()
                cursor = db.cursor()
                cursor.execute("SELECT * FROM usuarios WHERE LOWER(numero_control) = LOWER(?)", (nc,))
                user_row = cursor.fetchone()

                if not user_row or not verify_password(pwd, user_row['password_hash'], user_row['password_salt']):
                    raise BusinessError("Usuario o contraseña incorrectos.", status_code=401, code="CREDENCIALES_INVALIDAS")

                if not user_row['activo']:
                    raise BusinessError("Tu cuenta está desactivada. Acude con el Administrador.", status_code=403, code="USUARIO_INACTIVO")

                real_nc = user_row['numero_control']
                token = create_session(real_nc)
                user_dict = get_usuario_by_nc(real_nc)

                log_movimiento(real_nc, 'INICIO_SESION', 'Usuario', real_nc, antes=None, despues=None, db=db)
                db.commit()

                self.send_json(200, {"token": token, "usuario": user_dict})
                return

            # POST /api/auth/logout
            if path == '/api/auth/logout':
                token = self.get_token_from_header()
                if token:
                    invalidate_session(token)
                self.send_json(200, {"ok": True})
                return

            # POST /api/usuarios
            if path == '/api/usuarios':
                admin = self.require_admin()
                created = create_usuario(body, admin['numeroControl'])
                self.send_json(201, created)
                return

            # POST /api/equipos
            if path == '/api/equipos':
                admin = self.require_admin()
                created = create_equipo(body, admin['numeroControl'])
                self.send_json(201, created)
                return

            # POST /api/equipos/{clave}/baja
            m_baja = re.match(r'^/api/equipos/([^/]+)/baja$', path)
            if m_baja:
                admin = self.require_admin()
                clave = urllib.parse.unquote(m_baja.group(1))
                updated = dar_de_baja_equipo(clave, admin['numeroControl'])
                self.send_json(200, updated)
                return

            # POST /api/prestamos
            if path == '/api/prestamos':
                admin = self.require_admin()
                nc = body.get('numeroControl')
                clave = body.get('claveEquipo')
                prestamo = registrar_prestamo(nc, clave, admin['numeroControl'])
                self.send_json(201, prestamo)
                return

            # POST /api/devoluciones
            if path == '/api/devoluciones':
                admin = self.require_admin()
                items = body.get('devoluciones', [])
                results = registrar_devoluciones(items, admin['numeroControl'])
                self.send_json(200, results)
                return

            self.send_error_json(404, "Endpoint no encontrado.")
        except BusinessError as be:
            self.send_error_json(be.status_code, be.message, be.code, be.fields)
        except Exception as e:
            self.send_error_json(500, f"Error interno: {str(e)}")

    def handle_api_put(self, path: str):
        try:
            body = self.read_json_body()

            # PUT /api/usuarios/{nc}
            m_user = re.match(r'^/api/usuarios/([^/]+)$', path)
            if m_user:
                admin = self.require_admin()
                nc = urllib.parse.unquote(m_user.group(1))
                updated = update_usuario(nc, body, admin['numeroControl'])
                self.send_json(200, updated)
                return

            # PUT /api/equipos/{clave}
            m_eq = re.match(r'^/api/equipos/([^/]+)$', path)
            if m_eq:
                admin = self.require_admin()
                clave = urllib.parse.unquote(m_eq.group(1))
                updated = update_equipo(clave, body, admin['numeroControl'])
                self.send_json(200, updated)
                return

            self.send_error_json(404, "Endpoint no encontrado.")
        except BusinessError as be:
            self.send_error_json(be.status_code, be.message, be.code, be.fields)
        except Exception as e:
            self.send_error_json(500, f"Error interno: {str(e)}")

    def handle_api_patch(self, path: str):
        try:
            body = self.read_json_body()

            # PATCH /api/usuarios/{nc}/activo
            m_active = re.match(r'^/api/usuarios/([^/]+)/activo$', path)
            if m_active:
                admin = self.require_admin()
                nc = urllib.parse.unquote(m_active.group(1))
                activo = bool(body.get('activo'))
                updated = set_usuario_activo(nc, activo, admin['numeroControl'])
                self.send_json(200, updated)
                return

            self.send_error_json(404, "Endpoint no encontrado.")
        except BusinessError as be:
            self.send_error_json(be.status_code, be.message, be.code, be.fields)
        except Exception as e:
            self.send_error_json(500, f"Error interno: {str(e)}")


def run_server(host: str = '0.0.0.0', port: int = 8080):
    """Inicializa la base de datos y arranca el servidor HTTP."""
    print("=" * 60)
    print(" Sistema de Préstamo de Equipo de Cómputo")
    print(" Servidor Web y API REST")
    print("=" * 60)
    print(f"[*] Inicializando base de datos local SQLite...")
    init_db()
    print("[+] Base de datos lista.")

    server_address = (host, port)
    httpd = ThreadingHTTPServer(server_address, AppRequestHandler)
    print(f"[+] Servidor escuchando en http://localhost:{port}/")
    print(f"[+] En la red local: http://{host}:{port}/")
    print(f"[+] Sirviendo interfaz desde: {FRONTEND_DIR}")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Deteniendo servidor...")
        httpd.server_close()
        print("[+] Servidor detenido correctamente.")


if __name__ == '__main__':
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port=port)
