"""
Pruebas de integración HTTP contra el servidor web y API REST.
Arranca el servidor en un hilo secundario y realiza peticiones HTTP reales.
"""
import json
import os
import sys
import threading
import time
import unittest
import urllib.error
import urllib.request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import database
database.DB_PATH = os.path.join(BASE_DIR, 'backend', 'test_http_prestamos.db')
if os.path.exists(database.DB_PATH):
    try:
        os.remove(database.DB_PATH)
    except Exception:
        pass

from database import close_db, init_db
from server import AppRequestHandler, ThreadingHTTPServer

TEST_PORT = 8899
BASE_URL = f"http://127.0.0.1:{TEST_PORT}"


class TestHttpApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.server = ThreadingHTTPServer(('127.0.0.1', TEST_PORT), AppRequestHandler)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.3)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        close_db()
        if os.path.exists(database.DB_PATH):
            try:
                os.remove(database.DB_PATH)
            except Exception:
                pass

    def _request(self, method: str, path: str, data: dict = None, token: str = None) -> tuple[int, dict, dict]:
        url = f"{BASE_URL}{path}"
        headers = {"Accept": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        body = None
        if data is not None:
            body = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as resp:
                status = resp.status
                resp_headers = dict(resp.headers)
                raw = resp.read().decode("utf-8")
                return status, (json.loads(raw) if raw else None), resp_headers
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8")
            return e.code, (json.loads(raw) if raw else None), dict(e.headers)

    # ── 1. Servir archivos estáticos ─────────────────────────────────────────
    def test_01_static_index(self):
        req = urllib.request.Request(f"{BASE_URL}/")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            content = resp.read().decode("utf-8")
            self.assertIn("Sistema de Préstamo de Equipo de Cómputo", content)
            self.assertIn("window.APP_CONFIG", content)

    # ── 2. Autenticación HTTP ────────────────────────────────────────────────
    def test_02_http_login_flow(self):
        # Credenciales incorrectas
        st, res, _ = self._request("POST", "/api/auth/login", {"numeroControl": "ADM-001", "password": "wrong"})
        self.assertEqual(st, 401)
        self.assertEqual(res["code"], "CREDENCIALES_INVALIDAS")

        # Credenciales correctas
        st, res, _ = self._request("POST", "/api/auth/login", {"numeroControl": "ADM-001", "password": "admin123"})
        self.assertEqual(st, 200)
        self.assertIn("token", res)
        self.assertEqual(res["usuario"]["numeroControl"], "ADM-001")
        self.assertEqual(res["usuario"]["tipo"], "ADMINISTRADOR")
        token = res["token"]

        # Acceder a endpoint protegido con token
        st, users, _ = self._request("GET", "/api/usuarios", token=token)
        self.assertEqual(st, 200)
        self.assertTrue(len(users) >= 9)

        # Logout
        st, out_res, _ = self._request("POST", "/api/auth/logout", token=token)
        self.assertEqual(st, 200)

        # Ahora el token ya no debe funcionar
        st, after_logout, _ = self._request("GET", "/api/usuarios", token=token)
        self.assertEqual(st, 401)

    # ── 3. Permisos por Rol ──────────────────────────────────────────────────
    def test_03_role_permissions(self):
        # Login como Alumno
        st, res, _ = self._request("POST", "/api/auth/login", {"numeroControl": "20230211", "password": "alumno123"})
        self.assertEqual(st, 200)
        alumno_token = res["token"]

        # Alumno intentando listar usuarios (debe ser 403)
        st, res, _ = self._request("GET", "/api/usuarios", token=alumno_token)
        self.assertEqual(st, 403)

        # Alumno consultando equipos disponibles (debe ser 200)
        st, equipos, _ = self._request("GET", "/api/equipos", token=alumno_token)
        self.assertEqual(st, 200)

        # Alumno consultando su propio historial (debe ser 200)
        st, hist, _ = self._request("GET", "/api/me/prestamos", token=alumno_token)
        self.assertEqual(st, 200)

    # ── 4. Ciclo Préstamo -> Devolución vía HTTP ─────────────────────────────
    def test_04_http_prestamo_devolucion(self):
        # Login admin
        st, res, _ = self._request("POST", "/api/auth/login", {"numeroControl": "ADM-001", "password": "admin123"})
        admin_token = res["token"]

        # Crear préstamo
        st, prestamo, _ = self._request("POST", "/api/prestamos", {
            "numeroControl": "20220378",
            "claveEquipo": "BOC-001"
        }, token=admin_token)
        self.assertEqual(st, 201)
        self.assertEqual(prestamo["estado"], "VIGENTE")
        prestamo_id = prestamo["id"]

        # Devolver préstamo
        st, devoluciones, _ = self._request("POST", "/api/devoluciones", {
            "devoluciones": [{
                "prestamoId": prestamo_id,
                "fechaDevolucionReal": prestamo["fechaPrestamo"],
                "estadoEquipo": "DISPONIBLE",
                "observaciones": "Sin novedad"
            }]
        }, token=admin_token)
        self.assertEqual(st, 200)
        self.assertEqual(len(devoluciones), 1)
        self.assertEqual(devoluciones[0]["estado"], "DEVUELTO")


if __name__ == '__main__':
    unittest.main()
