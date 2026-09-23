from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # Auth
    secret_key: str = "changeme-in-production-use-strong-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # Database
    database_url: str = "sqlite:///./juridico.db"

    # Upload
    upload_dir: str = "uploads"
    max_file_size: int = 10485760  # 10MB

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
