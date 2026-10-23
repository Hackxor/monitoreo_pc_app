-- =============================================================================
-- Sistema de Préstamo de Equipo de Cómputo
-- Entregable E-02: Script de Base de Datos SQL (MariaDB / MySQL)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS prestamo_equipos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE prestamo_equipos;

-- -----------------------------------------------------------------------------
-- 1. Tabla de Usuarios (FM-01, RF-03, RNF-05)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    numero_control VARCHAR(50) NOT NULL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(150) NOT NULL DEFAULT '',
    telefono VARCHAR(30) NOT NULL DEFAULT '',
    tipo ENUM('ALUMNO', 'DOCENTE', 'ADMINISTRADOR') NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    password_hash VARCHAR(64) NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    INDEX idx_usuarios_tipo (tipo),
    INDEX idx_usuarios_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. Tabla de Equipos (FM-02, FM-03, RF-04)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipos (
    clave VARCHAR(50) NOT NULL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    tipo ENUM('LAPTOP', 'MONITOR', 'BOCINA', 'TABLET', 'ADAPTADOR', 'CABLE') NOT NULL,
    marca VARCHAR(80) NOT NULL,
    modelo VARCHAR(80) NOT NULL,
    numero_serie VARCHAR(100) NOT NULL UNIQUE,
    estado ENUM('DISPONIBLE', 'PRESTAMO', 'MANTENIMIENTO', 'BAJA') NOT NULL DEFAULT 'DISPONIBLE',
    INDEX idx_equipos_estado (estado),
    INDEX idx_equipos_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 3. Tabla de Préstamos (FM-04, FM-05, RF-06, RF-07, RF-08, RF-09)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prestamos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_control VARCHAR(50) NOT NULL,
    clave_equipo VARCHAR(50) NOT NULL,
    fecha_prestamo DATE NOT NULL,
    fecha_devolucion_prev DATE NOT NULL,
    fecha_devolucion_real DATE NULL,
    estado_equipo_dev ENUM('DISPONIBLE', 'MANTENIMIENTO') NULL,
    observaciones TEXT NOT NULL DEFAULT '',
    entrego VARCHAR(50) NOT NULL,
    recibio VARCHAR(50) NULL,
    CONSTRAINT fk_prestamos_usuario FOREIGN KEY (numero_control)
        REFERENCES usuarios(numero_control) ON UPDATE CASCADE,
    CONSTRAINT fk_prestamos_equipo FOREIGN KEY (clave_equipo)
        REFERENCES equipos(clave) ON UPDATE CASCADE,
    INDEX idx_prestamos_usuario (numero_control),
    INDEX idx_prestamos_fechas (fecha_prestamo, fecha_devolucion_prev),
    INDEX idx_prestamos_real (fecha_devolucion_real)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 4. Tabla de Auditoría / Movimientos (RF-12, RA-01, M-08)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha_hora DATETIME(3) NOT NULL,
    operador VARCHAR(50) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    entidad_id VARCHAR(50) NOT NULL,
    antes JSON NULL,
    despues JSON NULL,
    INDEX idx_movimientos_tipo (tipo),
    INDEX idx_movimientos_fecha (fecha_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- Datos Semilla Iniciales (Demostración)
-- Contraseñas con SHA-256 + Sal:
-- ADM-001, ADM-002: admin123
-- Alumnos: alumno123
-- Docentes: docente123
-- =============================================================================

INSERT INTO usuarios (numero_control, nombre, correo, telefono, tipo, activo, password_hash, password_salt)
VALUES
('ADM-001', 'Laura Méndez Ortiz', 'laura.mendez@institucion.edu.mx', '4421234567', 'ADMINISTRADOR', 1, '57e324e9336d8d6411be55b71db414546c26ebef8a9f604ec282ec6179e397c2', 'c817293a55fb12d9b1390453e990c01a'),
('ADM-002', 'Ricardo Salinas Vega', 'ricardo.salinas@institucion.edu.mx', '4429876543', 'ADMINISTRADOR', 1, '57e324e9336d8d6411be55b71db414546c26ebef8a9f604ec282ec6179e397c2', 'c817293a55fb12d9b1390453e990c01a'),
('20230145', 'Daniela Torres Ruiz', 'daniela.torres@alumnos.edu.mx', '4425550101', 'ALUMNO', 1, '83c07ea6bcf3a19379872504b2b1bc5963f6a27271e21b2512a20fc79860b73c', 'c817293a55fb12d9b1390453e990c01a'),
('20230211', 'Kevin Ramírez Luna', 'kevin.ramirez@alumnos.edu.mx', '4425550102', 'ALUMNO', 1, '83c07ea6bcf3a19379872504b2b1bc5963f6a27271e21b2512a20fc79860b73c', 'c817293a55fb12d9b1390453e990c01a'),
('20220378', 'Sofía Herrera Campos', 'sofia.herrera@alumnos.edu.mx', '4425550103', 'ALUMNO', 1, '83c07ea6bcf3a19379872504b2b1bc5963f6a27271e21b2512a20fc79860b73c', 'c817293a55fb12d9b1390453e990c01a'),
('20240019', 'Emilio Castro Navarro', 'emilio.castro@alumnos.edu.mx', '4425550104', 'ALUMNO', 1, '83c07ea6bcf3a19379872504b2b1bc5963f6a27271e21b2512a20fc79860b73c', 'c817293a55fb12d9b1390453e990c01a'),
('20210456', 'Valeria Gómez Ibarra', 'valeria.gomez@alumnos.edu.mx', '4425550105', 'ALUMNO', 0, '83c07ea6bcf3a19379872504b2b1bc5963f6a27271e21b2512a20fc79860b73c', 'c817293a55fb12d9b1390453e990c01a'),
('DOC-017', 'Héctor Aguilar Robles', 'hector.aguilar@institucion.edu.mx', '4425550201', 'DOCENTE', 1, '47a5fb1e9ad715e7144e1d6c810ca1c142ba3da504b8dfda855ae245dfef401f', 'c817293a55fb12d9b1390453e990c01a'),
('DOC-024', 'Patricia Núñez Delgado', 'patricia.nunez@institucion.edu.mx', '4425550202', 'DOCENTE', 1, '47a5fb1e9ad715e7144e1d6c810ca1c142ba3da504b8dfda855ae245dfef401f', 'c817293a55fb12d9b1390453e990c01a')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);

INSERT INTO equipos (clave, nombre, tipo, marca, modelo, numero_serie, estado)
VALUES
('LAP-001', 'Laptop Dell Latitude 5440', 'LAPTOP', 'Dell', 'Latitude 5440', 'DL5440-8H2K91', 'DISPONIBLE'),
('LAP-002', 'Laptop Dell Latitude 5440', 'LAPTOP', 'Dell', 'Latitude 5440', 'DL5440-8H2K92', 'PRESTAMO'),
('LAP-003', 'Laptop Lenovo ThinkPad E14', 'LAPTOP', 'Lenovo', 'ThinkPad E14 Gen 5', 'LNV-E14-55021', 'PRESTAMO'),
('LAP-004', 'Laptop HP ProBook 440', 'LAPTOP', 'HP', 'ProBook 440 G10', 'HP440-5CD3341', 'MANTENIMIENTO'),
('LAP-005', 'Laptop Lenovo ThinkPad E14', 'LAPTOP', 'Lenovo', 'ThinkPad E14 Gen 5', 'LNV-E14-55022', 'DISPONIBLE'),
('MON-001', 'Monitor 24" Full HD', 'MONITOR', 'Samsung', 'S24C310', 'SMS24-0091AB', 'DISPONIBLE'),
('MON-002', 'Monitor 27" QHD', 'MONITOR', 'LG', '27QN600', 'LG27-77310Q', 'PRESTAMO'),
('MON-003', 'Monitor 22" Full HD', 'MONITOR', 'Acer', 'V226HQL', 'ACR22-11092', 'BAJA'),
('BOC-001', 'Bocina Bluetooth portátil', 'BOCINA', 'JBL', 'Flip 6', 'JBLF6-339201', 'DISPONIBLE'),
('BOC-002', 'Bocinas de escritorio', 'BOCINA', 'Logitech', 'Z207', 'LGZ207-88123', 'DISPONIBLE'),
('TAB-001', 'Tablet 10.9"', 'TABLET', 'Apple', 'iPad 10a gen', 'DMPXK2-10931', 'PRESTAMO'),
('TAB-002', 'Tablet 11"', 'TABLET', 'Samsung', 'Galaxy Tab S9 FE', 'SMX510-44020', 'DISPONIBLE'),
('ADP-001', 'Adaptador USB-C a HDMI', 'ADAPTADOR', 'Ugreen', 'CM297', 'UGC-HDMI-0012', 'DISPONIBLE'),
('ADP-002', 'Adaptador USB-C multipuerto', 'ADAPTADOR', 'Anker', 'A8346', 'ANK-8346-7710', 'PRESTAMO'),
('ADP-003', 'Adaptador DisplayPort a VGA', 'ADAPTADOR', 'StarTech', 'DP2VGA', 'STK-DPV-00451', 'DISPONIBLE'),
('CAB-001', 'Cable HDMI 2 m', 'CABLE', 'Belkin', 'F3Y021', 'BLK-HDMI-2M-01', 'DISPONIBLE'),
('CAB-002', 'Cable de red Cat6 3 m', 'CABLE', 'Steren', 'UTP-6-3', 'STR-CAT6-3M-07', 'DISPONIBLE'),
('CAB-003', 'Cable USB-C 1 m', 'CABLE', 'Anker', 'PowerLine III', 'ANK-USBC-1M-22', 'DISPONIBLE')
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre);
