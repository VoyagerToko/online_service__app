from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "Servify"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = ""
    AUTO_CREATE_TABLES: bool = True

    # Database
    DATABASE_URL: str
    TEST_DATABASE_URL: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Email token signing
    EMAIL_SECRET_KEY: str = ""

    # Email
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@servify.com"
    MAIL_FROM_NAME: str = "Servify"
    MAIL_PORT: int = 1025
    MAIL_SERVER: str = "localhost"
    MAIL_STARTTLS: bool = False
    MAIL_SSL_TLS: bool = False

    # OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # File storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10

    # Platform
    PLATFORM_FEE: float = 49.0
    DEFAULT_COMMISSION_RATE: float = 0.20
    GST_RATE: float = 0.18

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    AUTH_RATE_LIMIT_PER_MINUTE: int = 5

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


settings = Settings()
