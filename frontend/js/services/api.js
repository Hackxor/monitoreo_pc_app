import { config } from '../config.js';
import { remoteApi } from './remoteApi.js';

/**
 * Punto único de acceso a datos para las vistas.
 * Las vistas nunca importan remoteApi ni mockApi directamente.
 * El módulo simulado solo se carga cuando config.useMock es true.
 */
export const isMockMode = config.useMock;
export const api = isMockMode ? (await import('./mock/mockApi.js')).mockApi : remoteApi;
