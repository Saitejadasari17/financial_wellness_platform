from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    service_name: str = "ml-service"
    app_env: str = "development"
    port: int = 8002
    db_url: str = Field(default="postgres://postgres:postgres@localhost:5432/financial_wellness")
    redis_url: str = Field(default="redis://localhost:6379/0")
    cluster_count: int = 6
    random_state: int = 42


settings = Settings()
