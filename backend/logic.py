"""
Lógica del negocio y operaciones de base de datos.
Implementa todas las reglas de negocio (RB-01 a RB-08) y requisitos (RF-01 a RF-12).
"""
import json
from datetime import date, datetime, timedelta, timezone
from database import get_db

LOAN_DAYS = 14


# ── Clases de excepción para errores de negocio ──────────────────────────────

class BusinessError(Exception):
    def __init__(self, message: str, status_code: int = 409, code: str = None, fields: dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.fields = fields or {}

    def to_dict(self):
        d = {"message": self.message}
        if self.code:
            d["code"] = self.code
        if self.fields:
            d["fields"] = self.fields
        return d


# ── Utilidades de fecha ──────────────────────────────────────────────────────

def today_iso() -> str:
    return date.today().isoformat()


def add_days(iso_str: str, days: int) -> str:
    d = date.fromisoformat(iso_str)
    return (d + timedelta(days=days)).isoformat()


def diff_days(from_iso: str, to_iso: str) -> int:
    d_from = date.fromisoformat(from_iso)
    d_to = date.fromisoformat(to_iso)
    return (d_to - d_from).days


def period_range(tipo: str, anio: int, mes: int = None) -> tuple[str, str]:
    if tipo == 'mes' and mes:
        start = f"{anio}-{mes:02d}-01"
        if mes == 12:
            next_month = f"{anio + 1}-01-01"
        else:
            next_month = f"{anio}-{mes + 1:02d}-01"
        end = add_days(next_month, -1)
        return start, end
    return f"{anio}-01-01", f"{anio}-12-31"


# ── Auditoría (RF-12, RA-01) ────────────────────────────────────────────────

def log_movimiento(operador: str, tipo: str, entidad: str, entidad_id: str, antes: dict = None, despues: dict = None, db=None):
    if db is None:
        db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """INSERT INTO movimientos(fecha_hora, operador, tipo, entidad, entidad_id, antes, despues)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            datetime.now(timezone.utc).isoformat(),
            operador or '—',
            tipo,
            entidad,
            str(entidad_id),
            json.dumps(antes, ensure_ascii=False) if antes is not None else None,
            json.dumps(despues, ensure_ascii=False) if despues is not None else None,
        )
    )


# ── Proyecciones ─────────────────────────────────────────────────────────────

def get_loan_status(fecha_prev: str, fecha_real: str = None) -> str:
    if fecha_real:
        return 'DEVUELTO'
    if fecha_prev < today_iso():
        return 'VENCIDO'
    return 'VIGENTE'


def get_user_overdue_count(numero_control: str, db=None) -> int:
    if db is None:
        db = get_db()
    today = today_iso()
    cursor = db.cursor()
    cursor.execute(
        """SELECT COUNT(*) FROM prestamos
           WHERE numero_control = ? AND fecha_devolucion_real IS NULL AND fecha_devolucion_prev < ?""",
        (numero_control, today)
    )
    return cursor.fetchone()[0]


def to_usuario_dict(row, db=None) -> dict:
    if db is None:
        db = get_db()
    nc = row['numero_control']
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM prestamos WHERE numero_control = ? AND fecha_devolucion_real IS NULL", (nc,))
    abiertos = cursor.fetchone()[0]
    vencidos = get_user_overdue_count(nc, db)
    return {
        "numeroControl": nc,
        "nombre": row['nombre'],
        "correo": row['correo'],
        "telefono": row['telefono'],
        "tipo": row['tipo'],
        "activo": bool(row['activo']),
        "bloqueado": vencidos > 0,
        "prestamosAbiertos": abiertos,
        "prestamosVencidos": vencidos,
    }


def to_equipo_dict(row) -> dict:
    return {
        "clave": row['clave'],
        "nombre": row['nombre'],
        "tipo": row['tipo'],
        "marca": row['marca'],
        "modelo": row['modelo'],
        "numeroSerie": row['numero_serie'],
        "estado": row['estado'],
    }


def to_prestamo_dict(row, db=None) -> dict:
    if db is None:
        db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT nombre, tipo FROM usuarios WHERE numero_control = ?", (row['numero_control'],))
    u = cursor.fetchone()
    cursor.execute("SELECT nombre, tipo FROM equipos WHERE clave = ?", (row['clave_equipo'],))
    e = cursor.fetchone()

    today = today_iso()
    estado = get_loan_status(row['fecha_devolucion_prev'], row['fecha_devolucion_real'])
    fin = row['fecha_devolucion_real'] or today
    dias_atraso = max(0, diff_days(row['fecha_devolucion_prev'], fin))

    return {
        "id": row['id'],
        "numeroControl": row['numero_control'],
        "usuarioNombre": u['nombre'] if u else '—',
        "usuarioTipo": u['tipo'] if u else None,
        "claveEquipo": row['clave_equipo'],
        "equipoNombre": e['nombre'] if e else '—',
        "equipoTipo": e['tipo'] if e else None,
        "fechaPrestamo": row['fecha_prestamo'],
        "fechaDevolucionPrevista": row['fecha_devolucion_prev'],
        "fechaDevolucionReal": row['fecha_devolucion_real'],
        "estado": estado,
        "diasAtraso": dias_atraso,
        "estadoEquipoDevolucion": row['estado_equipo_dev'],
        "observaciones": row['observaciones'] or "",
        "entrego": row['entrego'],
        "recibio": row['recibio'],
    }


def to_movimiento_dict(row) -> dict:
    antes = json.loads(row['antes']) if row['antes'] else None
    despues = json.loads(row['despues']) if row['despues'] else None
    return {
        "id": row['id'],
        "fechaHora": row['fecha_hora'],
        "operador": row['operador'],
        "tipo": row['tipo'],
        "entidad": row['entidad'],
        "entidadId": row['entidad_id'],
        "antes": antes,
        "despues": despues,
    }


# ── Usuarios (UC-02, RF-03) ─────────────────────────────────────────────────

def list_usuarios() -> list[dict]:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM usuarios ORDER BY nombre ASC")
    rows = cursor.fetchall()
    return [to_usuario_dict(r, db) for r in rows]


def get_usuario_by_nc(nc: str) -> dict:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE LOWER(numero_control) = LOWER(?)", (nc,))
    row = cursor.fetchone()
    if not row:
        raise BusinessError("El usuario no existe.", status_code=404)
    return to_usuario_dict(row, db)


def create_usuario(data: dict, operador: str) -> dict:
    from auth import hash_password

    nc = (data.get('numeroControl') or '').strip()
    nombre = (data.get('nombre') or '').strip()
    correo = (data.get('correo') or '').strip()
    telefono = (data.get('telefono') or '').strip()
    tipo = data.get('tipo')
    password = data.get('password') or ''

    if not nc or not nombre or not tipo or not password:
        raise BusinessError("Revisa los datos marcados.", status_code=422)

    if tipo not in ('ALUMNO', 'DOCENTE', 'ADMINISTRADOR'):
        raise BusinessError("Tipo de usuario no válido.", status_code=422)

    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT 1 FROM usuarios WHERE LOWER(numero_control) = LOWER(?)", (nc,))
    if cursor.fetchone():
        raise BusinessError(
            "Ya existe un usuario con ese número de control.",
            status_code=409,
            code="NUMERO_CONTROL_DUPLICADO",
            fields={"numeroControl": "Ya existe un usuario con ese número de control."}
        )

    ph, ps = hash_password(password)
    cursor.execute(
        """INSERT INTO usuarios(numero_control, nombre, correo, telefono, tipo, activo, password_hash, password_salt)
           VALUES(?,?,?,?,?,1,?,?)""",
        (nc, nombre, correo, telefono, tipo, ph, ps)
    )

    log_movimiento(operador, 'ALTA_USUARIO', 'Usuario', nc, antes=None, despues={'nombre': nombre, 'tipo': tipo}, db=db)
    db.commit()

    return get_usuario_by_nc(nc)


def update_usuario(nc: str, data: dict, operador: str) -> dict:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE LOWER(numero_control) = LOWER(?)", (nc,))
    row = cursor.fetchone()
    if not row:
        raise BusinessError("El usuario no existe.", status_code=404)

    fields_to_check = ['nombre', 'correo', 'telefono', 'tipo']
    antes = {}
    despues = {}
    updates = []
    params = []

    for f in fields_to_check:
        if f in data and data[f] is not None:
            new_val = str(data[f]).strip()
            old_val = str(row[f]) if row[f] is not None else ""
            if new_val != old_val:
                antes[f] = old_val
                despues[f] = new_val
                updates.append(f"{f} = ?")
                params.append(new_val)

    if updates:
        params.append(row['numero_control'])
        cursor.execute(f"UPDATE usuarios SET {', '.join(updates)} WHERE numero_control = ?", params)
        log_movimiento(operador, 'EDICION_USUARIO', 'Usuario', row['numero_control'], antes=antes, despues=despues, db=db)
        db.commit()

    return get_usuario_by_nc(row['numero_control'])


def set_usuario_activo(nc: str, activo: bool, operador: str) -> dict:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM usuarios WHERE LOWER(numero_control) = LOWER(?)", (nc,))
    row = cursor.fetchone()
    if not row:
        raise BusinessError("El usuario no existe.", status_code=404)

    real_nc = row['numero_control']
    if not activo and real_nc.lower() == (operador or '').lower():
        raise BusinessError("No puedes desactivar tu propia cuenta.", status_code=409, code="AUTO_DESACTIVACION")

    old_activo = bool(row['activo'])
    if old_activo != activo:
        cursor.execute("UPDATE usuarios SET activo = ? WHERE numero_control = ?", (1 if activo else 0, real_nc))
        tipo_mov = 'REACTIVACION_USUARIO' if activo else 'DESACTIVACION_USUARIO'
        log_movimiento(operador, tipo_mov, 'Usuario', real_nc, antes={'activo': old_activo}, despues={'activo': activo}, db=db)
        db.commit()

    return get_usuario_by_nc(real_nc)


# ── Equipos (UC-03, RF-04, RF-05) ───────────────────────────────────────────

def list_equipos() -> list[dict]:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM equipos ORDER BY clave ASC")
    rows = cursor.fetchall()
    return [to_equipo_dict(r) for r in rows]


def get_equipo_by_clave(clave: str) -> dict:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM equipos WHERE LOWER(clave) = LOWER(?)", (clave,))
    row = cursor.fetchone()
    if not row:
        raise BusinessError("El equipo no existe.", status_code=404)
    return to_equipo_dict(row)


def create_equipo(data: dict, operador: str) -> dict:
    clave = (data.get('clave') or '').strip()
    nombre = (data.get('nombre') or '').strip()
    tipo = data.get('tipo')
    marca = (data.get('marca') or '').strip()
    modelo = (data.get('modelo') or '').strip()
    numero_serie = (data.get('numeroSerie') or '').strip()
    estado = data.get('estado') or 'DISPONIBLE'

    if not clave or not nombre or not tipo or not marca or not modelo or not numero_serie:
        raise BusinessError("Revisa los datos marcados.", status_code=422)

    db = get_db()
    cursor = db.cursor()
    fields = {}

    cursor.execute("SELECT 1 FROM equipos WHERE LOWER(clave) = LOWER(?)", (clave,))
    if cursor.fetchone():
        fields['clave'] = "Ya existe un equipo con esa clave."

    cursor.execute("SELECT 1 FROM equipos WHERE LOWER(numero_serie) = LOWER(?)", (numero_serie,))
    if cursor.fetchone():
        fields['numeroSerie'] = "Ya existe un equipo con ese número de serie."

    if fields:
        raise BusinessError("Hay datos duplicados.", status_code=409, code="EQUIPO_DUPLICADO", fields=fields)

    cursor.execute(
        """INSERT INTO equipos(clave, nombre, tipo, marca, modelo, numero_serie, estado)
           VALUES(?,?,?,?,?,?,?)""",
        (clave, nombre, tipo, marca, modelo, numero_serie, estado)
    )

    log_movimiento(operador, 'ALTA_EQUIPO', 'Equipo', clave, antes=None, despues={'nombre': nombre, 'tipo': tipo, 'estado': estado}, db=db)
    db.commit()

    return get_equipo_by_clave(clave)


def update_equipo(clave: str, data: dict, operador: str) -> dict:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM equipos WHERE LOWER(clave) = LOWER(?)", (clave,))
    row = cursor.fetchone()
    if not row:
        raise BusinessError("El equipo no existe.", status_code=404)

    if row['estado'] == 'BAJA':
        raise BusinessError("No se puede editar un equipo dado de baja.", status_code=409)

    real_clave = row['clave']
    new_serie = (data.get('numeroSerie') or '').strip() if 'numeroSerie' in data else None
    if new_serie and new_serie.lower() != row['numero_serie'].lower():
        cursor.execute("SELECT 1 FROM equipos WHERE LOWER(numero_serie) = LOWER(?) AND clave != ?", (new_serie, real_clave))
        if cursor.fetchone():
            raise BusinessError("Hay datos duplicados.", status_code=409, fields={"numeroSerie": "Ya existe un equipo con ese número de serie."})

    new_estado = data.get('estado')
    if new_estado and new_estado != row['estado']:
        if row['estado'] == 'PRESTAMO' or new_estado in ('PRESTAMO', 'BAJA'):
            raise BusinessError("Ese cambio de estado no se permite desde la edición.", status_code=409, code="CAMBIO_ESTADO_INVALIDO")

    mapping = {
        'nombre': 'nombre',
        'tipo': 'tipo',
        'marca': 'marca',
        'modelo': 'modelo',
        'numeroSerie': 'numero_serie',
        'estado': 'estado',
    }
    antes = {}
    despues = {}
    updates = []
    params = []

    for frontend_field, db_col in mapping.items():
        if frontend_field in data and data[frontend_field] is not None:
            new_v = str(data[frontend_field]).strip()
            old_v = str(row[db_col])
            if new_v != old_v:
                antes[frontend_field] = old_v
                despues[frontend_field] = new_v
                updates.append(f"{db_col} = ?")
                params.append(new_v)

    if updates:
        params.append(real_clave)
        cursor.execute(f"UPDATE equipos SET {', '.join(updates)} WHERE clave = ?", params)
        tipo_mov = 'CAMBIO_ESTADO_EQUIPO' if (len(despues) == 1 and 'estado' in despues) else 'EDICION_EQUIPO'
        log_movimiento(operador, tipo_mov, 'Equipo', real_clave, antes=antes, despues=despues, db=db)
        db.commit()

    return get_equipo_by_clave(real_clave)


def dar_de_baja_equipo(clave: str, operador: str) -> dict:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM equipos WHERE LOWER(clave) = LOWER(?)", (clave,))
    row = cursor.fetchone()
    if not row:
        raise BusinessError("El equipo no existe.", status_code=404)

    if row['estado'] == 'PRESTAMO':
        raise BusinessError("El equipo está prestado. Registra su devolución antes de darlo de baja.", status_code=409, code="EQUIPO_EN_PRESTAMO")

    if row['estado'] == 'BAJA':
        raise BusinessError("El equipo ya está dado de baja.", status_code=409)

    real_clave = row['clave']
    cursor.execute("UPDATE equipos SET estado = 'BAJA' WHERE clave = ?", (real_clave,))
    log_movimiento(operador, 'BAJA_EQUIPO', 'Equipo', real_clave, antes={'estado': row['estado']}, despues={'estado': 'BAJA'}, db=db)
    db.commit()

    return get_equipo_by_clave(real_clave)


# ── Préstamos (UC-05, RF-06, RF-07, RF-09, FM-04) ───────────────────────────

def list_prestamos_abiertos() -> list[dict]:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM prestamos WHERE fecha_devolucion_real IS NULL ORDER BY fecha_prestamo DESC")
    rows = cursor.fetchall()
    return [to_prestamo_dict(r, db) for r in rows]


def registrar_prestamo(numero_control: str, clave_equipo: str, operador: str) -> dict:
    db = get_db()
    cursor = db.cursor()

    cursor.execute("SELECT * FROM usuarios WHERE LOWER(numero_control) = LOWER(?)", (numero_control,))
    user = cursor.fetchone()
    if not user:
        raise BusinessError("El usuario no existe.", status_code=404)

    if not user['activo']:
        raise BusinessError("El usuario está desactivado y no puede recibir préstamos.", status_code=409, code="USUARIO_INACTIVO")

    real_nc = user['numero_control']

    if get_user_overdue_count(real_nc, db) > 0:
        raise BusinessError(
            "El usuario tiene préstamos vencidos y no puede recibir uno nuevo hasta devolverlos.",
            status_code=409,
            code="USUARIO_BLOQUEADO"
        )

    cursor.execute("SELECT * FROM equipos WHERE LOWER(clave) = LOWER(?)", (clave_equipo,))
    equipo = cursor.fetchone()
    if not equipo:
        raise BusinessError("El equipo no existe.", status_code=404)

    real_clave = equipo['clave']
    if equipo['estado'] != 'DISPONIBLE':
        raise BusinessError("El equipo no está disponible para préstamo.", status_code=409, code="EQUIPO_NO_DISPONIBLE")

    today = today_iso()
    fecha_prevista = add_days(today, LOAN_DAYS)

    cursor.execute(
        """INSERT INTO prestamos(numero_control, clave_equipo, fecha_prestamo, fecha_devolucion_prev, fecha_devolucion_real, observaciones, entrego)
           VALUES (?, ?, ?, ?, NULL, '', ?)""",
        (real_nc, real_clave, today, fecha_prevista, operador)
    )
    prestamo_id = cursor.lastrowid

    cursor.execute("UPDATE equipos SET estado = 'PRESTAMO' WHERE clave = ?", (real_clave,))

    log_movimiento(operador, 'PRESTAMO', 'Préstamo', str(prestamo_id), antes=None,
                   despues={'usuario': real_nc, 'equipo': real_clave, 'fechaDevolucionPrevista': fecha_prevista}, db=db)
    log_movimiento(operador, 'CAMBIO_ESTADO_EQUIPO', 'Equipo', real_clave,
                   antes={'estado': 'DISPONIBLE'}, despues={'estado': 'PRESTAMO'}, db=db)

    db.commit()

    cursor.execute("SELECT * FROM prestamos WHERE id = ?", (prestamo_id,))
    return to_prestamo_dict(cursor.fetchone(), db)


# ── Devoluciones (UC-06, RF-08, FM-05, DD-03) ────────────────────────────────

def registrar_devoluciones(items: list[dict], operador: str) -> list[dict]:
    if not items:
        return []

    db = get_db()
    cursor = db.cursor()
    today = today_iso()

    # Fase 1: Validación estricta previa (para que sea atómico: todo o nada)
    targets = []
    for item in items:
        pid = item.get('prestamoId')
        f_real = item.get('fechaDevolucionReal')
        estado_eq = item.get('estadoEquipo')
        obs = (item.get('observaciones') or '').strip()

        cursor.execute("SELECT * FROM prestamos WHERE id = ?", (pid,))
        loan = cursor.fetchone()
        if not loan:
            raise BusinessError(f"El préstamo {pid} no existe.", status_code=404)

        if loan['fecha_devolucion_real']:
            raise BusinessError(f"El préstamo {pid} ya fue devuelto.", status_code=409)

        if estado_eq not in ('DISPONIBLE', 'MANTENIMIENTO'):
            raise BusinessError("Estado de equipo no válido.", status_code=422)

        if estado_eq == 'MANTENIMIENTO' and not obs:
            raise BusinessError("Las observaciones son obligatorias cuando el equipo pasa a Mantenimiento.", status_code=422)

        if not f_real or f_real < loan['fecha_prestamo'] or f_real > today:
            raise BusinessError("La fecha de devolución debe estar entre la fecha del préstamo y hoy.", status_code=422)

        targets.append({
            'loan': loan,
            'fecha_real': f_real,
            'estado_eq': estado_eq,
            'obs': obs
        })

    # Fase 2: Aplicación de cambios
    results = []
    for t in targets:
        loan = t['loan']
        f_real = t['fecha_real']
        estado_eq = t['estado_eq']
        obs = t['obs']
        pid = loan['id']
        clave_eq = loan['clave_equipo']

        cursor.execute(
            """UPDATE prestamos
               SET fecha_devolucion_real = ?, estado_equipo_dev = ?, observaciones = ?, recibio = ?
               WHERE id = ?""",
            (f_real, estado_eq, obs, operador, pid)
        )

        cursor.execute("UPDATE equipos SET estado = ? WHERE clave = ?", (estado_eq, clave_eq))

        log_movimiento(operador, 'CAMBIO_ESTADO_EQUIPO', 'Equipo', clave_eq,
                       antes={'estado': 'PRESTAMO'}, despues={'estado': estado_eq}, db=db)
        log_movimiento(operador, 'DEVOLUCION', 'Préstamo', str(pid),
                       antes={'estado': 'Abierto'},
                       despues={'estado': 'Devuelto', 'fechaDevolucionReal': f_real, 'estadoEquipo': estado_eq, 'observaciones': obs or None},
                       db=db)

        cursor.execute("SELECT * FROM prestamos WHERE id = ?", (pid,))
        results.append(to_prestamo_dict(cursor.fetchone(), db))

    db.commit()
    return results


# ── Historial (RF-10, UC-08) ─────────────────────────────────────────────────

def historial_usuario(nc: str) -> list[dict]:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT 1 FROM usuarios WHERE LOWER(numero_control) = LOWER(?)", (nc,))
    if not cursor.fetchone():
        raise BusinessError("El usuario no existe.", status_code=404)

    cursor.execute(
        "SELECT * FROM prestamos WHERE LOWER(numero_control) = LOWER(?) ORDER BY fecha_prestamo DESC",
        (nc,)
    )
    rows = cursor.fetchall()
    return [to_prestamo_dict(r, db) for r in rows]


# ── Reportes (FM-06 a FM-08, RF-11, UC-09) ───────────────────────────────────

def reporte_equipos_disponibles() -> list[dict]:
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT clave, nombre, tipo, marca, estado FROM equipos WHERE estado = 'DISPONIBLE' ORDER BY clave ASC"
    )
    rows = cursor.fetchall()
    return [{
        "clave": r['clave'],
        "nombre": r['nombre'],
        "tipo": r['tipo'],
        "marca": r['marca'],
        "estado": r['estado'],
    } for r in rows]


def reporte_prestamos(periodo: dict) -> list[dict]:
    tipo = periodo.get('tipo', 'mes')
    anio = int(periodo.get('anio', date.today().year))
    mes = int(periodo.get('mes', date.today().month)) if 'mes' in periodo else None

    start, end = period_range(tipo, anio, mes)

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """SELECT * FROM prestamos
           WHERE fecha_prestamo >= ? AND fecha_prestamo <= ?
           ORDER BY fecha_prestamo DESC""",
        (start, end)
    )
    rows = cursor.fetchall()
    return [to_prestamo_dict(r, db) for r in rows]


def reporte_prestamos_vencidos(periodo: dict) -> list[dict]:
    tipo = periodo.get('tipo', 'mes')
    anio = int(periodo.get('anio', date.today().year))
    mes = int(periodo.get('mes', date.today().month)) if 'mes' in periodo else None

    start, end = period_range(tipo, anio, mes)

    db = get_db()
    cursor = db.cursor()
    # Préstamos cuya fecha prevista cayó en el periodo y cuyo estado final sea VENCIDO
    cursor.execute(
        """SELECT * FROM prestamos
           WHERE fecha_devolucion_prev >= ? AND fecha_devolucion_prev <= ?
           ORDER BY fecha_devolucion_prev DESC""",
        (start, end)
    )
    rows = cursor.fetchall()
    all_loans = [to_prestamo_dict(r, db) for r in rows]
    # Filtrar solo los que resultaron vencidos
    return [p for p in all_loans if p['estado'] == 'VENCIDO']


# ── Auditoría (RF-12, UC-10, RA-01) ──────────────────────────────────────────

def list_movimientos(tipo: str = None, desde: str = None, hasta: str = None) -> list[dict]:
    db = get_db()
    cursor = db.cursor()

    query = "SELECT * FROM movimientos WHERE 1=1"
    params = []

    if tipo:
        query += " AND tipo = ?"
        params.append(tipo)

    if desde:
        query += " AND substr(fecha_hora, 1, 10) >= ?"
        params.append(desde)

    if hasta:
        query += " AND substr(fecha_hora, 1, 10) <= ?"
        params.append(hasta)

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    return [to_movimiento_dict(r) for r in rows]
