"""
database.py — MySQL Connection Pool & Parameterized Query Helpers for Khet Mitra
Database Name: khet_mitra
"""

import os
import math
import hashlib
import hmac
from typing import Any, Dict, List, Optional, Tuple
import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv

load_dotenv()

MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
    "port": int(os.getenv("MYSQL_PORT", "3306")),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "khet_mitra"),
    "charset": "utf8mb4",
    "use_unicode": True,
    "autocommit": False,
}

_connection_pool: Optional[pooling.MySQLConnectionPool] = None


def get_pool() -> pooling.MySQLConnectionPool:
    """Create or return the singleton MySQL connection pool."""
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = pooling.MySQLConnectionPool(
            pool_name="khet_mitra_pool",
            pool_size=10,
            pool_reset_session=True,
            **MYSQL_CONFIG,
        )
    return _connection_pool


def get_db_connection():
    """Borrow a MySQL connection from the pool."""
    return get_pool().get_connection()


def execute_query(
    sql: str, params: Tuple[Any, ...] = (), fetch_one: bool = False
) -> Any:
    """Execute a parameterized SELECT query (SQL injection safe)."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(sql, params)
        if fetch_one:
            return cursor.fetchone()
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def execute_write(sql: str, params: Tuple[Any, ...] = ()) -> int:
    """Execute a parameterized INSERT/UPDATE/DELETE statement and commit."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        conn.commit()
        return cursor.lastrowid
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def hash_password(plain_password: str) -> str:
    """Hash password with PBKDF2-SHA256 — never store plaintext passwords."""
    salt = os.getenv("PASSWORD_SALT", "khet_mitra_salt_2026")
    digest = hmac.new(
        salt.encode("utf-8"), plain_password.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"pbkdf2:sha256:{digest}"


def verify_password(stored_hash: str, plain_password: str) -> bool:
    """Constant-time verification of hashed password."""
    expected = hash_password(plain_password)
    return hmac.compare_digest(stored_hash, expected)


def haversine_distance_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Calculate distance in kilometers between two GPS coordinates."""
    radius = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(radius * c, 1)


def check_equipment_date_overlap(
    equipment_id: int, start_date: str, end_date: str
) -> Optional[Dict[str, Any]]:
    """
    Prevent double booking of the same equipment for overlapping dates.
    Checks active/confirmed bookings in MySQL.
    """
    sql = """
        SELECT booking_id, start_date, end_date, booking_status
        FROM bookings
        WHERE equipment_id = %s
          AND booking_status IN ('Accepted', 'Driver Assigned', 'Advance Paid', 'Active')
          AND start_date <= %s
          AND end_date >= %s
        LIMIT 1
    """
    return execute_query(sql, (equipment_id, end_date, start_date), fetch_one=True)


def record_booking_status_history(
    booking_id: int,
    old_status: Optional[str],
    new_status: str,
    changed_by: int,
    remarks: str,
) -> int:
    """Insert an audit record into booking_status_history."""
    sql = """
        INSERT INTO booking_status_history
            (booking_id, old_status, new_status, changed_by, remarks)
        VALUES (%s, %s, %s, %s, %s)
    """
    return execute_write(
        sql, (booking_id, old_status, new_status, changed_by, remarks)
    )


def create_notification(
    user_id: int,
    title: str,
    message: str,
    notification_type: str,
    related_booking_id: Optional[int] = None,
) -> int:
    """Insert a real-time workflow notification into MySQL notifications table."""
    sql = """
        INSERT INTO notifications
            (user_id, title, message, notification_type, related_booking_id, is_read)
        VALUES (%s, %s, %s, %s, %s, 0)
    """
    return execute_write(
        sql, (user_id, title, message, notification_type, related_booking_id)
    )
