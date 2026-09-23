from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ProcessoStatus(str, enum.Enum):
    ativo = "ativo"
    aguardando = "aguardando"
    concluido = "concluido"
    arquivado = "arquivado"
    suspenso = "suspenso"


class PrazoStatus(str, enum.Enum):
    pendente = "pendente"
    concluido = "concluido"
    vencido = "vencido"
    cancelado = "cancelado"


class DocumentoStatus(str, enum.Enum):
    pendente = "pendente"
    processando = "processando"
    analisado = "analisado"
    erro = "erro"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    hashed_password = Column(String(300), nullable=False)
    oab = Column(String(50), nullable=True)
    cargo = Column(String(100), nullable=True, default="Advogado")
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    processos = relationship("Processo", back_populates="advogado")
    documentos = relationship("Documento", back_populates="uploader")
    chat_messages = relationship("ChatMessage", back_populates="user")
    notifications = relationship("Notification", back_populates="user")


class Processo(Base):
    __tablename__ = "processos"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String(100), unique=True, index=True, nullable=False)
    cliente = Column(String(200), nullable=False)
    tipo = Column(String(100), nullable=False)
    tribunal = Column(String(200), nullable=False)
    vara = Column(String(200), nullable=True)
    status = Column(Enum(ProcessoStatus), default=ProcessoStatus.ativo)
    descricao = Column(Text, nullable=True)
    valor_causa = Column(Float, nullable=True)
    data_abertura = Column(DateTime(timezone=True), nullable=False)
    data_encerramento = Column(DateTime(timezone=True), nullable=True)
    advogado_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    parte_contraria = Column(String(200), nullable=True)
    ai_resumo = Column(Text, nullable=True)
    ai_pontos_importantes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    advogado = relationship("User", back_populates="processos")
    movimentacoes = relationship(
    "Movimentacao",
        back_populates="processo",
        order_by="Movimentacao.data.desc()",
        cascade="all, delete-orphan"
    )

    documentos = relationship(
        "Documento",
        back_populates="processo",
        cascade="all, delete-orphan"
    )

    prazos = relationship(
        "Prazo",
        back_populates="processo",
        cascade="all, delete-orphan"
    )


class Movimentacao(Base):
    __tablename__ = "movimentacoes"

    id = Column(Integer, primary_key=True, index=True)
    processo_id = Column(Integer, ForeignKey("processos.id"), nullable=False)
    tipo = Column(String(100), nullable=False)
    descricao = Column(Text, nullable=False)
    data = Column(DateTime(timezone=True), nullable=False)
    documento_id = Column(Integer, ForeignKey("documentos.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    processo = relationship("Processo", back_populates="movimentacoes")
    documento = relationship("Documento")


class Documento(Base):
    __tablename__ = "documentos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(300), nullable=False)
    nome_original = Column(String(300), nullable=False)
    tipo = Column(String(50), nullable=False)
    tamanho = Column(Integer, nullable=False)
    caminho = Column(String(500), nullable=False)
    processo_id = Column(Integer, ForeignKey("processos.id"), nullable=True)
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(DocumentoStatus), default=DocumentoStatus.pendente)
    conteudo_extraido = Column(Text, nullable=True)
    ai_resumo = Column(Text, nullable=True)
    ai_datas = Column(Text, nullable=True)
    ai_partes = Column(Text, nullable=True)
    ai_obrigacoes = Column(Text, nullable=True)
    ai_pontos_importantes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    processo = relationship("Processo", back_populates="documentos")
    uploader = relationship("User", back_populates="documentos")


class Prazo(Base):
    __tablename__ = "prazos"

    id = Column(Integer, primary_key=True, index=True)
    processo_id = Column(Integer, ForeignKey("processos.id"), nullable=False)
    titulo = Column(String(300), nullable=False)
    descricao = Column(Text, nullable=True)
    data_vencimento = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(PrazoStatus), default=PrazoStatus.pendente)
    documento_id = Column(Integer, ForeignKey("documentos.id"), nullable=True)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    processo = relationship("Processo", back_populates="prazos")
    documento = relationship("Documento")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    processo_id = Column(Integer, ForeignKey("processos.id"), nullable=True)
    documento_id = Column(Integer, ForeignKey("documentos.id"), nullable=True)
    session_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chat_messages")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    titulo = Column(String(300), nullable=False)
    mensagem = Column(Text, nullable=False)
    tipo = Column(String(50), default="info")  # info, warning, success, error
    lida = Column(Boolean, default=False)
    processo_id = Column(Integer, ForeignKey("processos.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")
