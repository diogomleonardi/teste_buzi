#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# JurisAI — Primeiro uso com Docker
# ─────────────────────────────────────────────────────────────────────────────
set -e

MODEL=${OLLAMA_MODEL:-llama3:8b}

echo "🏛️  JurisAI — Iniciando com Docker..."
echo ""

# Copia .env se não existir
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Arquivo .env criado a partir do .env.example"
fi

# Sobe os containers
echo "🐳 Iniciando containers..."
docker compose up -d --build

echo ""
echo "⏳ Aguardando Ollama ficar pronto..."
until docker exec jurisai_ollama ollama list > /dev/null 2>&1; do
  sleep 3
done

echo "📥 Baixando modelo '$MODEL' no Ollama (pode demorar na primeira vez)..."
docker exec jurisai_ollama ollama pull "$MODEL"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ JurisAI está rodando!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  🌐 Acesse: http://localhost"
echo "  📧 Login demo: demo@jurisai.com"
echo "  🔑 Senha demo: demo123"
echo ""
echo "  Outros comandos úteis:"
echo "  docker compose logs -f        # ver logs"
echo "  docker compose down           # parar tudo"
echo "  docker compose restart        # reiniciar"
echo ""
echo "  Trocar modelo Ollama:"
echo "  docker exec jurisai_ollama ollama pull mistral"
echo "  # depois edite OLLAMA_MODEL=mistral em .env e reinicie"
echo "═══════════════════════════════════════════════════════════"
