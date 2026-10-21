# Front end · Sistema de Préstamo de Equipo de Cómputo

Interfaz web del sistema. Cubre las pantallas V-01 a V-09 del prototipo (3.4) y los requisitos RF-01 a RF-12 del SRS (3.1).

> **Estado:** el front end está completo y funciona en **modo demostración** con datos simulados. **Todavía no existe back end ni documentación de API**, así que la conexión con el servidor está preparada según el contrato que se propone en la sección 5, que el equipo de back end debe confirmar.

---

## 1. Cómo ejecutarlo

No requiere instalar dependencias ni compilar. Basta con servir la carpeta `frontend/` con cualquier servidor estático. Abrir `index.html` con doble clic no funciona, porque los módulos ES necesitan servirse por HTTP.

```bash
python -m http.server 8080 --directory frontend
```

Después se abre `http://localhost:8080`.

Las cuentas de demostración están en [js/services/mock/mockData.js](js/services/mock/mockData.js): un Administrador, un Alumno con préstamo vencido y un Docente.

### Conectar con el back end real

En [index.html](index.html), antes de `js/main.js`, se agrega:

```html
<script>window.APP_CONFIG = { useMock: false, apiBaseUrl: '/api' };</script>
```

Lo ideal es que el mismo servidor Python que expone la API sirva esta carpeta como archivos estáticos. Así no hay problemas de CORS.

## 2. Decisiones técnicas

| Decisión | Motivo |
|----------|--------|
| HTML + CSS + JavaScript (módulos ES), sin framework ni compilación | El sistema debe funcionar **sin internet** en la red local (G4, R-02). No hay CDN, `npm install` ni paso de compilación; cualquier servidor Python lo sirve. |
| Aplicación web (no escritorio) | Los documentos 1.3 y 1.5 hablan de "sistema web" y la arquitectura es cliente-servidor en LAN (DD-01). Así las ~20 computadoras usan el sistema solo con el navegador. |
| Rutas con `#/` (hash) | El servidor no necesita configurar reescritura de rutas. |
| PDF generado en el navegador ([js/pdf/pdfTable.js](js/pdf/pdfTable.js)) | Sin dependencias externas. Usa Helvetica con codificación WinAnsi, que admite acentos y ñ, e incluye paginación, encabezado de tabla repetido y pie de página. |
| Íconos SVG en línea | Funcionan sin conexión. |
| Tipografía **IBM Plex Sans + IBM Plex Mono**, incluida en `fonts/` (licencia SIL OFL 1.1) | Fue creada por IBM para su sistema de diseño Carbon y está pensada para interfaces con muchos datos. Distingue 1/l/I y 0/O, que importa en claves (`LAP-001`) y números de serie, y tiene cifras tabulares para las tablas. Se incluye en el proyecto para que funcione sin internet. |
| Paleta: neutros cálidos, azul marino `#22375A` para las acciones y naranja `#C2501A` como acento | Sigue un patrón común en las guías de bibliotecas universitarias: base neutra y un solo color vivo reservado para lo importante. El naranja recuerda a las etiquetas de inventario y se usa solo en el estado activo y el foco. Todos los textos cumplen contraste WCAG AA (≥ 4.5:1). |
| Sesión en `sessionStorage` | La sesión termina al cerrar la pestaña. El token nunca se guarda en `localStorage`. |

## 3. Estructura

```text
frontend/
├── index.html
├── css/
│   ├── tokens.css        Colores, tipografía, espaciado
│   ├── base.css          Reset y utilidades
│   ├── layout.css        Login, menú lateral, barra superior y de estado, responsivo
│   └── components.css    Botones, formularios, tablas, modales, avisos, pestañas…
└── js/
    ├── main.js           Arranque, enrutador por rol, atajos F1/F6, sesión vencida
    ├── config.js         useMock, apiBaseUrl, tiempo de espera
    ├── routes.js         Pantallas y rol que puede ver cada una
    ├── state/session.js  Usuario autenticado y token
    ├── domain/           Catálogos cerrados (tipos, estados, movimientos) e insignias
    ├── services/
    │   ├── api.js        Punto único de acceso: elige real o simulado
    │   ├── remoteApi.js  Llamadas HTTP según el contrato propuesto (sección 5)
    │   ├── http.js       fetch + token + tiempo de espera + errores normalizados
    │   ├── apiError.js
    │   └── mock/         SOLO DEMOSTRACIÓN: datos y reglas simuladas
    ├── ui/               Componentes reutilizables: tabla, formulario, modal, avisos, lista seleccionable
    ├── pdf/pdfTable.js   Exportación a PDF
    ├── utils/dates.js    Fechas dd/mm/aaaa, +14 días, períodos
    └── views/            Una pantalla por archivo
```

Las vistas solo usan `services/api.js`. Para conectar el back end real basta con cambiar `useMock`, sin tocar ninguna pantalla.

## 4. Pantallas implementadas

| Pantalla | Archivo | Rol | Requisitos |
|----------|---------|-----|-----------|
| V-01 Iniciar sesión | `views/login.js` | Todos | RF-01, AC-01, AC-03 |
| V-02 Panel principal (resumen, menú por rol, barra de estado) | `views/inicio.js`, `views/shell.js` | Admin | RF-02, AC-02 |
| V-03 Equipos: alta, edición, baja con confirmación, filtros | `views/equipos.js` | Admin | RF-04, FM-02, FM-03 |
| V-04 Usuarios: alta, edición, desactivar/reactivar | `views/usuarios.js` | Admin | RF-03, FM-01, RB-06 |
| V-05 Nuevo préstamo (F6) | `views/prestamo.js` | Admin | RF-06, RF-07, RF-09, FM-04 |
| V-06 Devoluciones (una o varias) | `views/devoluciones.js` | Admin | RF-08, FM-05, DD-03 |
| V-07 Reportes 1, 2 y 3 + PDF | `views/reportes.js` | Admin | RF-11, FM-06/07/08 |
| V-08 Auditoría con detalle antes/después | `views/auditoria.js` | Admin | RF-12, RA-01 |
| Historial de cualquier usuario | `views/historial.js` | Admin | RF-10 |
| V-09 Disponibilidad | `views/disponibilidad.js` | Alumno, Docente | RF-05 |
| V-09 Mi historial | `views/historial.js` | Alumno, Docente | RF-10 |

Reglas que aplica la interfaz (el servidor debe volver a validarlas todas):
- Alumno y Docente no ven ninguna acción que modifique datos. Si intentan abrir una ruta de Administrador, se les redirige.
- La fecha de devolución prevista se **muestra** como préstamo + 14 días naturales, pero la que vale es la que devuelve el servidor.
- Los usuarios bloqueados aparecen deshabilitados en el selector de préstamo.
- Un equipo en *Préstamo* no se puede dar de baja ni cambiar de estado desde la edición.
- Las observaciones son obligatorias si el equipo devuelto pasa a *Mantenimiento*.
- La fecha real de devolución debe estar entre la fecha del préstamo y hoy.
- Correo y teléfono se validan en el formulario. La contraseña inicial debe tener al menos 8 caracteres; esa regla la decidí yo, no viene de los documentos.

## 5. Contrato de API propuesto (pendiente de confirmar con back end)

Todas las rutas cuelgan de `apiBaseUrl`. Se usa JSON y el encabezado `Authorization: Bearer <token>` después del inicio de sesión. Si alguna ruta o forma cambia, solo hay que ajustar [js/services/remoteApi.js](js/services/remoteApi.js).

### Errores

```json
{ "message": "Texto para el usuario", "code": "EQUIPO_NO_DISPONIBLE", "fields": { "clave": "Ya existe un equipo con esa clave." } }
```

Códigos HTTP esperados: 401 (sesión inválida: el front end cierra la sesión), 403 (sin permiso), 404, 409 (conflicto de negocio), 422 (datos inválidos).
Códigos de negocio que la interfaz trata de forma especial: `EQUIPO_NO_DISPONIBLE`, `USUARIO_BLOQUEADO` y `USUARIO_INACTIVO`; con cualquiera de ellos se recargan las listas de préstamo.

### Endpoints

| Método | Ruta | Cuerpo / parámetros | Respuesta | Rol |
|--------|------|---------------------|-----------|-----|
| POST | `/auth/login` | `{ numeroControl, password }` | `{ token, usuario: Usuario }` | Público |
| POST | `/auth/logout` | — | — | Todos |
| GET | `/usuarios` | — | `Usuario[]` | Admin |
| POST | `/usuarios` | `{ numeroControl, nombre, correo, telefono, tipo, password }` | `Usuario` | Admin |
| PUT | `/usuarios/{numeroControl}` | `{ nombre, correo, telefono, tipo }` | `Usuario` | Admin |
| PATCH | `/usuarios/{numeroControl}/activo` | `{ activo: boolean }` | `Usuario` | Admin |
| GET | `/usuarios/{numeroControl}/prestamos` | — | `Prestamo[]` | Admin |
| GET | `/me/prestamos` | — | `Prestamo[]` | Todos |
| GET | `/equipos` | — | `Equipo[]` | Todos |
| POST | `/equipos` | `{ clave, nombre, tipo, marca, modelo, numeroSerie, estado }` | `Equipo` | Admin |
| PUT | `/equipos/{clave}` | `{ nombre, tipo, marca, modelo, numeroSerie, estado? }` | `Equipo` | Admin |
| POST | `/equipos/{clave}/baja` | — | `Equipo` | Admin |
| GET | `/prestamos?estado=ABIERTO` | — | `Prestamo[]` (vigentes y vencidos) | Admin |
| POST | `/prestamos` | `{ numeroControl, claveEquipo }` | `Prestamo` | Admin |
| POST | `/devoluciones` | `{ devoluciones: [{ prestamoId, fechaDevolucionReal, estadoEquipo, observaciones }] }` | `Prestamo[]` | Admin |
| GET | `/reportes/equipos-disponibles` | — | `{ clave, nombre, tipo, marca, estado }[]` | Admin |
| GET | `/reportes/prestamos` | `?tipo=mes&anio=2026&mes=10` o `?tipo=anio&anio=2026` | `Prestamo[]` | Admin |
| GET | `/reportes/prestamos-vencidos` | igual que el anterior | `Prestamo[]` | Admin |
| GET | `/movimientos` | `?tipo=&desde=AAAA-MM-DD&hasta=AAAA-MM-DD` | `Movimiento[]` | Admin |

### Formas de datos

```ts
Usuario   { numeroControl, nombre, correo, telefono, tipo: 'ALUMNO'|'DOCENTE'|'ADMINISTRADOR',
            activo: boolean, bloqueado: boolean, prestamosAbiertos: number, prestamosVencidos: number }
Equipo    { clave, nombre, tipo: 'LAPTOP'|'MONITOR'|'BOCINA'|'TABLET'|'ADAPTADOR'|'CABLE',
            marca, modelo, numeroSerie, estado: 'DISPONIBLE'|'PRESTAMO'|'MANTENIMIENTO'|'BAJA' }
Prestamo  { id, numeroControl, usuarioNombre, usuarioTipo, claveEquipo, equipoNombre, equipoTipo,
            fechaPrestamo, fechaDevolucionPrevista, fechaDevolucionReal|null,   // 'AAAA-MM-DD'
            estado: 'VIGENTE'|'VENCIDO'|'DEVUELTO', diasAtraso: number,
            estadoEquipoDevolucion|null, observaciones, entrego, recibio|null }
Movimiento { id, fechaHora (ISO 8601), operador, tipo, entidad, entidadId, antes: object|null, despues: object|null }
```

Los valores de `Movimiento.tipo` están en [js/domain/catalogs.js](js/domain/catalogs.js) (`TIPOS_MOVIMIENTO`).

## 6. Lo que necesita el back end (no lo implementa el front end)

1. **Toda la API de la sección 5**, con autenticación, autorización por rol y la tabla de movimientos.
2. **Que todas las reglas se validen en el servidor**: disponibilidad, bloqueo por vencido, +14 días, observaciones obligatorias y unicidad de clave, número de serie y número de control. Las validaciones del cliente solo ayudan a la usabilidad; no dan seguridad.
3. **Concurrencia (R-03):** si dos Administradores prestan el mismo equipo a la vez, el servidor debe aceptar solo un préstamo y responder 409 `EQUIPO_NO_DISPONIBLE` al otro. La interfaz ya maneja esa respuesta.
4. **`POST /devoluciones` debe ser atómico**: se registran todas las devoluciones o ninguna.
5. **Contraseñas con hash SHA-256 + sal** (G6, RNF-05). El front end envía la contraseña al servidor por la red local y nunca la guarda.
6. **Criterio del Reporte 3 por período:** el front end supone que se filtra por *fecha de devolución prevista* dentro del período. Hay que confirmarlo con el cliente.
7. **Servir la carpeta `frontend/`** como archivos estáticos desde el mismo servidor.

## 7. Inconsistencias de los documentos y cómo las resolví

| Conflicto | Decisión en el front end |
|-----------|--------------------------|
| Los reportes según la entrevista (FM-06 a FM-08) no coinciden con los del SRS (RF-11) | Se siguió lo que acordó el cliente en la entrevista, porque es más explícito y está firmado: disponibles, por período y vencidos. |
| "Sistema web" (1.3, 1.5) frente a ventanas de escritorio (3.4) | Aplicación web en la LAN con el flujo de pantallas de 3.4. |
| Estados de UC-04 (*No disponible*) | Se usan los cuatro estados de FM-03. |
