from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models import ProcessoStatus, PrazoStatus, DocumentoStatus


# ── Auth ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    password: str
    oab: Optional[str] = None
    cargo: Optional[str] = "Advogado"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    nome: str
    email: str
    oab: Optional[str]
    cargo: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class UserUpdate(BaseModel):
    nome: Optional[str] = None
    oab: Optional[str] = None
    cargo: Optional[str] = None


# ── Processo ──────────────────────────────────────────────────────────────────
class ProcessoCreate(BaseModel):
    numero: str
    cliente: str
    tipo: str
    tribunal: str
    vara: Optional[str] = None
    descricao: Optional[str] = None
    valor_causa: Optional[float] = None
    data_abertura: datetime
    parte_contraria: Optional[str] = None
    status: Optional[ProcessoStatus] = ProcessoStatus.ativo


class ProcessoUpdate(BaseModel):
    cliente: Optional[str] = None
    tipo: Optional[str] = None
    tribunal: Optional[str] = None
    vara: Optional[str] = None
    descricao: Optional[str] = None
    valor_causa: Optional[float] = None
    parte_contraria: Optional[str] = None
    status: Optional[ProcessoStatus] = None


class MovimentacaoCreate(BaseModel):
    tipo: str
    descricao: str
    data: datetime
    documento_id: Optional[int] = None


class MovimentacaoUpdate(BaseModel):
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    data: Optional[datetime] = None
    documento_id: Optional[int] = None


class MovimentacaoResponse(BaseModel):
    id: int
    tipo: str
    descricao: str
    data: datetime
    documento_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class ProcessoResponse(BaseModel):
    id: int
    numero: str
    cliente: str
    tipo: str
    tribunal: str
    vara: Optional[str]
    status: ProcessoStatus
    descricao: Optional[str]
    valor_causa: Optional[float]
    data_abertura: datetime
    data_encerramento: Optional[datetime]
    advogado_id: int
    parte_contraria: Optional[str]
    ai_resumo: Optional[str]
    ai_pontos_importantes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    movimentacoes: Optional[List[MovimentacaoResponse]] = []

    class Config:
        from_attributes = True


# ── Documento ─────────────────────────────────────────────────────────────────
class DocumentoResponse(BaseModel):
    id: int
    nome: str
    nome_original: str
    tipo: str
    tamanho: int
    processo_id: Optional[int]
    uploader_id: int
    status: DocumentoStatus
    ai_resumo: Optional[str]
    ai_datas: Optional[str]
    ai_partes: Optional[str]
    ai_obrigacoes: Optional[str]
    ai_pontos_importantes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Prazo ─────────────────────────────────────────────────────────────────────
class PrazoCreate(BaseModel):
    processo_id: int
    titulo: str
    descricao: Optional[str] = None
    data_vencimento: datetime
    documento_id: Optional[int] = None
    observacoes: Optional[str] = None


class PrazoUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    data_vencimento: Optional[datetime] = None
    status: Optional[PrazoStatus] = None
    observacoes: Optional[str] = None


class PrazoResponse(BaseModel):
    id: int
    processo_id: int
    titulo: str
    descricao: Optional[str]
    data_vencimento: datetime
    status: PrazoStatus
    documento_id: Optional[int]
    observacoes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Chat ──────────────────────────────────────────────────────────────────────
class ChatMessageCreate(BaseModel):
    content: str
    processo_id: Optional[int] = None
    documento_id: Optional[int] = None
    session_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    processo_id: Optional[int]
    documento_id: Optional[int]
    session_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Notification ──────────────────────────────────────────────────────────────
class NotificationResponse(BaseModel):
    id: int
    titulo: str
    mensagem: str
    tipo: str
    lida: bool
    processo_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_processos: int
    processos_ativos: int
    processos_atencao: int
    prazos_proximos: int
    documentos_analisados: int
    ultimas_movimentacoes: List[dict]
    prazos_urgentes: List[dict]
    processos_por_status: List[dict]
    processos_por_tipo: List[dict]
