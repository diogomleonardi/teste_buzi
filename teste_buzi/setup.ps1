# ─────────────────────────────────────────────────────────────────────────────
# JurisAI — Setup Script (Windows PowerShell)
# ─────────────────────────────────────────────────────────────────────────────

Write-Host "🏛️  JurisAI — Configurando o ambiente..." -ForegroundColor Cyan
Write-Host ""

# ── Backend ──────────────────────────────────────────────────────────────────
Write-Host "📦 Configurando backend..." -ForegroundColor Yellow
Set-Location backend

# Create virtual environment
if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "✅ Ambiente virtual criado" -ForegroundColor Green
}

# Activate
& .\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt -q

# Create .env from example
if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "✅ Arquivo .env criado" -ForegroundColor Green
    Write-Host "⚠️  Configure OPENAI_API_KEY em backend\.env para usar a IA" -ForegroundColor Yellow
}

# Seed database
Write-Host "🌱 Populando banco de dados..." -ForegroundColor Yellow
python seed.py

Set-Location ..

# ── Frontend ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "📦 Instalando dependências do frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ JurisAI configurado com sucesso!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para iniciar o sistema, abra 2 terminais:" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 1 (Backend):" -ForegroundColor Yellow
Write-Host "    cd backend" -ForegroundColor Gray
Write-Host "    .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "    uvicorn app.main:app --reload --port 8000" -ForegroundColor Gray
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor Yellow
Write-Host "    cd frontend" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  Acesse: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Login demo: demo@jurisai.com / demo123" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Configure OPENAI_API_KEY em backend\.env para usar a IA" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
