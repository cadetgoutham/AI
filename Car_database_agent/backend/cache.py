from fastapi_cache import FastAPICache

from config import CARS_CACHE_NAMESPACE


async def invalidate_cars_cache():
    await FastAPICache.clear(namespace=CARS_CACHE_NAMESPACE)
