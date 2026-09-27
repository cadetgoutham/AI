from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor

from config import DB_PARAMS


def db_fetch_cars():
    """Fetch every car, newest first."""
    conn = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("SELECT * FROM cars ORDER BY id DESC;")
            return {"status": "success", "data": cursor.fetchall()}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
    finally:
        if conn:
            conn.close()


def db_search_cars_by_brand(brand: str):
    """Fetch cars whose brand contains the given text."""
    conn = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT * FROM cars WHERE brand ILIKE %s ORDER BY id DESC;",
                (f"%{brand}%",),
            )
            return {"status": "success", "data": cursor.fetchall()}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
    finally:
        if conn:
            conn.close()


def db_filter_cars(
    brand: Optional[str] = None,
    model: Optional[str] = None,
    year: Optional[int] = None,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
):
    """Fetch cars matching the supplied user preferences."""
    conditions = []
    values = []

    if brand:
        conditions.append("brand ILIKE %s")
        values.append(f"%{brand}%")
    if model:
        conditions.append("model ILIKE %s")
        values.append(f"%{model}%")
    if year is not None:
        conditions.append("year = %s")
        values.append(year)
    if min_year is not None:
        conditions.append("year >= %s")
        values.append(min_year)
    if max_year is not None:
        conditions.append("year <= %s")
        values.append(max_year)

    query = "SELECT * FROM cars"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY id DESC;"

    conn = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, values)
            return {"status": "success", "data": cursor.fetchall()}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
    finally:
        if conn:
            conn.close()


def db_add_car(brand: str, model: str, year: int):
    """Add a new car."""
    conn = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO cars (brand, model, year) VALUES (%s, %s, %s) RETURNING id;",
                (brand, model, year),
            )
            inserted_id = cursor.fetchone()[0]
            conn.commit()
            return {"status": "success", "inserted_id": inserted_id}
    except Exception as exc:
        if conn:
            conn.rollback()
        return {"status": "error", "message": str(exc)}
    finally:
        if conn:
            conn.close()


def db_update_car(
    car_id: int,
    brand: Optional[str] = None,
    model: Optional[str] = None,
    year: Optional[int] = None,
):
    """Update one or more fields of an existing car."""
    fields, values = [], []
    if brand is not None:
        fields.append("brand = %s")
        values.append(brand)
    if model is not None:
        fields.append("model = %s")
        values.append(model)
    if year is not None:
        fields.append("year = %s")
        values.append(year)

    if not fields:
        return {"status": "error", "message": "Nothing was given to update."}

    values.append(car_id)
    conn = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                f"UPDATE cars SET {', '.join(fields)} WHERE id = %s RETURNING *;",
                values,
            )
            updated = cursor.fetchone()
            conn.commit()
            if not updated:
                return {"status": "error", "message": f"No car found with id {car_id}."}
            return {"status": "success", "data": updated}
    except Exception as exc:
        if conn:
            conn.rollback()
        return {"status": "error", "message": str(exc)}
    finally:
        if conn:
            conn.close()


def db_delete_car(car_id: int):
    """Delete a car by id."""
    conn = None
    try:
        conn = psycopg2.connect(**DB_PARAMS)
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM cars WHERE id = %s RETURNING id;", (car_id,))
            deleted = cursor.fetchone()
            conn.commit()
            if not deleted:
                return {"status": "error", "message": f"No car found with id {car_id}."}
            return {"status": "success", "deleted_id": deleted[0]}
    except Exception as exc:
        if conn:
            conn.rollback()
        return {"status": "error", "message": str(exc)}
    finally:
        if conn:
            conn.close()
