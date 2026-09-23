# ─────────────────────────────────────────────────────────────────────────────
# JurisAI — Primeiro uso com Docker (Windows PowerShell)
# ─────────────────────────────────────────────────────────────────────────────

$MODEL = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { "llama3:text" }

Write-Host "🏛️  JurisAI — Iniciando com Docker..." -ForegroundColor Cyan
Write-Host ""

# Copia .env se não existir
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Arquivo .env criado a partir do .env.example" -ForegroundColor Green
}

# Sobe os containers
Write-Host "🐳 Iniciando containers (primeiro build pode demorar)..." -ForegroundColor Yellow
docker compose up -d --build

# Aguarda o Ollama
Write-Host "⏳ Aguardando Ollama ficar pronto..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 3
    $ready = docker exec jurisai_ollama ollama list 2>$null
} until ($?)

# Baixa o modelo
Write-Host "📥 Baixando modelo '$MODEL' (pode demorar na primeira vez)..." -ForegroundColor Yellow
docker exec jurisai_ollama ollama pull $MODEL

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ JurisAI está rodando!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  🌐 Acesse: http://localhost" -ForegroundColor White
Write-Host "  📧 Login demo: demo@jurisai.com" -ForegroundColor White
Write-Host "  🔑 Senha demo: demo123" -ForegroundColor White
Write-Host ""
Write-Host "  Outros comandos úteis:" -ForegroundColor Yellow
Write-Host "  docker compose logs -f        # ver logs" -ForegroundColor Gray
Write-Host "  docker compose down           # parar tudo" -ForegroundColor Gray
Write-Host "  docker compose restart        # reiniciar" -ForegroundColor Gray
Write-Host ""
Write-Host "  Trocar modelo Ollama:" -ForegroundColor Yellow
Write-Host "  docker exec jurisai_ollama ollama pull mistral" -ForegroundColor Gray
Write-Host "  # depois edite OLLAMA_MODEL=mistral em .env e reinicie" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
