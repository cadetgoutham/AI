from fastapi import APIRouter, HTTPException
from fastapi_cache.decorator import cache

from cache import invalidate_cars_cache
from config import CARS_CACHE_NAMESPACE
from database import db_add_car, db_fetch_cars
from models import Car

router = APIRouter()


@router.get("/api/fetch-cars")
@cache(expire=60, namespace=CARS_CACHE_NAMESPACE)
async def fetch_cars():
    result = db_fetch_cars()
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result


@router.post("/api/add-cars")
async def add_cars(car: Car):
    result = db_add_car(car.brand.strip(), car.model.strip(), car.year)
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))

    await invalidate_cars_cache()
    return result
