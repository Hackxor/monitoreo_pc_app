"""
Módulo de autenticación y seguridad.
RNF-05: Contraseñas con hash SHA-256 + sal, nunca en texto plano.
Manejo de sesiones en memoria con tokens criptográficos.
"""
import hashlib
import secrets
import time
from datetime import datetime, timezone

# Sesiones activas en memoria: token -> dict(numero_control, expires_at)
_SESSIONS = {}
SESSION_TTL_SECONDS = 3600 * 12  # 12 horas


def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    """
    Genera un hash SHA-256 con sal para la contraseña.
    Si no se proporciona sal, se genera una nueva aleatoria de 16 bytes en hex.
    Retorna (hash_hex, salt_hex).
    """
    if not salt:
        salt = secrets.token_hex(16)
    hasher = hashlib.sha256()
    hasher.update(salt.encode('utf-8'))
    hasher.update(password.encode('utf-8'))
    return hasher.hexdigest(), salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Verifica si la contraseña coincide con el hash y sal almacenados."""
    computed_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(computed_hash, stored_hash)


def create_session(numero_control: str) -> str:
    """Genera un token de sesión seguro y lo registra en memoria."""
    token = secrets.token_hex(32)
    _SESSIONS[token] = {
        'numero_control': numero_control,
        'created_at': time.time(),
        'expires_at': time.time() + SESSION_TTL_SECONDS,
    }
    return token


def invalidate_session(token: str):
    """Elimina la sesión correspondiente al token."""
    _SESSIONS.pop(token, None)


def get_session_user_nc(token: str) -> str | None:
    """Retorna el número de control asociado al token si es válido y no ha expirado."""
    if not token:
        return None
    sess = _SESSIONS.get(token)
    if not sess:
        return None
    if time.time() > sess['expires_at']:
        _SESSIONS.pop(token, None)
        return None
    return sess['numero_control']
