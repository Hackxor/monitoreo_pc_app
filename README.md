# Sistema de Préstamo de Equipo de Cómputo

> Proyecto de Gestión de Proyectos de Software · Proceso **CMMI Nivel 2** · Ciclo de vida en **cascada con revisiones**
> Periodo: **05/10/2026 – 30/10/2026** (20 días hábiles, 146 h planeadas) · Demostración final: **30/10/2026**

---

## 1. Problemática

Una institución educativa presta a diario y a todas horas equipo de cómputo (laptops, monitores, bocinas, tablets, adaptadores y cables) **sin ningún tipo de registro**, ni siquiera manual. Por eso hoy:

- No se sabe **quién tiene** cada equipo.
- No se sabe **cuándo debe devolverlo**.
- No se sabe **qué equipos están disponibles**.
- Un usuario que no devuelve **no puede detectarse ni sancionarse**.

Riesgos principales: pérdida de equipos y uso no autorizado por falta de trazabilidad.

**Beneficiarios:** alumnos, docentes y personal administrativo.

## 2. Objetivo general

Desarrollar e implantar en cuatro semanas hábiles un sistema que centralice el registro de usuarios, equipos, préstamos y devoluciones, aplique las reglas de disponibilidad y de fecha de devolución, y genere los tres reportes definidos por el cliente.

### Objetivos específicos

| ID | Objetivo | Indicador |
|----|----------|-----------|
| OE-01 | Registrar usuarios (número de control, nombre, correo, teléfono, tipo) | 100 % registrados, sin número de control repetido |
| OE-02 | Registrar el inventario de equipos | 100 % registrado, con clave y número de serie únicos |
| OE-03 | Controlar el estado de cada equipo en tiempo real | Nunca hay un estado doble o inválido |
| OE-04 | Registrar préstamos validando disponibilidad y calculando devolución a 14 días | No se presta un equipo no disponible |
| OE-05 | Registrar devoluciones y actualizar el estado del equipo | Ningún equipo queda en *Préstamo* tras devolverse |
| OE-06 | Bloquear automáticamente a usuarios con préstamos vencidos | El moroso no obtiene préstamo nuevo |
| OE-07 | Generar los tres reportes y exportarlos a PDF | Los tres se generan y exportan correctamente |
| OE-08 | Auditar de forma centralizada todos los movimientos | Todo cambio queda con operador, fecha, hora y detalle |

## 3. Alcance

### Módulos incluidos

| ID | Módulo | Descripción |
|----|--------|-------------|
| M-01 | Autenticación y permisos | Inicio de sesión; el Administrador opera, Alumno y Docente solo consultan |
| M-02 | Usuarios | Alta, edición, desactivación y consulta (no se eliminan) |
| M-03 | Equipos | Alta, edición, baja y consulta; cuatro estados |
| M-04 | Préstamo | Un equipo por préstamo, validación de disponibilidad, devolución a +14 días naturales |
| M-05 | Devolución | Fecha real, estado resultante, observaciones y actualización del equipo |
| M-06 | Vencimientos | Detección de préstamos vencidos y bloqueo del usuario |
| M-07 | Reportes | Tres reportes exportables a PDF |
| M-08 | Auditoría | Tabla centralizada de movimientos en la base de datos |

### Fuera del alcance

| ID | Exclusión | Motivo |
|----|-----------|--------|
| X-01 | Correos, notificaciones o recordatorios | Indicación del cliente (B5) |
| X-02 | Instalador, ejecutable o certificado digital | Se entrega código fuente y BD |
| X-03 | Filtros extra en reportes (por tipo o por usuario) | Descartados por el cliente (E2, E4) |
| X-04 | Impresión directa | La salida es PDF |
| X-05 | Aplicación móvil | Sistema para computadora |
| X-06 | Carga masiva desde archivo | Captura uno por uno (B7) |
| X-07 | Respaldo/restauración automáticos | No solicitado |
| X-08 | Integración con otros sistemas | No mencionado |

## 4. Funcionalidad mínima del cliente

| # | Funcionalidad | Detalle acordado |
|---|---------------|------------------|
| FM-01 | Registro de usuarios | Número de control (único, obligatorio, formato libre), nombre, correo, teléfono y tipo: **Alumno, Docente, Administrador** |
| FM-02 | Registro de equipos | Clave (única, identificador de operación), nombre, tipo/descripción, marca, modelo, número de serie (único) y estado |
| FM-03 | Estados del equipo | **Disponible · Préstamo · Mantenimiento · Baja** (Baja = retiro definitivo, solo Administrador) |
| FM-04 | Préstamo | 1 equipo ↔ 1 usuario; el sistema valida disponibilidad, fija devolución a 14 días naturales y cambia el estado a *Préstamo* |
| FM-05 | Devolución | Fecha real, estado y observaciones (obligatorias si pasa a *Mantenimiento*); se registra quién recibe |
| FM-06 | Reporte 1 – Equipos disponibles | Nombre, Tipo, Marca, Estado. Sin filtros |
| FM-07 | Reporte 2 – Préstamos por período | Mensual o anual: Usuario, Equipo, Fecha préstamo, Fecha devolución, Estado |
| FM-08 | Reporte 3 – Préstamos vencidos | Mensual o anual, con **días de atraso** |
| RA-01 | Auditoría (propuesta del equipo, **aceptada**) | Quién, cuándo, qué entidad y valores antes/después; se conserva todo sin depurar |

## 5. Reglas de negocio

| ID | Regla |
|----|-------|
| RB-01 | Cada préstamo registra exactamente **un** equipo. Un usuario puede tener varios préstamos abiertos |
| RB-02 | Fecha de devolución prevista = fecha de préstamo **+ 14 días naturales**, igual para todos los tipos; el Administrador no la modifica |
| RB-03 | Solo el Administrador registra préstamos y devoluciones; Alumno y Docente solo consultan |
| RB-04 | Un préstamo vencido (fecha prevista pasada sin devolución) **bloquea automáticamente** nuevos préstamos al usuario; puede seguir entrando y consultando |
| RB-05 | No se presta un equipo que no esté *Disponible*; el estado cambia al prestar y al devolver |
| RB-06 | Los usuarios se **desactivan, nunca se eliminan**, y conservan su historial |
| RB-07 | Toda operación se registra en la tabla de movimientos |
| RB-08 | Funciona en red local, sin internet, y no envía correos |
| — | No hay devolución parcial: cada préstamo se cierra completo; se pueden devolver varios préstamos en un mismo movimiento |
| — | Un equipo dañado pasa directo a *Mantenimiento*, sin autorización adicional |

## 6. Requisitos (SRS)

### Funcionales

| ID | Requisito | Prioridad | Complejidad |
|----|-----------|-----------|-------------|
| RF-01 | Iniciar sesión con usuario y contraseña | Alta | Media (9) |
| RF-02 | Identificar el rol y aplicar permisos | Alta | Media (10) |
| RF-03 | Registrar, editar y desactivar usuarios | Alta | Media (8) |
| RF-04 | Registrar y catalogar equipos | Alta | Media (8) |
| RF-05 | Consultar disponibilidad de equipos | Alta | Baja (5) |
| RF-06 | Registrar préstamo a usuario activo | Alta | **Alta (12)** |
| RF-07 | Calcular fecha de devolución (+14 días) | Alta | Baja (7) |
| RF-08 | Registrar devolución y liberar el equipo | Alta | Media (10) |
| RF-09 | Detectar vencidos y bloquear al moroso | Alta | Media (10) |
| RF-10 | Consultar historial (propio / cualquiera si es Admin) | Media | Baja (7) |
| RF-11 | Generar los tres reportes en PDF | Media | **Alta (12)** |
| RF-12 | Registrar movimientos en auditoría | Alta | Media (10) |

Complejidad global del sistema: **MEDIA-ALTA**, concentrada en préstamo/devolución (WBS 5.4) y reportes/PDF (WBS 5.5).

### No funcionales

| ID | Requisito | Tipo |
|----|-----------|------|
| RNF-01 | MariaDB centralizada en la red local | Tecnología |
| RNF-02 | Hasta 20 usuarios concurrentes sin degradación | Rendimiento |
| RNF-03 | Consultas de catálogo en < 5 s | Rendimiento |
| RNF-04 | Interfaz gráfica comprensible sin capacitación extensa | Usabilidad |
| RNF-05 | Contraseñas con hash **SHA-256 + sal**, nunca en texto plano; permisos por rol | Seguridad |
| RNF-06 | Respaldo diario de la base de datos | Disponibilidad |
| RNF-07 | Usuarios desactivados conservan su historial | Datos |
| RNF-08 | Ejecutable en los equipos del laboratorio (cliente-servidor) | Portabilidad |

## 7. Casos de uso

| ID | Caso de uso | Actor | Prioridad |
|----|-------------|-------|-----------|
| UC-01 | Iniciar sesión | Todos | Alta |
| UC-02 | Gestionar usuarios | Administrador | Alta |
| UC-03 | Gestionar equipos | Administrador | Alta |
| UC-04 | Consultar disponibilidad | Todos | Alta |
| UC-05 | Registrar préstamo | Administrador | Alta |
| UC-06 | Registrar devolución | Administrador | Alta |
| UC-07 | Bloqueo por vencido | Sistema | Alta |
| UC-08 | Consultar historial | Todos | Media |
| UC-09 | Generar reportes PDF | Administrador | Media |
| UC-10 | Consultar auditoría | Administrador | Media |
| UC-11 | Validar reglas y excepciones | Sistema | Alta |
| UC-12 | Cerrar sesión | Todos | Alta |

## 8. Arquitectura y tecnología

```text
┌──────────────┐   red local (LAN, sin internet)   ┌──────────────────────────┐
│  Cliente 1   │ ────────────────────────────────▶ │  PC servidor institución │
│  Cliente 2   │ ────────────────────────────────▶ │  MariaDB                 │
│  ... (≈20)   │ ────────────────────────────────▶ │  (usuarios, equipos,     │
└──────────────┘                                   │   préstamos, movimientos)│
 Windows 10 / 11                                   └──────────────────────────┘
```

- **Arquitectura cliente-servidor** (DD-01). SQLite descartado porque no soporta 20 escrituras concurrentes.
- **Base de datos:** MariaDB, con acceso privilegiado por usuario y solo desde la red local.
- **Lenguaje:** Python (estándar PEP 8).
- **Sistema operativo de los clientes:** Windows 10 y 11.
- **Auditoría:** una sola tabla `movimientos` y un único servicio de registro (mitigación R-10).
- **Pendiente para 4.1:** biblioteca gráfica y forma de empaquetado (riesgo R-02).

## 9. Interfaz (prototipo)

| Ventana | Acceso | Contenido |
|---------|--------|-----------|
| V-01 Iniciar sesión | Todos | Usuario, contraseña, *Entrar* |
| V-02 Panel principal | Todos | Menú según el rol |
| V-03 Equipos | Admin | Catálogo; alta y edición |
| V-04 Usuarios | Admin | Alta, edición, desactivación |
| V-05 Nuevo préstamo | Admin | Usuario + equipo disponible; muestra devolución prevista y aviso de bloqueo |
| V-06 Devoluciones | Admin | Préstamos vigentes y vencidos |
| V-07 Reportes | Admin | Tres reportes, exportación a PDF |
| V-08 Auditoría | Admin | Movimientos con filtro por tipo y fecha |
| V-09 Consulta | Alumno / Docente | Disponibilidad e historial propio |

Guía: ventana de 1024×600 redimensionable, mensajes en español, atajos (F1 ayuda, F6 préstamo) y barra de estado con usuario y rol.

## 10. Criterios de aceptación

| ID | Req. | Criterio | Prueba |
|----|------|----------|--------|
| AC-01 | RF-01 | Credenciales válidas entran; inválidas muestran error | TC-01 |
| AC-02 | RF-02 | Las opciones visibles corresponden al rol | TC-01 |
| AC-03 | RF-03 | Alta/edición/desactivación; los inactivos no inician sesión | TC-02 |
| AC-04 | RF-04 | Equipos sin duplicados | TC-02 |
| AC-05 | RF-05 | Disponibilidad actualizada para todos | TC-02 |
| AC-06 | RF-06 | Préstamo solo con usuario activo y equipo disponible | TC-03 |
| AC-07 | RF-07 | Devolución prevista = préstamo + 14 días exactos | TC-03 |
| AC-08 | RF-08 | Al devolver, el equipo vuelve a *Disponible* y el préstamo se cierra | TC-03 |
| AC-09 | RF-09 | Vencido marcado y moroso bloqueado | TC-03 |
| AC-10 | RF-10 | Historial propio / de cualquiera para Admin | TC-04 |
| AC-11 | RF-11 | Tres reportes en PDF con datos correctos | TC-04 |
| AC-12 | RF-12 | Cada movimiento queda en auditoría | TC-04 |
| AC-13 | UC-11 | Operaciones inválidas rechazadas con mensaje claro | TC-03 |
| AC-14 | RNF-05 | Contraseñas no guardadas en texto claro | TC-01 |
| AC-15 | RNF-01/02 | MariaDB central con 20 usuarios concurrentes | TC-04 |

Lo que **no puede fallar** según el cliente: la generación de reportes.

## 11. Planificación

### Hitos por fase

| Fase | Fechas | Días | Horas | Hito de salida |
|------|--------|------|-------|----------------|
| 1. Inicio | 05–07/10 | 3 | 12.5 | Alcance y requisitos levantados |
| 2. Planificación | 08–09/10 | 2 | 15.5 | Plan, WBS y cronograma aprobados |
| 3. Análisis | 12–15/10 | 4 | 25.0 | SRS, casos de uso y línea base (15/10) |
| 4. Diseño | 16–20/10 | 3 | 20.5 | Arquitectura y diseño aprobados |
| 5. Codificación | 21–26/10 | 4 | 38.0 | Módulos completos |
| 6. Pruebas QA | 27–28/10 | 2 | 18.5 | Reporte de defectos cerrado |
| 7. Implementación | 29–30/10 | 2 | 16.0 | Acta de entrega firmada |
| **Total** | | **20** | **146.0** | 50 paquetes de trabajo |

### Codificación (WBS 5)

| WBS | Paquete | Horas | Responsable |
|-----|---------|-------|-------------|
| 5.1 | Entorno de desarrollo | 3.0 | Javier |
| 5.2 | Autenticación y matriz de permisos | 7.0 | Javier y José |
| 5.3 | Registro de usuarios y equipos | 7.0 | José |
| 5.4 | Préstamo, devolución y bloqueo por vencido | 9.0 | Javier y José |
| 5.5 | Reportes, exportación PDF y auditoría | 8.0 | José |

### Equipo

| Rol | Integrante |
|-----|-----------|
| Líder del proyecto (PM) | Marco Antonio Muñoz Malpica |
| Analista de requisitos | Luis Miguel Villegas Almanza |
| Arquitecto de software | Javier Antonio Rodríguez Morales |
| Desarrollador | José Luis López Barrón |
| Aseguramiento de calidad (QA) | José Oliver Guzmán Camacho |
| Tester | Axel Fernando Gutiérrez |
| Cliente / patrocinador | Prof. Israel Durán Belman |

## 12. Riesgos principales

| ID | Riesgo | Nivel | Respuesta |
|----|--------|-------|-----------|
| R-01 | Plazo ajustado (4 semanas desde cero) | **20 Alto** | Hitos por fase; avance medido por entregables |
| R-02 | Stack técnico sin cerrar | **16 Alto** | Cerrar la decisión en 4.1 antes de codificar |
| R-03 | Concurrencia de 20 usuarios | 12 Medio | Transacciones; prueba de carga en 6.4 |
| R-04 | Punto único de falla (un servidor) | 12 Medio | Respaldos antes de cada entrega |
| R-05 | Alcance ampliado (+5 requisitos) | 12 Medio | Trazabilidad y control de cambios del SRS |
| R-07 | Sin experiencia previa en la pila | 12 Medio | Esqueleto mínimo en 5.1 |
| R-10 | Auditoría dispersa | 12 Medio | Una tabla y un servicio de registro únicos |

## 13. Avance y métricas (al 19/10/2026)

| Fase | HP | HR | Desviación | Eficiencia (HP/HR) | Desv. cronograma | Estado |
|------|----|----|-----------|--------------------|------------------|--------|
| Inicio | 12.5 h | 8.0 h | −36.0 % | 1.56 | +1 día | ✅ QA conforme |
| Planificación | 15.5 h | 9.0 h | −41.9 % | 1.72 | 0 días | ✅ QA conforme |
| Análisis | 25.0 h | 18.5 h | −26.0 % | 1.35 | 1 día | ✅ QA conforme |
| Diseño | 20.5 h | — | — | — | — | ⏳ En curso / pendiente |
| Codificación, Pruebas, Implementación | 72.5 h | — | — | — | — | ⏳ Pendiente |

## 14. Entregables

| ID | Entregable | Formato |
|----|-----------|---------|
| E-01 | Código fuente | Módulos Python + interfaz |
| E-02 | Script de base de datos | SQL (tablas, datos iniciales, usuarios) |
| E-03 | Documentación de las 7 fases (49 documentos) | Word, carpetas por fase, firmados |
| E-04 | Cronograma de actividades | Excel (HP/HR, fechas planeadas y reales) |
| E-05 | Manual de usuario | Word |
| E-06 | Guía de instalación | Word |
| E-07 | Acta de entrega | Word firmada por el cliente |

## 15. Estructura de la documentación

```text
Proyecto2/
├── 01_Inicio/          1.1 Entrevista · 1.2 Minuta de arranque · 1.3 Objetivos · 1.4 Interesados
│                       1.5 Alcance · 1.6 Métricas · 1.7 Checklist QA
├── 02_Planificacion/   2.1 Plan · 2.2 WBS · 2.3 Cronograma (xlsx) · 2.4 Riesgos
│                       2.5 RACI · 2.6 Métricas · 2.7 Checklist QA
└── 03_Analisis/        3.1 SRS · 3.2 Complejidad · 3.3 Casos de uso · 3.4 Prototipo
                        3.5 Criterios de aceptación · 3.6 Trazabilidad · 3.7 Métricas · 3.8 Checklist QA
```

## 16. Inconsistencias detectadas entre documentos

Conviene corregirlas antes de cerrar el Diseño (4.x):

1. **Reportes:** la entrevista (FM-06 a FM-08) y el alcance (M-07) definen *disponibles / por período / vencidos*, pero el SRS (RF-11), UC-09, V-07 y AC-11 hablan de *vigentes / vencidos / historial por usuario*. El cliente descartó el filtro por usuario (E4).
2. **AC-13** referencia un **RF-13** que no existe en el SRS (corresponde a UC-11).
3. **Tipo de aplicación:** 1.3 y 1.5 dicen "sistema web", mientras que 3.4 describe una aplicación de escritorio con ventanas.
4. **Inicio de sesión:** M-01 dice "número de control y refresco"; el SRS dice "usuario y contraseña".
5. **Respaldos:** RNF-06 exige respaldo diario, pero X-07 excluye el respaldo automático.
6. **Estados del equipo:** UC-04 usa *Disponible / En préstamo / No disponible* en lugar de los cuatro estados acordados.
7. **Cronograma 2.3:** las fechas reales de fin de 3.6, 3.7 y 3.8 aparecen como **16/04/2026** (debería ser 10/2026).
8. **Matriz RACI 2.5:** varias actividades tienen más de una "A" (p. ej. 3.1, 3.3, 3.6, 4.1), lo que contradice la regla de una sola A por actividad.
