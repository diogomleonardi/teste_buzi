from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/api/prazos", tags=["prazos"])


@router.get("", response_model=List[schemas.PrazoResponse])
def list_prazos(
    status: Optional[str] = Query(None),
    processo_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = (
        db.query(models.Prazo)
        .join(models.Processo)
        .filter(models.Processo.advogado_id == current_user.id)
    )
    if status:
        q = q.filter(models.Prazo.status == status)
    if processo_id:
        q = q.filter(models.Prazo.processo_id == processo_id)

    # Auto-mark overdue
    now = datetime.now(timezone.utc)
    prazos = q.order_by(models.Prazo.data_vencimento.asc()).all()
    for p in prazos:
        venc = p.data_vencimento
        if venc.tzinfo is None:
            venc = venc.replace(tzinfo=timezone.utc)
        if p.status == models.PrazoStatus.pendente and venc < now:
            p.status = models.PrazoStatus.vencido
    db.commit()
    return prazos


@router.post("", response_model=schemas.PrazoResponse, status_code=201)
def create_prazo(
    data: schemas.PrazoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    processo = db.query(models.Processo).filter(
        models.Processo.id == data.processo_id,
        models.Processo.advogado_id == current_user.id
    ).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")

    prazo = models.Prazo(**data.model_dump())
    db.add(prazo)

    # days until deadline
    now = datetime.now(timezone.utc)
    venc = data.data_vencimento
    if venc.tzinfo is None:
        venc = venc.replace(tzinfo=timezone.utc)
    days_left = (venc - now).days

    urgency = "info"
    if days_left <= 3:
        urgency = "error"
    elif days_left <= 7:
        urgency = "warning"

    notif = models.Notification(
        user_id=current_user.id,
        titulo="Novo prazo cadastrado",
        mensagem=f"Prazo '{data.titulo}' — Processo {processo.numero} em {venc.strftime('%d/%m/%Y')} ({days_left} dias).",
        tipo=urgency,
        processo_id=data.processo_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(prazo)
    return prazo


@router.put("/{prazo_id}", response_model=schemas.PrazoResponse)
def update_prazo(
    prazo_id: int,
    data: schemas.PrazoUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    prazo = (
        db.query(models.Prazo)
        .join(models.Processo)
        .filter(models.Prazo.id == prazo_id, models.Processo.advogado_id == current_user.id)
        .first()
    )
    if not prazo:
        raise HTTPException(status_code=404, detail="Prazo não encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(prazo, field, value)
    db.commit()
    db.refresh(prazo)
    return prazo


@router.delete("/{prazo_id}", status_code=204)
def delete_prazo(
    prazo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    prazo = (
        db.query(models.Prazo)
        .join(models.Processo)
        .filter(models.Prazo.id == prazo_id, models.Processo.advogado_id == current_user.id)
        .first()
    )
    if not prazo:
        raise HTTPException(status_code=404, detail="Prazo não encontrado")
    db.delete(prazo)
    db.commit()
