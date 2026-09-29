"""
app.py — Python Flask Backend for Khet Mitra Agriculture Equipment Rental Platform
Connected to Normalized MySQL Database: khet_mitra (17 Relational Tables)
"""

import os
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from database import (
    execute_query,
    execute_write,
    hash_password,
    verify_password,
    haversine_distance_km,
    check_equipment_date_overlap,
    record_booking_status_history,
    create_notification,
)

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "khet_mitra_flask_secret_key_change_in_prod")
CORS(app, supports_credentials=True)

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def validate_image_upload(filename: str, file_size: int) -> tuple[bool, str]:
    """Validate uploaded file extension and size."""
    if not filename or "." not in filename:
        return False, "Invalid file name."
    ext = filename.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return False, f"Unsupported file type '.{ext}'. Allowed: JPG, JPEG, PNG, WEBP."
    if file_size > MAX_UPLOAD_SIZE_BYTES:
        return False, "File size exceeds 5 MB limit."
    return True, "Valid"


def require_verified_driver(f):
    """
    Backend Access Control Decorator:
    A driver MUST NOT get access to the Driver Dashboard or job functionality
    until driver_profiles.verification_status = 'Verified'.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = (
            kwargs.get("user_id")
            or request.args.get("user_id")
            or (request.json or {}).get("user_id")
            or session.get("user_id")
        )
        if not user_id:
            return jsonify({"error": "Authentication required."}), 401

        driver = execute_query(
            """
            SELECT dp.driver_id, dp.verification_status, dp.verification_notes, u.account_status
            FROM driver_profiles dp
            JOIN users u ON u.user_id = dp.user_id
            WHERE dp.user_id = %s
            """,
            (int(user_id),),
            fetch_one=True,
        )
        if not driver:
            return jsonify({"error": "Driver profile not found."}), 404
        if driver["account_status"] != "Active":
            return jsonify({"error": "Your account has been deactivated by Admin."}), 403
        if driver["verification_status"] != "Verified":
            return jsonify({
                "error": (
                    f"Unverified Driver ({driver['verification_status']}): "
                    "Access to the Driver Dashboard and job actions is locked until "
                    "Admin verifies your driving license."
                ),
                "verification_status": driver["verification_status"],
                "verification_notes": driver.get("verification_notes"),
            }), 403
        return f(*args, **kwargs)

    return decorated


# ============================================================================
# 1. AUTHENTICATION ROUTES (register, login, logout, forgot/change password)
# ============================================================================
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    role = data.get("role", "farmer")
    name = (data.get("full_name") or data.get("name") or "").strip()
    mobile = (data.get("mobile") or "").strip()
    email = (data.get("email") or "").strip().lower() or None
    password = data.get("password") or ""
    confirm = data.get("confirm_password") or password

    if role not in ("farmer", "owner", "driver"):
        return jsonify({"error": "Invalid role selected."}), 400
    if not name or not mobile or not password:
        return jsonify({"error": "Missing required fields (Name, Mobile, Password)."}), 400
    if password != confirm:
        return jsonify({"error": "Password and Confirm Password do not match."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    dup = execute_query(
        "SELECT user_id FROM users WHERE mobile = %s OR (email IS NOT NULL AND email = %s)",
        (mobile, email),
        fetch_one=True,
    )
    if dup:
        return jsonify({"error": "An account with this Mobile or Email already exists."}), 409

    state = (data.get("state") or "Rajasthan").strip()
    district = (data.get("district") or "Kota").strip()
    city = (data.get("city") or data.get("area_city") or "Kota").strip()
    village = (data.get("village") or "").strip()
    address = (data.get("address") or city).strip()
    pincode = (data.get("pincode") or "324001").strip()
    lat = float(data.get("latitude") or 25.2138)
    lon = float(data.get("longitude") or 75.8648)

    init_verif = "Pending Verification" if role == "driver" else "Verified"
    user_id = execute_write(
        """
        INSERT INTO users (name, mobile, email, password_hash, role, verification_status, account_status, is_demo)
        VALUES (%s, %s, %s, %s, %s, %s, 'Active', 0)
        """,
        (name, mobile, email, hash_password(password), role, init_verif),
    )

    if role == "farmer":
        # Strictly NO Aadhaar required for farmer registration
        execute_write(
            """
            INSERT INTO farmer_profiles (user_id, state, district, city, village, address, pincode, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (user_id, state, district, city, village, address, pincode, lat, lon),
        )
    elif role == "owner":
        execute_write(
            """
            INSERT INTO owner_profiles (user_id, business_name, state, district, city, village, address, pincode, latitude, longitude, verification_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Verified')
            """,
            (
                user_id,
                data.get("business_name") or f"{name} Farm Machinery",
                state,
                district,
                city,
                village,
                address,
                pincode,
                lat,
                lon,
            ),
        )
    elif role == "driver":
        lic_no = (data.get("license_number") or data.get("driving_license_number") or "").strip()
        lic_photo = (data.get("license_photo") or data.get("driving_license_photo") or "").strip()
        verif_state = "Pending Verification" if lic_no else "Incomplete"
        driver_id = execute_write(
            """
            INSERT INTO driver_profiles
                (user_id, driving_license_number, driving_license_photo, years_of_experience,
                 state, district, city, village, address, pincode, latitude, longitude,
                 availability_status, verification_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Offline', %s)
            """,
            (
                user_id,
                lic_no or "PENDING",
                lic_photo or "https://placehold.co/600x380?text=License+Upload",
                int(data.get("total_experience_years") or 2),
                state,
                district,
                city,
                village,
                address,
                pincode,
                lat,
                lon,
                verif_state,
            ),
        )
        for sk in data.get("skills") or [{"category": "Tractor", "experience_years": 2}]:
            execute_write(
                """
                INSERT INTO driver_equipment (driver_id, equipment_category, experience_years, skill_level)
                VALUES (%s, %s, %s, 'Expert')
                """,
                (driver_id, sk.get("category", "Tractor"), int(sk.get("experience_years") or 1)),
            )

    session["user_id"] = user_id
    session["role"] = role
    return jsonify({"message": "Registration successful", "user_id": user_id}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""
    role = data.get("role")

    user = execute_query(
        "SELECT * FROM users WHERE email = %s OR mobile = %s LIMIT 1",
        (identifier.lower(), identifier),
        fetch_one=True,
    )
    if not user:
        return jsonify({"error": "Invalid Login: No account found with this Email or Mobile."}), 401
    if not verify_password(user["password_hash"], password):
        return jsonify({"error": "Wrong password. Please check your credentials."}), 401
    if user["account_status"] != "Active":
        return jsonify({"error": "Account deactivated by Admin."}), 403
    if role and user["role"] != role:
        return jsonify({"error": f"Role Mismatch: Account belongs to role '{user['role']}'."}), 403

    session["user_id"] = user["user_id"]
    session["role"] = user["role"]
    user.pop("password_hash", None)
    return jsonify({"message": "Login successful", "user": user})


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out securely."})


# ============================================================================
# 2. EQUIPMENT SEARCH, DETAILS & OWNER CRUD
# ============================================================================
@app.route("/api/equipment", methods=["GET"])
def list_equipment():
    category = request.args.get("category")
    location = request.args.get("location", "").strip()
    max_price = request.args.get("max_price")
    only_available = request.args.get("only_available") == "true"

    sql = """
        SELECT e.*, op.business_name, u.name AS owner_name, u.mobile AS owner_mobile
        FROM equipment e
        JOIN owner_profiles op ON op.owner_id = e.owner_id
        JOIN users u ON u.user_id = op.user_id
        WHERE e.verification_status = 'Approved'
    """
    params = []
    if category and category != "All":
        sql += " AND e.category = %s"
        params.append(category)
    if location:
        sql += " AND (e.location_city LIKE %s OR e.location_district LIKE %s OR e.location_state LIKE %s)"
        like_val = f"%{location}%"
        params.extend([like_val, like_val, like_val])
    if max_price:
        sql += " AND e.daily_price <= %s"
        params.append(float(max_price))
    if only_available:
        sql += " AND e.availability_status = 'Available'"

    rows = execute_query(sql, tuple(params))
    return jsonify(rows)


# ============================================================================
# 3. BOOKINGS, DOUBLE-BOOKING PREVENTION, 10%/90% PAYMENTS, INSPECTION, REVIEW
# ============================================================================
@app.route("/api/bookings", methods=["POST"])
def create_booking():
    data = request.get_json() or {}
    farmer_id = int(data["farmer_id"])
    equipment_id = int(data["equipment_id"])
    start_date = data["start_date"]
    end_date = data.get("end_date") or start_date
    duration_days = max(1, int(data.get("duration_value") or 1))
    operator_required = 1 if data.get("operator_required") else 0
    work_location = (data.get("work_location") or "").strip()

    if start_date > end_date:
        return jsonify({"error": "Invalid dates: Start date cannot be after End date."}), 400

    eq = execute_query(
        "SELECT * FROM equipment WHERE equipment_id = %s",
        (equipment_id,),
        fetch_one=True,
    )
    if not eq or eq["availability_status"] != "Available":
        return jsonify({"error": "Equipment is currently unavailable."}), 400

    overlap = check_equipment_date_overlap(equipment_id, start_date, end_date)
    if overlap:
        return jsonify({
            "error": (
                f"Double Booking Prevented: Equipment is already booked from "
                f"{overlap['start_date']} to {overlap['end_date']}."
            )
        }), 409

    total_amount = float(eq["daily_price"]) * duration_days + (
        float(eq["operator_charge_per_day"]) * duration_days if operator_required else 0.0
    )
    advance_amount = round(total_amount * 0.10, 2)
    remaining_amount = round(total_amount - advance_amount, 2)

    booking_id = execute_write(
        """
        INSERT INTO bookings
            (farmer_id, equipment_id, owner_id, driver_id, start_date, end_date,
             duration_days, operator_required, work_location, total_amount,
             advance_amount, remaining_amount, booking_status, payment_status, farmer_notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Pending', 'Pending', %s)
        """,
        (
            farmer_id,
            equipment_id,
            eq["owner_id"],
            data.get("driver_id"),
            start_date,
            end_date,
            duration_days,
            operator_required,
            work_location,
            total_amount,
            advance_amount,
            remaining_amount,
            data.get("special_instructions", ""),
        ),
    )
    record_booking_status_history(booking_id, None, "Pending", farmer_id, "New booking request")
    return jsonify({"booking_id": booking_id, "advance_amount": advance_amount}), 201


# ============================================================================
# 4. DRIVER VERIFICATION GATE ENFORCED ROUTES
# ============================================================================
@app.route("/api/drivers/<int:user_id>/jobs", methods=["GET"])
@require_verified_driver
def get_driver_jobs(user_id: int):
    rows = execute_query(
        """
        SELECT da.*, b.start_date, b.end_date, b.work_location, e.equipment_name
        FROM driver_assignments da
        JOIN driver_profiles dp ON dp.driver_id = da.driver_id
        JOIN bookings b ON b.booking_id = da.booking_id
        JOIN equipment e ON e.equipment_id = b.equipment_id
        WHERE dp.user_id = %s
        ORDER BY da.assigned_at DESC
        """,
        (user_id,),
    )
    return jsonify(rows)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
