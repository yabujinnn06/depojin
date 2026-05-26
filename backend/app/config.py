from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./rainwater.db"
    jwt_secret: str = "change-me-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24
    refresh_expire_minutes: int = 60 * 24 * 30
    cors_origins: str = "*"
    static_dir: str | None = None
    admin_pin: str = "1234"


settings = Settings()
