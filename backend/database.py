"""
Módulo de base de datos.
Usa SQLite (incluido en Python) como motor de base de datos local.
Esto permite ejecutar el sistema sin necesidad de instalar MariaDB.
"""
import sqlite3
import os
import threading

# Ruta de la base de datos SQLite
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'prestamos.db')

_local = threading.local()


def get_db():
    """Obtiene una conexión a la base de datos para el hilo actual."""
    if not hasattr(_local, 'conn') or _local.conn is None:
        _local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute("PRAGMA foreign_keys=ON")
    return _local.conn


def close_db(e=None):
    """Cierra la conexión al finalizar el contexto de aplicación."""
    conn = getattr(_local, 'conn', None)
    if conn is not None:
        conn.close()
        _local.conn = None


def init_db():
    """Crea las tablas si no existen y siembra datos iniciales."""
    from auth import hash_password

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            numero_control TEXT PRIMARY KEY,
            nombre         TEXT NOT NULL,
            correo         TEXT NOT NULL DEFAULT '',
            telefono       TEXT NOT NULL DEFAULT '',
            tipo           TEXT NOT NULL CHECK(tipo IN ('ALUMNO','DOCENTE','ADMINISTRADOR')),
            activo         INTEGER NOT NULL DEFAULT 1,
            password_hash  TEXT NOT NULL,
            password_salt  TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS equipos (
            clave        TEXT PRIMARY KEY,
            nombre       TEXT NOT NULL,
            tipo         TEXT NOT NULL CHECK(tipo IN ('LAPTOP','MONITOR','BOCINA','TABLET','ADAPTADOR','CABLE')),
            marca        TEXT NOT NULL,
            modelo       TEXT NOT NULL,
            numero_serie TEXT NOT NULL UNIQUE,
            estado       TEXT NOT NULL DEFAULT 'DISPONIBLE'
                         CHECK(estado IN ('DISPONIBLE','PRESTAMO','MANTENIMIENTO','BAJA'))
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prestamos (
            id                    INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_control        TEXT NOT NULL REFERENCES usuarios(numero_control),
            clave_equipo          TEXT NOT NULL REFERENCES equipos(clave),
            fecha_prestamo        TEXT NOT NULL,
            fecha_devolucion_prev TEXT NOT NULL,
            fecha_devolucion_real TEXT,
            estado_equipo_dev     TEXT CHECK(estado_equipo_dev IN ('DISPONIBLE','MANTENIMIENTO')),
            observaciones         TEXT NOT NULL DEFAULT '',
            entrego               TEXT NOT NULL,
            recibio               TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS movimientos (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_hora  TEXT NOT NULL,
            operador    TEXT NOT NULL,
            tipo        TEXT NOT NULL,
            entidad     TEXT NOT NULL,
            entidad_id  TEXT NOT NULL,
            antes       TEXT,
            despues     TEXT
        )
    """)

    conn.commit()

    # Solo sembrar si no hay usuarios
    cursor.execute("SELECT COUNT(*) FROM usuarios")
    if cursor.fetchone()[0] > 0:
        return

    _seed_initial_data(cursor, conn, hash_password)


def _seed_initial_data(cursor, conn, hash_password):
    """Inserta datos iniciales de demostración."""
    import json
    from datetime import date, timedelta, datetime, timezone

    today = date.today()

    def d(offset):
        return (today + timedelta(days=offset)).isoformat()

    # Usuarios
    usuarios = [
        ('ADM-001', 'Laura Mendez Ortiz',        'laura.mendez@institucion.edu.mx',    '4421234567', 'ADMINISTRADOR', 1, 'admin123'),
        ('ADM-002', 'Ricardo Salinas Vega',       'ricardo.salinas@institucion.edu.mx', '4429876543', 'ADMINISTRADOR', 1, 'admin123'),
        ('20230145','Daniela Torres Ruiz',         'daniela.torres@alumnos.edu.mx',     '4425550101', 'ALUMNO',        1, 'alumno123'),
        ('20230211','Kevin Ramirez Luna',           'kevin.ramirez@alumnos.edu.mx',      '4425550102', 'ALUMNO',        1, 'alumno123'),
        ('20220378','Sofia Herrera Campos',         'sofia.herrera@alumnos.edu.mx',      '4425550103', 'ALUMNO',        1, 'alumno123'),
        ('20240019','Emilio Castro Navarro',        'emilio.castro@alumnos.edu.mx',      '4425550104', 'ALUMNO',        1, 'alumno123'),
        ('20210456','Valeria Gomez Ibarra',         'valeria.gomez@alumnos.edu.mx',      '4425550105', 'ALUMNO',        0, 'alumno123'),
        ('DOC-017', 'Hector Aguilar Robles',       'hector.aguilar@institucion.edu.mx', '4425550201', 'DOCENTE',       1, 'docente123'),
        ('DOC-024', 'Patricia Nunez Delgado',      'patricia.nunez@institucion.edu.mx', '4425550202', 'DOCENTE',       1, 'docente123'),
    ]
    for nc, nombre, correo, tel, tipo, activo, pwd in usuarios:
        ph, ps = hash_password(pwd)
        cursor.execute(
            "INSERT INTO usuarios(numero_control,nombre,correo,telefono,tipo,activo,password_hash,password_salt) VALUES(?,?,?,?,?,?,?,?)",
            (nc, nombre, correo, tel, tipo, activo, ph, ps)
        )

    # Equipos
    equipos = [
        ('LAP-001','Laptop Dell Latitude 5440',  'LAPTOP',   'Dell',    'Latitude 5440',     'DL5440-8H2K91',  'DISPONIBLE'),
        ('LAP-002','Laptop Dell Latitude 5440',  'LAPTOP',   'Dell',    'Latitude 5440',     'DL5440-8H2K92',  'PRESTAMO'),
        ('LAP-003','Laptop Lenovo ThinkPad E14', 'LAPTOP',   'Lenovo',  'ThinkPad E14 Gen 5','LNV-E14-55021',  'PRESTAMO'),
        ('LAP-004','Laptop HP ProBook 440',      'LAPTOP',   'HP',      'ProBook 440 G10',   'HP440-5CD3341',  'MANTENIMIENTO'),
        ('LAP-005','Laptop Lenovo ThinkPad E14', 'LAPTOP',   'Lenovo',  'ThinkPad E14 Gen 5','LNV-E14-55022',  'DISPONIBLE'),
        ('MON-001','Monitor 24 pulgadas Full HD','MONITOR',  'Samsung', 'S24C310',           'SMS24-0091AB',   'DISPONIBLE'),
        ('MON-002','Monitor 27 pulgadas QHD',    'MONITOR',  'LG',      '27QN600',           'LG27-77310Q',    'PRESTAMO'),
        ('MON-003','Monitor 22 pulgadas Full HD','MONITOR',  'Acer',    'V226HQL',           'ACR22-11092',    'BAJA'),
        ('BOC-001','Bocina Bluetooth portatil',  'BOCINA',   'JBL',     'Flip 6',            'JBLF6-339201',   'DISPONIBLE'),
        ('BOC-002','Bocinas de escritorio',      'BOCINA',   'Logitech','Z207',              'LGZ207-88123',   'DISPONIBLE'),
        ('TAB-001','Tablet 10.9 pulgadas',       'TABLET',   'Apple',   'iPad 10a gen',      'DMPXK2-10931',   'PRESTAMO'),
        ('TAB-002','Tablet 11 pulgadas',         'TABLET',   'Samsung', 'Galaxy Tab S9 FE',  'SMX510-44020',   'DISPONIBLE'),
        ('ADP-001','Adaptador USB-C a HDMI',     'ADAPTADOR','Ugreen',  'CM297',             'UGC-HDMI-0012',  'DISPONIBLE'),
        ('ADP-002','Adaptador USB-C multipuerto','ADAPTADOR','Anker',   'A8346',             'ANK-8346-7710',  'PRESTAMO'),
        ('ADP-003','Adaptador DisplayPort VGA',  'ADAPTADOR','StarTech','DP2VGA',            'STK-DPV-00451',  'DISPONIBLE'),
        ('CAB-001','Cable HDMI 2 m',             'CABLE',    'Belkin',  'F3Y021',            'BLK-HDMI-2M-01', 'DISPONIBLE'),
        ('CAB-002','Cable de red Cat6 3 m',      'CABLE',    'Steren',  'UTP-6-3',           'STR-CAT6-3M-07', 'DISPONIBLE'),
        ('CAB-003','Cable USB-C 1 m',            'CABLE',    'Anker',   'PowerLine III',     'ANK-USBC-1M-22', 'DISPONIBLE'),
    ]
    for row in equipos:
        cursor.execute(
            "INSERT INTO equipos(clave,nombre,tipo,marca,modelo,numero_serie,estado) VALUES(?,?,?,?,?,?,?)",
            row
        )

    # Prestamos (abiertos + devueltos)
    prestamos = [
        # id, numero_control, clave_equipo, fecha_prestamo, fecha_dev_prev, fecha_dev_real, estado_eq_dev, obs, entrego, recibio
        (1, '20230145','LAP-002',d(-21),d(-7), None,None,'','ADM-001',None),
        (2, '20230145','ADP-002',d(-3), d(11), None,None,'','ADM-001',None),
        (3, '20230211','LAP-003',d(-5), d(9),  None,None,'','ADM-001',None),
        (4, 'DOC-017', 'MON-002',d(-16),d(-2), None,None,'','ADM-001',None),
        (5, '20220378','TAB-001',d(-1), d(13), None,None,'','ADM-001',None),
        (6, '20230211','LAP-001',d(-40),d(-26),d(-28),'DISPONIBLE',   '','ADM-001','ADM-001'),
        (7, '20240019','BOC-001',d(-55),d(-41),d(-44),'DISPONIBLE',   '','ADM-001','ADM-001'),
        (8, 'DOC-024', 'LAP-004',d(-35),d(-21),d(-18),'MANTENIMIENTO','La pantalla presenta lineas verticales.','ADM-001','ADM-001'),
        (9, '20220378','CAB-001',d(-70),d(-56),d(-60),'DISPONIBLE',   '','ADM-001','ADM-001'),
        (10,'20210456','TAB-002',d(-95),d(-81),d(-80),'DISPONIBLE',   '','ADM-001','ADM-001'),
        (11,'DOC-017', 'ADP-001',d(-120),d(-106),d(-109),'DISPONIBLE','','ADM-001','ADM-001'),
        (12,'20230145','MON-001',d(-150),d(-136),d(-140),'DISPONIBLE','','ADM-001','ADM-001'),
        (13,'20240019','LAP-005',d(-200),d(-186),d(-190),'DISPONIBLE','','ADM-001','ADM-001'),
        (14,'DOC-024', 'BOC-002',d(-260),d(-246),d(-250),'DISPONIBLE','','ADM-001','ADM-001'),
        (15,'20230211','CAB-002',d(-12),d(2),   d(-6), 'DISPONIBLE',  '','ADM-001','ADM-001'),
    ]
    for row in prestamos:
        cursor.execute(
            """INSERT INTO prestamos
               (id,numero_control,clave_equipo,fecha_prestamo,
                fecha_devolucion_prev,fecha_devolucion_real,
                estado_equipo_dev,observaciones,entrego,recibio)
               VALUES(?,?,?,?,?,?,?,?,?,?)""",
            row
        )

    def at(minutes_ago):
        return (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).isoformat()

    movs = [
        (at(60*24*21+30),'ADM-001','PRESTAMO','Prestamo','1',None,
         json.dumps({'usuario':'20230145','equipo':'LAP-002','fechaDevolucionPrevista':d(-7)})),
        (at(60*24*18+10),'ADM-001','DEVOLUCION','Prestamo','8',
         json.dumps({'estado':'Vigente'}),
         json.dumps({'estado':'Devuelto','estadoEquipo':'MANTENIMIENTO'})),
        (at(60*24*18+9),'ADM-001','CAMBIO_ESTADO_EQUIPO','Equipo','LAP-004',
         json.dumps({'estado':'PRESTAMO'}),json.dumps({'estado':'MANTENIMIENTO'})),
        (at(60*24*10),'ADM-002','BAJA_EQUIPO','Equipo','MON-003',
         json.dumps({'estado':'MANTENIMIENTO'}),json.dumps({'estado':'BAJA'})),
        (at(60*24*7),'ADM-001','DESACTIVACION_USUARIO','Usuario','20210456',
         json.dumps({'activo':True}),json.dumps({'activo':False})),
        (at(60*24*5),'ADM-001','PRESTAMO','Prestamo','3',None,
         json.dumps({'usuario':'20230211','equipo':'LAP-003'})),
        (at(60*24*3),'ADM-002','PRESTAMO','Prestamo','2',None,
         json.dumps({'usuario':'20230145','equipo':'ADP-002'})),
        (at(60*24*2),'ADM-001','EDICION_EQUIPO','Equipo','TAB-002',
         json.dumps({'modelo':'Galaxy Tab S9'}),json.dumps({'modelo':'Galaxy Tab S9 FE'})),
        (at(60*24+15),'ADM-001','PRESTAMO','Prestamo','5',None,
         json.dumps({'usuario':'20220378','equipo':'TAB-001'})),
    ]
    for mv in movs:
        cursor.execute(
            "INSERT INTO movimientos(fecha_hora,operador,tipo,entidad,entidad_id,antes,despues) VALUES(?,?,?,?,?,?,?)",
            mv
        )

    conn.commit()
