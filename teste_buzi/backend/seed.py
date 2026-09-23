"""Seed the database with demo data."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models
from app.auth import get_password_hash
from datetime import datetime, timedelta, timezone

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

def seed():
    # Check if already seeded
    if db.query(models.User).first():
        print("Database already seeded.")
        return

    print("Seeding database...")

    # Create demo user
    user = models.User(
        nome="Dr. Carlos Mendes",
        email="demo@jurisai.com",
        hashed_password=get_password_hash("demo123"),
        oab="SP-123456",
        cargo="Advogado Sênior",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    now = datetime.now(timezone.utc)

    # Create processos
    processos_data = [
        {
            "numero": "1234567-89.2023.8.26.0001",
            "cliente": "João Silva Santos",
            "tipo": "Ação de Indenização",
            "tribunal": "TJSP — 1ª Vara Cível",
            "vara": "1ª Vara Cível",
            "status": models.ProcessoStatus.ativo,
            "descricao": "Ação de indenização por danos morais e materiais decorrentes de acidente de trânsito.",
            "valor_causa": 50000.00,
            "data_abertura": now - timedelta(days=180),
            "parte_contraria": "Seguradora ABC Ltda.",
        },
        {
            "numero": "9876543-21.2023.8.26.0002",
            "cliente": "Maria Oliveira Costa",
            "tipo": "Ação Trabalhista",
            "tribunal": "TRT 2ª Região",
            "vara": "3ª Vara do Trabalho",
            "status": models.ProcessoStatus.aguardando,
            "descricao": "Reclamação trabalhista por verbas rescisórias não pagas.",
            "valor_causa": 35000.00,
            "data_abertura": now - timedelta(days=90),
            "parte_contraria": "Empresa XYZ Comércio S.A.",
        },
        {
            "numero": "5555555-00.2022.8.26.0003",
            "cliente": "Pedro Fernandes Lima",
            "tipo": "Ação de Divórcio",
            "tribunal": "TJSP — 2ª Vara de Família",
            "vara": "2ª Vara de Família",
            "status": models.ProcessoStatus.ativo,
            "descricao": "Divórcio consensual com partilha de bens.",
            "valor_causa": 120000.00,
            "data_abertura": now - timedelta(days=60),
            "parte_contraria": "Ana Paula Lima",
        },
        {
            "numero": "1111111-11.2024.8.26.0004",
            "cliente": "Empresa Tech Solutions Ltda.",
            "tipo": "Ação de Cobrança",
            "tribunal": "TJSP — 5ª Vara Cível",
            "vara": "5ª Vara Cível",
            "status": models.ProcessoStatus.ativo,
            "descricao": "Ação de cobrança de contrato de prestação de serviços.",
            "valor_causa": 85000.00,
            "data_abertura": now - timedelta(days=30),
            "parte_contraria": "Cliente Inadimplente ME",
        },
        {
            "numero": "2222222-22.2021.8.26.0005",
            "cliente": "Roberto Alves Nunes",
            "tipo": "Inventário",
            "tribunal": "TJSP — 1ª Vara de Sucessões",
            "vara": "1ª Vara de Sucessões",
            "status": models.ProcessoStatus.concluido,
            "descricao": "Inventário judicial de bens imóveis.",
            "valor_causa": 450000.00,
            "data_abertura": now - timedelta(days=400),
            "data_encerramento": now - timedelta(days=30),
            "parte_contraria": None,
        },
    ]

    processos = []
    for pd in processos_data:
        p = models.Processo(**pd, advogado_id=user.id)
        db.add(p)
        processos.append(p)
    db.commit()
    for p in processos:
        db.refresh(p)

    # Add movimentações
    movimentacoes = [
        (processos[0].id, "Petição Inicial", "Petição inicial protocolada com pedido de liminar.", now - timedelta(days=180)),
        (processos[0].id, "Despacho", "Juiz determinou citação da parte ré.", now - timedelta(days=170)),
        (processos[0].id, "Citação", "Parte ré citada via Correios.", now - timedelta(days=155)),
        (processos[0].id, "Contestação", "Parte ré apresentou contestação negando os fatos.", now - timedelta(days=130)),
        (processos[0].id, "Réplica", "Réplica à contestação apresentada.", now - timedelta(days=110)),
        (processos[0].id, "Audiência de Conciliação", "Audiência realizada — partes não chegaram a acordo.", now - timedelta(days=45)),
        (processos[1].id, "Reclamação Trabalhista", "Reclamação protocolada na VT.", now - timedelta(days=90)),
        (processos[1].id, "Notificação", "Reclamada notificada para audiência.", now - timedelta(days=80)),
        (processos[1].id, "Audiência Inicial", "Audiência realizada, tentativa de conciliação frustrada.", now - timedelta(days=60)),
        (processos[2].id, "Petição de Divórcio", "Petição de divórcio consensual protocolada.", now - timedelta(days=60)),
        (processos[2].id, "Despacho", "Juiz designou audiência de ratificação.", now - timedelta(days=50)),
        (processos[3].id, "Petição Inicial", "Ação de cobrança protocolada.", now - timedelta(days=30)),
        (processos[3].id, "Despacho", "Juiz determinou citação da ré.", now - timedelta(days=25)),
    ]

    for proc_id, tipo, desc, data in movimentacoes:
        m = models.Movimentacao(processo_id=proc_id, tipo=tipo, descricao=desc, data=data)
        db.add(m)
    db.commit()

    # Add prazos
    prazos_data = [
        (processos[0].id, "Manifestação sobre laudo pericial", "Manifestar sobre o laudo pericial apresentado.", now + timedelta(days=3)),
        (processos[0].id, "Alegações Finais", "Apresentar alegações finais no prazo legal.", now + timedelta(days=10)),
        (processos[1].id, "Recurso Ordinário", "Interpor recurso ordinário à decisão.", now + timedelta(days=5)),
        (processos[2].id, "Ratificação em Audiência", "Comparecer à audiência de ratificação.", now + timedelta(days=15)),
        (processos[3].id, "Impugnação à Contestação", "Apresentar impugnação à contestação da ré.", now + timedelta(days=7)),
    ]

    for proc_id, titulo, desc, venc in prazos_data:
        pr = models.Prazo(
            processo_id=proc_id,
            titulo=titulo,
            descricao=desc,
            data_vencimento=venc,
            status=models.PrazoStatus.pendente,
        )
        db.add(pr)
    db.commit()

    # Add notifications
    notifs = [
        ("Prazo urgente identificado", "O processo 1234567-89.2023 tem prazo em 3 dias para manifestação sobre laudo.", "error", processos[0].id),
        ("Novo documento analisado", "O documento 'Contestação_ABC.pdf' foi analisado pela IA.", "success", None),
        ("Nova movimentação cadastrada", "Audiência de Conciliação registrada no processo João Silva.", "info", processos[0].id),
        ("Processo que precisa de atenção", "O processo de Maria Oliveira está aguardando há mais de 60 dias.", "warning", processos[1].id),
        ("Prazo próximo", "Recurso Ordinário vence em 5 dias — TRT 2ª Região.", "warning", processos[1].id),
    ]

    for titulo, msg, tipo, proc_id in notifs:
        n = models.Notification(
            user_id=user.id,
            titulo=titulo,
            mensagem=msg,
            tipo=tipo,
            processo_id=proc_id,
        )
        db.add(n)
    db.commit()

    print("✅ Database seeded successfully!")
    print("📧 Demo login: demo@jurisai.com / demo123")

if __name__ == "__main__":
    seed()
    db.close()
