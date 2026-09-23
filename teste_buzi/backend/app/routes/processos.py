from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional, List
from datetime import datetime, timedelta
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/api/processos", tags=["processos"])


@router.get("", response_model=List[schemas.ProcessoResponse])
def list_processos(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Processo).filter(models.Processo.advogado_id == current_user.id)

    if search:
        q = q.filter(
            or_(
                models.Processo.numero.ilike(f"%{search}%"),
                models.Processo.cliente.ilike(f"%{search}%"),
                models.Processo.tipo.ilike(f"%{search}%"),
            )
        )
    if status:
        q = q.filter(models.Processo.status == status)
    if tipo:
        q = q.filter(models.Processo.tipo.ilike(f"%{tipo}%"))

    return q.order_by(models.Processo.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=schemas.ProcessoResponse, status_code=201)
def create_processo(
    data: schemas.ProcessoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = db.query(models.Processo).filter(models.Processo.numero == data.numero).first()
    if existing:
        raise HTTPException(status_code=400, detail="Número de processo já cadastrado")

    processo = models.Processo(**data.model_dump(), advogado_id=current_user.id)
    db.add(processo)
    db.commit()
    db.refresh(processo)

    # Create notification
    notif = models.Notification(
        user_id=current_user.id,
        titulo="Novo processo cadastrado",
        mensagem=f"Processo {processo.numero} — {processo.cliente} foi cadastrado com sucesso.",
        tipo="success",
        processo_id=processo.id,
    )
    db.add(notif)
    db.commit()

    return processo


@router.get("/{processo_id}", response_model=schemas.ProcessoResponse)
def get_processo(
    processo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    processo = (
        db.query(models.Processo)
        .options(joinedload(models.Processo.movimentacoes))
        .filter(models.Processo.id == processo_id, models.Processo.advogado_id == current_user.id)
        .first()
    )
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    return processo


@router.put("/{processo_id}", response_model=schemas.ProcessoResponse)
def update_processo(
    processo_id: int,
    data: schemas.ProcessoUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    processo = db.query(models.Processo).filter(
        models.Processo.id == processo_id,
        models.Processo.advogado_id == current_user.id
    ).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(processo, field, value)
    db.commit()
    db.refresh(processo)
    return processo


@router.delete("/{processo_id}/movimentacoes/{movimentacao_id}", status_code=204)
def delete_movimentacao(
    processo_id: int,
    movimentacao_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    movimentacao = (
        db.query(models.Movimentacao)
        .join(models.Processo)
        .filter(
            models.Movimentacao.id == movimentacao_id,
            models.Movimentacao.processo_id == processo_id,
            models.Processo.advogado_id == current_user.id
        )
        .first()
    )

    if not movimentacao:
        raise HTTPException(
            status_code=404,
            detail="Movimentação não encontrada"
        )

    db.delete(movimentacao)
    db.commit()


@router.post("/{processo_id}/movimentacoes", response_model=schemas.MovimentacaoResponse, status_code=201)
def add_movimentacao(
    processo_id: int,
    data: schemas.MovimentacaoCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    processo = db.query(models.Processo).filter(
        models.Processo.id == processo_id,
        models.Processo.advogado_id == current_user.id
    ).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")

    mov = models.Movimentacao(processo_id=processo_id, **data.model_dump())
    db.add(mov)

    # Notification
    notif = models.Notification(
        user_id=current_user.id,
        titulo="Nova movimentação cadastrada",
        mensagem=f"Processo {processo.numero}: {data.tipo} em {data.data.strftime('%d/%m/%Y')}",
        tipo="info",
        processo_id=processo_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(mov)
    return mov


@router.post("/{processo_id}/analyze", response_model=dict)
async def analyze_processo_ai(
    processo_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from app.ai_agent import analyze_processo

    processo = (
        db.query(models.Processo)
        .options(joinedload(models.Processo.movimentacoes))
        .filter(models.Processo.id == processo_id, models.Processo.advogado_id == current_user.id)
        .first()
    )
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")

    processo_data = {
        "numero": processo.numero,
        "cliente": processo.cliente,
        "tipo": processo.tipo,
        "tribunal": processo.tribunal,
        "status": processo.status.value,
        "parte_contraria": processo.parte_contraria,
        "movimentacoes": [
            {"data": m.data.strftime("%d/%m/%Y"), "tipo": m.tipo, "descricao": m.descricao}
            for m in processo.movimentacoes
        ]
    }

    analysis = await analyze_processo(processo_data)

    processo.ai_resumo = analysis.get("resumo", "")
    processo.ai_pontos_importantes = str(analysis.get("pontos_importantes", []))
    db.commit()

    return analysis
