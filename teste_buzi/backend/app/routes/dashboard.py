from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    week_from_now = now + timedelta(days=7)

    total = db.query(models.Processo).filter(models.Processo.advogado_id == current_user.id).count()
    ativos = db.query(models.Processo).filter(
        models.Processo.advogado_id == current_user.id,
        models.Processo.status == models.ProcessoStatus.ativo
    ).count()
    aguardando = db.query(models.Processo).filter(
        models.Processo.advogado_id == current_user.id,
        models.Processo.status == models.ProcessoStatus.aguardando
    ).count()
    docs_analisados = db.query(models.Documento).filter(
        models.Documento.uploader_id == current_user.id,
        models.Documento.status == models.DocumentoStatus.analisado
    ).count()

    # Upcoming deadlines in next 7 days
    prazos_proximos = (
        db.query(models.Prazo)
        .join(models.Processo)
        .filter(
            models.Processo.advogado_id == current_user.id,
            models.Prazo.status == models.PrazoStatus.pendente,
            models.Prazo.data_vencimento >= now,
            models.Prazo.data_vencimento <= week_from_now,
        )
        .count()
    )

    # Recent movimentacoes
    recent_movs = (
        db.query(models.Movimentacao, models.Processo)
        .join(models.Processo, models.Movimentacao.processo_id == models.Processo.id)
        .filter(models.Processo.advogado_id == current_user.id)
        .order_by(models.Movimentacao.data.desc())
        .limit(5)
        .all()
    )
    ultimas_movimentacoes = [
        {
            "id": m.id,
            "tipo": m.tipo,
            "descricao": m.descricao[:100],
            "data": m.data.isoformat(),
            "processo_numero": p.numero,
            "processo_cliente": p.cliente,
            "processo_id": p.id,
        }
        for m, p in recent_movs
    ]

    # Urgent deadlines
    urgent_prazos = (
        db.query(models.Prazo, models.Processo)
        .join(models.Processo, models.Prazo.processo_id == models.Processo.id)
        .filter(
            models.Processo.advogado_id == current_user.id,
            models.Prazo.status == models.PrazoStatus.pendente,
            models.Prazo.data_vencimento >= now,
        )
        .order_by(models.Prazo.data_vencimento.asc())
        .limit(5)
        .all()
    )
    prazos_urgentes = [
        {
            "id": pr.id,
            "titulo": pr.titulo,
            "data_vencimento": pr.data_vencimento.isoformat(),
            "processo_numero": p.numero,
            "processo_cliente": p.cliente,
            "processo_id": p.id,
            "days_left": ((pr.data_vencimento.replace(tzinfo=timezone.utc) if pr.data_vencimento.tzinfo is None else pr.data_vencimento) - now).days,
        }
        for pr, p in urgent_prazos
    ]

    # Processos por status
    status_counts = (
        db.query(models.Processo.status, func.count(models.Processo.id))
        .filter(models.Processo.advogado_id == current_user.id)
        .group_by(models.Processo.status)
        .all()
    )
    processos_por_status = [{"status": s.value, "count": c} for s, c in status_counts]

    # Processos por tipo
    tipo_counts = (
        db.query(models.Processo.tipo, func.count(models.Processo.id))
        .filter(models.Processo.advogado_id == current_user.id)
        .group_by(models.Processo.tipo)
        .limit(6)
        .all()
    )
    processos_por_tipo = [{"tipo": t, "count": c} for t, c in tipo_counts]

    return schemas.DashboardStats(
        total_processos=total,
        processos_ativos=ativos,
        processos_atencao=aguardando,
        prazos_proximos=prazos_proximos,
        documentos_analisados=docs_analisados,
        ultimas_movimentacoes=ultimas_movimentacoes,
        prazos_urgentes=prazos_urgentes,
        processos_por_status=processos_por_status,
        processos_por_tipo=processos_por_tipo,
    )
