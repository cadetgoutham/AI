from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis

from config import CORS_ORIGINS, REDIS_URL
from routers.ai import router as ai_router
from routers.cars import router as cars_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis = aioredis.from_url(
        REDIS_URL,
        encoding="utf8",
        decode_responses=False,
    )
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
    yield
    await redis.close()


app = FastAPI(
    title="PostgreSQL Runner API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cars_router)
app.include_router(ai_router)
