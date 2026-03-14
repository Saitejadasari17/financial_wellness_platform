from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2.extras import RealDictCursor
import redis

from app.config import settings


def get_redis_client() -> redis.Redis:
    return redis.from_url(settings.redis_url, decode_responses=True)


@contextmanager
def get_db_cursor() -> Generator[RealDictCursor, None, None]:
    conn = psycopg2.connect(settings.db_url)
    conn.autocommit = False
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
