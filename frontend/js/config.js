/**
 * Configuración del cliente.
 *
 * Se puede sobrescribir sin tocar el código definiendo `window.APP_CONFIG`
 * en un <script> anterior a main.js (ver index.html).
 */
const defaults = {
  /** URL base del back end. Sin barra final. */
  apiBaseUrl: '/api',
  /**
   * true  = usa la capa simulada (js/services/mock). Los datos viven solo en
   *         esta pestaña del navegador y NO se guardan en el servidor.
   * false = consume el back end real en apiBaseUrl.
   */
  useMock: false,
  /** Tiempo máximo de espera por petición, en milisegundos. */
  requestTimeoutMs: 15000,
  /** Plazo del préstamo (RB-02). Solo se usa para mostrar la fecha prevista; la calcula el servidor. */
  loanDays: 14,
  appName: 'Préstamo de Equipo de Cómputo',
};

export const config = Object.freeze({ ...defaults, ...(window.APP_CONFIG || {}) });
