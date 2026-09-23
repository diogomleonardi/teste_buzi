import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine
from app import models
from app.routes import auth, processos, documentos, prazos, notifications, dashboard, chat
from app.config import settings

# Create tables
from app.database import engine
from app import models

models.Base.metadata.create_all(bind=engine)

# Create uploads dir
os.makedirs(settings.upload_dir, exist_ok=True)

app = FastAPI(
    title="JurisAI — Assistente Jurídico com IA",
    description="Sistema de gestão jurídica com inteligência artificial",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:80",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(processos.router)
app.include_router(documentos.router)
app.include_router(prazos.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(chat.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "JurisAI Backend"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Erro interno: {str(exc)}"}
    )
