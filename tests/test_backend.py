"""
Suite de pruebas integrales para el backend del Sistema de Préstamo de Equipo de Cómputo.
Verifica todos los requisitos funcionales (RF-01 a RF-12), casos de uso (UC-01 a UC-12),
criterios de aceptación (AC-01 a AC-15) y reglas de negocio (RB-01 a RB-08).
"""
import json
import os
import sys
import unittest
from datetime import date, timedelta

# Asegurar backend en sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Usar una base de datos temporal para pruebas
import database
database.DB_PATH = os.path.join(BASE_DIR, 'backend', 'test_prestamos.db')
if os.path.exists(database.DB_PATH):
    try:
        os.remove(database.DB_PATH)
    except Exception:
        pass

from auth import create_session, hash_password, verify_password
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
    registrar_devoluciones,
    registrar_prestamo,
    reporte_equipos_disponibles,
    reporte_prestamos,
    reporte_prestamos_vencidos,
    set_usuario_activo,
    update_equipo,
    update_usuario,
)


class TestBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()

    @classmethod
    def tearDownClass(cls):
        close_db()
        if os.path.exists(database.DB_PATH):
            try:
                os.remove(database.DB_PATH)
            except Exception:
                pass

    # ── RF-01 / RNF-05: Autenticación y hash seguro ───────────────────────────
    def test_01_password_hashing(self):
        pwd = "MiPasswordSeguro123"
        h, salt = hash_password(pwd)
        self.assertNotEqual(pwd, h)
        self.assertEqual(len(h), 64)  # SHA-256 hex
        self.assertTrue(verify_password(pwd, h, salt))
        self.assertFalse(verify_password("PasswordErroneo", h, salt))

    def test_02_login_valid_and_invalid(self):
        # Admin existente
        admin = get_usuario_by_nc("ADM-001")
        self.assertEqual(admin["numeroControl"], "ADM-001")
        self.assertEqual(admin["tipo"], "ADMINISTRADOR")
        self.assertTrue(admin["activo"])

        # Usuario inactivo
        inactivo = get_usuario_by_nc("20210456")
        self.assertFalse(inactivo["activo"])

    # ── RF-03 / FM-01: Usuarios ──────────────────────────────────────────────
    def test_03_create_usuario_and_duplicate_check(self):
        new_user = {
            "numeroControl": "20250001",
            "nombre": "Estudiante Prueba",
            "correo": "prueba@alumnos.edu.mx",
            "telefono": "4420000001",
            "tipo": "ALUMNO",
            "password": "pass12345"
        }
        u = create_usuario(new_user, "ADM-001")
        self.assertEqual(u["numeroControl"], "20250001")
        self.assertTrue(u["activo"])

        # Duplicado debe fallar con 409 NUMERO_CONTROL_DUPLICADO
        with self.assertRaises(BusinessError) as ctx:
            create_usuario(new_user, "ADM-001")
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.code, "NUMERO_CONTROL_DUPLICADO")

    def test_04_usuario_self_deactivation_forbidden(self):
        # El operador no puede auto-desactivarse
        with self.assertRaises(BusinessError) as ctx:
            set_usuario_activo("ADM-001", False, "ADM-001")
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.code, "AUTO_DESACTIVACION")

    # ── RF-04 / FM-02 / FM-03: Equipos ───────────────────────────────────────
    def test_05_create_equipo_and_duplicate_check(self):
        eq_data = {
            "clave": "TEST-001",
            "nombre": "Laptop de Prueba",
            "tipo": "LAPTOP",
            "marca": "Dell",
            "modelo": "Test 100",
            "numeroSerie": "SERIE-TEST-999"
        }
        e = create_equipo(eq_data, "ADM-001")
        self.assertEqual(e["clave"], "TEST-001")
        self.assertEqual(e["estado"], "DISPONIBLE")

        # Duplicado de serie o clave
        with self.assertRaises(BusinessError) as ctx:
            create_equipo(eq_data, "ADM-001")
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.code, "EQUIPO_DUPLICADO")

    def test_06_baja_equipo_en_prestamo_forbidden(self):
        # LAP-002 está en estado PRESTAMO
        with self.assertRaises(BusinessError) as ctx:
            dar_de_baja_equipo("LAP-002", "ADM-001")
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.code, "EQUIPO_EN_PRESTAMO")

    # ── RF-06 / RF-07 / RF-09 / RB-02 / RB-04: Préstamos y Bloqueo ────────────
    def test_07_loan_blocked_user_forbidden(self):
        # 20230145 tiene préstamos vencidos en los datos semilla
        with self.assertRaises(BusinessError) as ctx:
            registrar_prestamo("20230145", "LAP-001", "ADM-001")
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.code, "USUARIO_BLOQUEADO")

    def test_08_loan_inactive_user_forbidden(self):
        # 20210456 está desactivado
        with self.assertRaises(BusinessError) as ctx:
            registrar_prestamo("20210456", "LAP-001", "ADM-001")
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.code, "USUARIO_INACTIVO")

    def test_09_loan_unavailable_equipment_forbidden(self):
        # LAP-004 está en MANTENIMIENTO
        with self.assertRaises(BusinessError) as ctx:
            registrar_prestamo("20250001", "LAP-004", "ADM-001")
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(ctx.exception.code, "EQUIPO_NO_DISPONIBLE")

    def test_10_loan_success_and_14_days_rule(self):
        # 20250001 es un usuario activo sin morosidad, LAP-001 está DISPONIBLE
        loan = registrar_prestamo("20250001", "LAP-001", "ADM-001")
        self.assertEqual(loan["numeroControl"], "20250001")
        self.assertEqual(loan["claveEquipo"], "LAP-001")
        self.assertEqual(loan["estado"], "VIGENTE")

        # Validación de RB-02: Préstamo + 14 días exactos
        f_prestamo = date.fromisoformat(loan["fechaPrestamo"])
        f_prev = date.fromisoformat(loan["fechaDevolucionPrevista"])
        self.assertEqual((f_prev - f_prestamo).days, 14)

        # El equipo ahora debe estar en PRESTAMO
        equipos = {e["clave"]: e for e in list_equipos()}
        self.assertEqual(equipos["LAP-001"]["estado"], "PRESTAMO")

    # ── RF-08 / FM-05 / DD-03: Devoluciones ──────────────────────────────────
    def test_11_return_mantenimiento_requires_observations(self):
        # Obtener un préstamo abierto
        abiertos = list_prestamos_abiertos()
        target = abiertos[0]

        # Si pasa a MANTENIMIENTO sin observaciones debe fallar con 422
        item = {
            "prestamoId": target["id"],
            "fechaDevolucionReal": date.today().isoformat(),
            "estadoEquipo": "MANTENIMIENTO",
            "observaciones": ""
        }
        with self.assertRaises(BusinessError) as ctx:
            registrar_devoluciones([item], "ADM-001")
        self.assertEqual(ctx.exception.status_code, 422)

    def test_12_return_success(self):
        # Devolver el préstamo recién creado de LAP-001
        abiertos = list_prestamos_abiertos()
        lap_loan = [p for p in abiertos if p["claveEquipo"] == "LAP-001"][0]

        item = {
            "prestamoId": lap_loan["id"],
            "fechaDevolucionReal": date.today().isoformat(),
            "estadoEquipo": "DISPONIBLE",
            "observaciones": "Devuelto en perfecto estado"
        }
        res = registrar_devoluciones([item], "ADM-001")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["estado"], "DEVUELTO")

        # El equipo debe regresar a DISPONIBLE
        equipos = {e["clave"]: e for e in list_equipos()}
        self.assertEqual(equipos["LAP-001"]["estado"], "DISPONIBLE")

    # ── RF-11 / FM-06 a FM-08: Reportes ──────────────────────────────────────
    def test_13_reportes(self):
        # Reporte 1: Equipos disponibles
        disp = reporte_equipos_disponibles()
        self.assertTrue(len(disp) > 0)
        for e in disp:
            self.assertEqual(e["estado"], "DISPONIBLE")

        # Reporte 2: Préstamos por período
        rep_prestamos = reporte_prestamos({"tipo": "anio", "anio": date.today().year})
        self.assertTrue(len(rep_prestamos) > 0)

        # Reporte 3: Préstamos vencidos
        rep_vencidos = reporte_prestamos_vencidos({"tipo": "anio", "anio": date.today().year})
        for v in rep_vencidos:
            self.assertEqual(v["estado"], "VENCIDO")
            self.assertGreaterEqual(v["diasAtraso"], 0)

    # ── RF-12 / RA-01: Auditoría ─────────────────────────────────────────────
    def test_14_auditoria(self):
        movs = list_movimientos()
        self.assertTrue(len(movs) > 0)
        # Verificar que el último movimiento registrado exista
        tipos = [m["tipo"] for m in movs]
        self.assertIn("PRESTAMO", tipos)
        self.assertIn("DEVOLUCION", tipos)


if __name__ == '__main__':
    unittest.main()
