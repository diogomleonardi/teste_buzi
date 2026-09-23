from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.ai_agent import chat_with_agent

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/message", response_model=schemas.ChatMessageResponse)
async def send_message(
    data: schemas.ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Build context from processo/documento if provided
    context_parts = []
    if data.processo_id:
        from sqlalchemy.orm import joinedload
        processo = (
            db.query(models.Processo)
            .options(joinedload(models.Processo.movimentacoes))
            .filter(
                models.Processo.id == data.processo_id,
                models.Processo.advogado_id == current_user.id
            )
            .first()
        )
        if processo:
            movs = "\n".join([
                f"- {m.data.strftime('%d/%m/%Y')}: {m.tipo} — {m.descricao}"
                for m in processo.movimentacoes[:20]
            ])
            context_parts.append(f"""PROCESSO: {processo.numero}
Cliente: {processo.cliente}
Tipo: {processo.tipo}
Tribunal: {processo.tribunal}
Status: {processo.status.value}
Parte contrária: {processo.parte_contraria or 'Não informado'}
Movimentações:
{movs or 'Nenhuma movimentação registrada'}""")

    if data.documento_id:
        doc = db.query(models.Documento).filter(
            models.Documento.id == data.documento_id,
            models.Documento.uploader_id == current_user.id
        ).first()
        if doc and doc.conteudo_extraido:
            context_parts.append(f"DOCUMENTO: {doc.nome_original}\n{doc.conteudo_extraido[:4000]}")

    context = "\n\n".join(context_parts) if context_parts else None

    # Get conversation history for this session
    history_msgs = []
    if data.session_id:
        history = (
            db.query(models.ChatMessage)
            .filter(
                models.ChatMessage.user_id == current_user.id,
                models.ChatMessage.session_id == data.session_id,
            )
            .order_by(models.ChatMessage.created_at.asc())
            .limit(20)
            .all()
        )
        history_msgs = [{"role": m.role, "content": m.content} for m in history]

    # Save user message
    user_msg = models.ChatMessage(
        user_id=current_user.id,
        role="user",
        content=data.content,
        processo_id=data.processo_id,
        documento_id=data.documento_id,
        session_id=data.session_id,
    )
    db.add(user_msg)
    db.commit()

    # Get AI response
    ai_reply = await chat_with_agent(data.content, history_msgs, context)

    # Save assistant message
    assistant_msg = models.ChatMessage(
        user_id=current_user.id,
        role="assistant",
        content=ai_reply,
        processo_id=data.processo_id,
        documento_id=data.documento_id,
        session_id=data.session_id,
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg


@router.get("/history", response_model=List[schemas.ChatMessageResponse])
def get_history(
    session_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.ChatMessage).filter(models.ChatMessage.user_id == current_user.id)
    if session_id:
        q = q.filter(models.ChatMessage.session_id == session_id)
    return q.order_by(models.ChatMessage.created_at.asc()).offset(skip).limit(limit).all()


@router.delete("/history")
def clear_history(
    session_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.ChatMessage).filter(models.ChatMessage.user_id == current_user.id)
    if session_id:
        q = q.filter(models.ChatMessage.session_id == session_id)
    q.delete()
    db.commit()
    return {"ok": True}
