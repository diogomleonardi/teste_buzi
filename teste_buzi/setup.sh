#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# JurisAI — Setup Script
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "🏛️  JurisAI — Configurando o ambiente..."
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
echo "📦 Instalando dependências do backend..."
cd backend

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "✅ Ambiente virtual criado"
fi

# Activate and install
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate
pip install -r requirements.txt -q

# Create .env from example if not exists
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✅ Arquivo .env criado — configure sua OPENAI_API_KEY em backend/.env"
fi

# Seed database
echo "🌱 Populando banco de dados com dados de demonstração..."
python seed.py

cd ..

# ── Frontend ─────────────────────────────────────────────────────────────────
echo ""
echo "📦 Instalando dependências do frontend..."
cd frontend
npm install
cd ..

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ JurisAI configurado com sucesso!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Para iniciar o sistema:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend"
echo "    source venv/bin/activate  # ou venv\\Scripts\\activate no Windows"
echo "    uvicorn app.main:app --reload --port 8000"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend"
echo "    npm run dev"
echo ""
echo "  Acesse: http://localhost:5173"
echo "  Login demo: demo@jurisai.com / demo123"
echo ""
echo "⚠️  Configure OPENAI_API_KEY em backend/.env para usar a IA"
echo "═══════════════════════════════════════════════════════════"
