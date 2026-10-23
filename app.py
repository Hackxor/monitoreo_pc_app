#!/usr/bin/env python3
"""
Punto de entrada principal para arrancar el Sistema de Préstamo de Equipo de Cómputo.
Ejecuta el servidor web y API REST en el puerto especificado (por defecto 8080).
Uso:
    python app.py
    python app.py 8080
"""
import sys
import os

# Agregar directorio backend al sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from server import run_server

if __name__ == '__main__':
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port=port)
