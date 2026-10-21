# Front end – Sistema de Préstamo de Equipo de Cómputo

> Especificación de la interfaz de usuario, tomada de los documentos 1.1 (Entrevista), 1.5 (Alcance), 3.1 (SRS), 3.3 (Casos de uso), 3.4 (Prototipo) y 3.5 (Criterios de aceptación).
> El diseño detallado corresponde a la actividad **4.4 – Diseñar las interfaces de usuario** (Javier, 16–20/10/2026).

---

## 1. Contexto técnico

| Aspecto | Definición | Fuente |
|---------|-----------|--------|
| Plataforma | Clientes con **Windows 10 / 11** conectados por red local (LAN) | 1.1 G2 |
| Conectividad | Sin internet; todo contra el servidor MariaDB de la LAN | 1.1 G4, DD-01 |
| Lenguaje | Python (PEP 8) | 2.1, 1.5 E-01 |
| Biblioteca gráfica / empaquetado | **Pendiente**: se decide en 4.1 antes de codificar (riesgo R-02) | 3.4, 2.4 |
| Usuarios simultáneos | ≈ 20 | 1.1 G5 |
| Idioma | Español | 3.4 |
| Plataformas excluidas | App móvil (X-05) | 1.5 |

> ⚠️ Los documentos 1.3 y 1.5 dicen "sistema web", pero el prototipo 3.4 describe ventanas de escritorio. Hay que fijar en 4.1 si el front será **escritorio** o **web en la LAN**. Esta especificación no depende de esa decisión.

## 2. Roles y lo que ve cada uno

| Rol | Puede hacer | Menú visible |
|-----|-------------|--------------|
| **Administrador** | Opera todo: usuarios, equipos, préstamos, devoluciones, reportes, auditoría | Préstamos · Devoluciones · Equipos · Usuarios · Reportes · Auditoría · Mi historial |
| **Alumno** | Solo consulta | Disponibilidad · Mi historial |
| **Docente** | Solo consulta | Disponibilidad · Mi historial |

Reglas de la interfaz:
- Tras iniciar sesión, **solo se muestran las opciones del rol** (AC-02).
- Alumno y Docente **no ven ningún control que modifique datos** (CA-08).
- Un usuario bloqueado por vencido **puede entrar y consultar con normalidad**; el bloqueo solo impide que se le registre un préstamo nuevo (1.1 A6).
- Un usuario **desactivado no puede iniciar sesión** (AC-03).

## 3. Mapa de pantallas

```text
V-01 Iniciar sesión
   │
   ▼
V-02 Panel principal (menú por rol)
   ├── Administrador
   │     ├── V-03 Equipos
   │     ├── V-04 Usuarios
   │     ├── V-05 Nuevo préstamo
   │     ├── V-06 Devoluciones
   │     ├── V-07 Reportes ──▶ PDF
   │     └── V-08 Auditoría
   └── Alumno / Docente
         └── V-09 Consulta (disponibilidad + mi historial)

Cerrar sesión (UC-12) ──▶ regresa a V-01 desde cualquier pantalla
```

## 4. Especificación por pantalla

### V-01 · Iniciar sesión — UC-01, RF-01

| Elemento | Detalle |
|----------|---------|
| Campos | Usuario (número de control) · Contraseña (oculta) |
| Acción | Botón **Entrar** (también con Enter) |
| Éxito | Abre V-02 con el menú del rol |
| Error | Mensaje *"Usuario o contraseña incorrectos"*; no indicar cuál de los dos falló |
| Usuario desactivado | Rechazar el acceso con mensaje claro |
| Auditoría | El inicio de sesión se registra como movimiento |

### V-02 · Panel principal — RF-02

- Menú lateral o superior con los módulos del rol (sección 2).
- **Barra de estado** fija con el usuario conectado y su rol.
- Opción **Cerrar sesión** siempre visible.

### V-03 · Equipos (Administrador) — UC-03, RF-04, FM-02/03

**Tabla principal**

| Columna | Notas |
|---------|-------|
| Clave | Única; es el identificador con el que se opera |
| Nombre | |
| Tipo | Catálogo cerrado: Laptop, Monitor, Bocina, Tablet, Adaptador, Cable |
| Marca | |
| Modelo | |
| Número de serie | Único; dato informativo |
| Estado | Disponible · Préstamo · Mantenimiento · Baja |

- **Búsqueda y filtrado** en el listado (1.1 H2).
- Botones: **Nuevo**, **Editar**, **Dar de baja**.

**Formulario de equipo**

| Campo | Control | Validación |
|-------|---------|-----------|
| Clave | Texto | Obligatoria, única, formato libre |
| Nombre | Texto | Obligatorio |
| Tipo | Lista desplegable | Uno de los seis tipos |
| Marca | Texto | Obligatoria |
| Modelo | Texto | Obligatorio |
| Número de serie | Texto | Obligatorio, único |
| Estado | Lista desplegable | Al crear: *Disponible*. *Préstamo* no se asigna a mano: lo pone el sistema |

- **Dar de baja** pide confirmación porque es un **retiro definitivo** (1.1 C5).
- Si la clave o el número de serie ya existen, mostrar un error y no guardar (AC-04).

### V-04 · Usuarios (Administrador) — UC-02, RF-03, FM-01

**Tabla principal:** Número de control · Nombre · Correo · Teléfono · Tipo · Activo/Inactivo · Bloqueado (sí/no). Con búsqueda y filtrado.

Botones: **Nuevo**, **Editar**, **Desactivar** / **Reactivar**. No existe *Eliminar* (RB-06).

**Formulario de usuario**

| Campo | Control | Validación |
|-------|---------|-----------|
| Número de control | Texto | Obligatorio, único, formato libre |
| Nombre | Texto | Obligatorio |
| Correo | Texto | Formato de correo |
| Teléfono | Texto | Solo dígitos |
| Tipo de usuario | Lista | Alumno · Docente · Administrador |
| Contraseña | Texto oculto | Obligatoria al crear; se guarda con hash SHA-256 + sal (lo hace el back end) |

- La captura es **uno por uno**; no hay importación desde Excel (X-06).
- Desde el usuario se puede abrir su **historial de préstamos** (RF-10).

### V-05 · Nuevo préstamo (Administrador) — UC-05, RF-06/07/09, FM-04

| Elemento | Detalle |
|----------|---------|
| Selector de usuario | Solo usuarios **activos**; búsqueda por número de control o nombre |
| Selector de equipo | Solo equipos **Disponibles**; búsqueda por clave o nombre |
| Fecha de préstamo | Hoy, de solo lectura |
| Fecha de devolución prevista | **Calculada**: préstamo + 14 días naturales, de solo lectura (DD-04) |
| Acción | Botón **Registrar préstamo** (atajo **F6**) |

Comportamiento:
- **1 préstamo = 1 equipo.** Para prestar varios equipos al mismo usuario se registran varios préstamos.
- Si el usuario tiene un préstamo vencido, mostrar el **aviso de bloqueo** y deshabilitar el registro (RB-04).
- Si el equipo dejó de estar disponible (otro operador lo prestó al mismo tiempo), mostrar *"El equipo no está disponible"* y refrescar la lista (D5, AC-06).
- Al confirmar, mostrar la fecha de devolución prevista y un mensaje de éxito.

### V-06 · Devoluciones (Administrador) — UC-06, RF-08, FM-05

**Lista de préstamos abiertos:** Usuario · Equipo (clave y nombre) · Fecha de préstamo · Fecha prevista · Estado (*Vigente* / *Vencido*) · Días de atraso. Los vencidos se resaltan en color.

- Permite **seleccionar varios préstamos** y devolverlos en un mismo movimiento (D6, DD-03).
- No hay devolución parcial: cada préstamo seleccionado se cierra completo.

**Formulario de devolución (por préstamo)**

| Campo | Control | Validación |
|-------|---------|-----------|
| Fecha real de devolución | Fecha (hoy por defecto) | No anterior a la fecha del préstamo |
| Estado del equipo | Opción | *Disponible* o *Mantenimiento* (dañado) |
| Observaciones | Texto multilínea | **Obligatorias si el estado es Mantenimiento** (D8) |
| Recibe | Automático | El Administrador que tiene la sesión abierta (D10) |

- Un equipo dañado pasa directo a *Mantenimiento*, sin pedir otra autorización (D9).
- Al devolver el último préstamo vencido de un usuario, el bloqueo se levanta (UC-06).

### V-07 · Reportes (Administrador) — UC-09, RF-11, FM-06/07/08

Tres botones, uno por reporte. Cada reporte se ve en pantalla y se puede **Exportar a PDF**. No hay impresión directa (X-04).

| Reporte | Parámetros | Columnas |
|---------|-----------|----------|
| **1. Equipos disponibles** | Ninguno, sin filtros | Nombre · Tipo · Marca · Estado |
| **2. Préstamos por período** | Período: **Mes** (mes + año) o **Año** | Usuario · Equipo · Fecha de préstamo · Fecha de devolución · Estado |
| **3. Préstamos vencidos** | Período: **Mes** o **Año** | Usuario · Equipo · Fecha de préstamo · Fecha prevista · **Días de atraso** |

- Sin filtro por tipo de equipo ni por usuario (X-03).
- Según el cliente, **esto es lo que no puede fallar** (1.1 I2): un reporte sin resultados debe mostrar *"Sin registros para el período"*, no un error.
- La plantilla del PDF se define en 4.3 y se valida en 5.5 (riesgo R-09).

> ⚠️ El SRS (RF-11), UC-09 y V-07 en 3.4 nombran estos reportes como *vigentes / vencidos / historial por usuario*. Esta especificación sigue lo que acordó el cliente en la entrevista (FM-06 a FM-08). Hay que unificarlo en el SRS.

### V-08 · Auditoría (Administrador) — UC-10, RF-12

| Columna | Detalle |
|---------|---------|
| Fecha y hora | |
| Operador | Quién lo ejecutó |
| Tipo de movimiento | Inicio de sesión, alta, edición, desactivación, préstamo, devolución, cambio de estado, bloqueo |
| Entidad afectada | Usuario / Equipo / Préstamo + identificador |
| Detalle | Valor **antes** y **después** |

- Filtros por **tipo** y por **rango de fechas**.
- Es **solo lectura**: no se puede editar ni borrar nada; se conserva todo (F4).

### V-09 · Consulta (Alumno / Docente) — UC-04, UC-08, RF-05/10

- **Disponibilidad:** tabla de equipos con Nombre · Tipo · Marca · Estado, con búsqueda.
- **Mi historial:** préstamos propios con Equipo · Fecha de préstamo · Fecha prevista · Fecha real · Estado.
- Si el usuario está bloqueado, mostrar un **aviso informativo** con el préstamo vencido que lo causa.
- Ningún botón de alta, edición ni eliminación.

## 5. Flujo principal (3.4)

1. El usuario inicia sesión en V-01.
2. El sistema abre V-02 con el menú de su rol.
3. El Administrador registra en V-05 el préstamo de un equipo disponible a un usuario activo.
4. El sistema muestra la fecha de devolución prevista y registra el movimiento.
5. En la devolución, el Administrador usa V-06 y el sistema libera el equipo.
6. Si hay un préstamo vencido, V-05 muestra el aviso de bloqueo para ese usuario.
7. El Administrador genera los reportes en PDF desde V-07.

## 6. Mensajes y validaciones (UC-11, AC-13)

Se usan ventanas emergentes tanto de aviso como de confirmación (1.1 H4).

| Situación | Tipo | Mensaje sugerido |
|-----------|------|------------------|
| Credenciales incorrectas | Error | "Usuario o contraseña incorrectos." |
| Usuario desactivado intenta entrar | Error | "Tu cuenta está desactivada. Acude con el Administrador." |
| Clave o número de serie duplicado | Error | "Ya existe un equipo con esa clave / número de serie." |
| Número de control duplicado | Error | "Ya existe un usuario con ese número de control." |
| Equipo no disponible | Error | "El equipo no está disponible para préstamo." |
| Usuario inactivo en préstamo | Error | "El usuario está desactivado." |
| Usuario con préstamo vencido | Advertencia | "El usuario tiene préstamos vencidos y no puede recibir uno nuevo." |
| Mantenimiento sin observaciones | Error | "Describe el daño en Observaciones." |
| Fecha de devolución incoherente | Error | "La fecha de devolución no puede ser anterior al préstamo." |
| Dar de baja un equipo | Confirmación | "La baja es definitiva. ¿Continuar?" |
| Desactivar un usuario | Confirmación | "El usuario conservará su historial. ¿Continuar?" |
| Operación exitosa | Éxito | "Préstamo registrado. Devolución prevista: dd/mm/aaaa." |

Los mensajes van **en color según su tipo** (error, advertencia, éxito) y siempre con texto, para no depender solo del color.

## 7. Guía visual y de usabilidad

| Elemento | Guía |
|----------|------|
| Tamaño de ventana | 1024 × 600 px mínimo, redimensionable |
| Diseño | Paneles con una tabla principal y acciones arriba |
| Listados | Búsqueda y filtrado en todas las tablas |
| Fechas | Formato dd/mm/aaaa |
| Atajos | **F1** ayuda · **F6** nuevo préstamo |
| Barra de estado | Usuario conectado y rol |
| Estados del equipo | Etiqueta con color + texto (Disponible, Préstamo, Mantenimiento, Baja) |
| Vencidos | Fila resaltada y columna de días de atraso |
| Aprendizaje | Comprensible sin capacitación extensa; el manual de usuario (E-05) es apoyo (RNF-04) |
| Rendimiento | Las consultas del catálogo se muestran en menos de 5 s (RNF-03) |

## 8. Trazabilidad del front end

| Pantalla | Casos de uso | Requisitos | Criterios |
|----------|--------------|-----------|-----------|
| V-01 | UC-01, UC-12 | RF-01, RNF-05 | AC-01, AC-14 |
| V-02 | UC-01 | RF-02 | AC-02 |
| V-03 | UC-03, UC-04 | RF-04 | AC-04 |
| V-04 | UC-02 | RF-03 | AC-03 |
| V-05 | UC-05, UC-07, UC-11 | RF-06, RF-07, RF-09 | AC-06, AC-07, AC-09, AC-13 |
| V-06 | UC-06, UC-11 | RF-08 | AC-08, AC-13 |
| V-07 | UC-09 | RF-11 | AC-11 |
| V-08 | UC-10 | RF-12 | AC-12 |
| V-09 | UC-04, UC-08 | RF-05, RF-10 | AC-05, AC-10 |

## 9. Pendientes para Diseño (4.4)

1. Elegir la biblioteca gráfica y si el front será de escritorio o web en la LAN (4.1, R-02).
2. Unificar los nombres y columnas de los tres reportes entre la entrevista y el SRS.
3. Definir la plantilla del PDF (encabezado, logotipo, fecha de generación, paginación).
4. Hacer los wireframes de V-01 a V-09 a partir de esta especificación.
5. Definir el texto de la ayuda que abre F1.
