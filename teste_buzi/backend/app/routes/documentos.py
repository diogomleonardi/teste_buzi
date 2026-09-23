import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/documentos", tags=["documentos"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".doc", ".rtf", ".odt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "application/rtf",
    "application/vnd.oasis.opendocument.text",
}


def extract_text(filepath: str, extension: str) -> str:
    try:
        if extension == ".pdf":
            import PyPDF2
            text = ""
            with open(filepath, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() or ""
            return text
        elif extension in (".docx",):
            from docx import Document
            doc = Document(filepath)
            return "\n".join([p.text for p in doc.paragraphs])
        elif extension in (".txt", ".rtf"):
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
    except Exception:
        return ""
    return ""


@router.post("/upload", response_model=schemas.DocumentoResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    processo_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo não permitido. Use: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 🔐 VERIFICA SE O PROCESSO PERTENCE AO USUÁRIO
    if processo_id is not None:
        processo = db.query(models.Processo).filter(
            models.Processo.id == processo_id,
            models.Processo.advogado_id == current_user.id
        ).first()

        if not processo:
            raise HTTPException(
                status_code=404,
                detail="Processo não encontrado"
            )

    os.makedirs(settings.upload_dir, exist_ok=True)

    unique_name = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.upload_dir, unique_name)

    content = await file.read()

    if len(content) > settings.max_file_size:
        raise HTTPException(
            status_code=400,
            detail="Arquivo muito grande. Máximo: 10MB"
        )

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    doc = models.Documento(
        nome=unique_name,
        nome_original=file.filename or unique_name,
        tipo=ext.lstrip("."),
        tamanho=len(content),
        caminho=filepath,
        processo_id=processo_id,
        uploader_id=current_user.id,
        status=models.DocumentoStatus.processando,
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Extract text synchronously
    texto = extract_text(filepath, ext)
    doc.conteudo_extraido = texto[:50000]
    doc.status = models.DocumentoStatus.analisado
    db.commit()

    # Notification
    notif = models.Notification(
        user_id=current_user.id,
        titulo="Novo documento recebido",
        mensagem=f"'{file.filename}' foi enviado e está pronto para análise.",
        tipo="success",
    )

    db.add(notif)
    db.commit()
    db.refresh(doc)

    return doc


@router.post("/{doc_id}/analyze", response_model=dict)
async def analyze_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from app.ai_agent import analyze_document as ai_analyze

    doc = db.query(models.Documento).filter(
        models.Documento.id == doc_id,
        models.Documento.uploader_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    content = doc.conteudo_extraido or ""
    if not content:
        content = extract_text(doc.caminho, f".{doc.tipo}")
        doc.conteudo_extraido = content[:50000]

    analysis = await ai_analyze(content, doc.nome_original)

    import json
    doc.ai_resumo = analysis.get("resumo", "")
    doc.ai_datas = json.dumps(analysis.get("datas", []), ensure_ascii=False)
    doc.ai_partes = json.dumps(analysis.get("partes", []), ensure_ascii=False)
    doc.ai_obrigacoes = json.dumps(analysis.get("obrigacoes", []), ensure_ascii=False)
    doc.ai_pontos_importantes = json.dumps(analysis.get("pontos_importantes", []), ensure_ascii=False)
    doc.status = models.DocumentoStatus.analisado
    db.commit()

    # Notification
    notif = models.Notification(
        user_id=current_user.id,
        titulo="Documento analisado pela IA",
        mensagem=f"'{doc.nome_original}' foi analisado com sucesso.",
        tipo="success",
    )
    db.add(notif)
    db.commit()
    db.refresh(doc)

    return {**analysis, "documento_id": doc.id, "status": "analisado"}


@router.get("", response_model=List[schemas.DocumentoResponse])
def list_documentos(
    processo_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Documento).filter(models.Documento.uploader_id == current_user.id)
    if processo_id:
        q = q.filter(models.Documento.processo_id == processo_id)
    return q.order_by(models.Documento.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{doc_id}", response_model=schemas.DocumentoResponse)
def get_documento(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    doc = db.query(models.Documento).filter(
        models.Documento.id == doc_id,
        models.Documento.uploader_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return doc


@router.delete("/{doc_id}", status_code=204)
def delete_documento(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    doc = db.query(models.Documento).filter(
        models.Documento.id == doc_id,
        models.Documento.uploader_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    try:
        if os.path.exists(doc.caminho):
            os.remove(doc.caminho)
    except Exception:
        pass
    db.delete(doc)
    db.commit()
