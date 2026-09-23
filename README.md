# JurisAI — Assistente Jurídico com IA

Sistema completo de gestão jurídica com inteligência artificial rodando **100% local** com Ollama.

---

## 🐳 Início rápido com Docker (recomendado)

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando

### 1. Clonar / abrir o projeto

```bash
cd jurisai
```

### 2. Iniciar tudo com um comando

**Linux / macOS:**
```bash
chmod +x docker-start.sh && ./docker-start.sh
```

**Windows (PowerShell):**
```powershell
.\docker-start.ps1
```

O script irá:
1. Copiar `.env.example` → `.env`
2. Fazer o build e subir os 3 containers (Ollama + Backend + Frontend)
3. Baixar o modelo `llama3` automaticamente no Ollama

### 3. Acessar

| URL | Descrição |
|-----|-----------|
| **http://localhost** | Interface do JurisAI |
| http://localhost:8000/api/docs | Documentação da API (Swagger) |
| http://localhost:11434 | API do Ollama |

**Login demo:** `demo@jurisai.com` / `demo123`

---

## 🐳 Comandos Docker úteis

```bash
# Subir tudo (sem rebuild)
docker compose up -d

# Subir com rebuild forçado
docker compose up -d --build

# Ver logs em tempo real
docker compose logs -f

# Ver logs de um serviço específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f ollama

# Parar tudo (dados preservados)
docker compose down

# Parar e remover volumes (APAGA banco e modelos!)
docker compose down -v

# Reiniciar um serviço
docker compose restart backend

# Baixar outro modelo no Ollama
docker exec jurisai_ollama ollama pull mistral

# Ver modelos disponíveis
docker exec jurisai_ollama ollama list

# Acessar o shell do backend
docker exec -it jurisai_backend sh
```

---

## 🤖 Trocar o modelo Ollama

1. Baixe o novo modelo:
   ```bash
   docker exec jurisai_ollama ollama pull mistral
   ```

2. Edite `.env` na raiz do projeto:
   ```env
   OLLAMA_MODEL=mistral
   ```

3. Reinicie o backend:
   ```bash
   docker compose restart backend
   ```

### Modelos recomendados

| Modelo | RAM mínima | Qualidade | Velocidade |
|--------|-----------|-----------|------------|
| `llama3:text` | 8 GB | ★★★★ | ★★★ |
| `mistral` | 6 GB | ★★★ | ★★★★ |
| `llama3:70b` | 48 GB | ★★★★★ | ★★ |
| `gemma2` | 8 GB | ★★★★ | ★★★ |
| `phi3` | 4 GB | ★★★ | ★★★★★ |

---

## 🏗️ Arquitetura Docker

```
┌─────────────────────────────────────────────────────┐
│  docker-compose.yml                                 │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │   frontend   │    │        backend           │  │
│  │  React/Nginx │───▶│       FastAPI            │  │
│  │   :80        │    │        :8000             │  │
│  └──────────────┘    └──────────┬───────────────┘  │
│                                 │                   │
│                       ┌─────────▼───────────┐      │
│                       │       ollama        │      │
│                       │    llama3/mistral   │      │
│                       │       :11434        │      │
│                       └─────────────────────┘      │
│                                                     │
│  Volumes persistidos:                               │
│    ollama_data  → modelos (~4-8 GB)                 │
│    backend_data → banco SQLite + uploads            │
└─────────────────────────────────────────────────────┘
```

O **Nginx** (dentro do container frontend) faz proxy reverso das requisições `/api/*` para o backend — o browser só precisa falar com a porta 80.

---

## ⚙️ Início manual (sem Docker)

<details>
<summary>Expandir instruções sem Docker</summary>

### Pré-requisitos
- Python 3.10+
- Node.js 18+ e npm
- Ollama instalado localmente

### Backend

```bash
cd backend
python -m venv venv

# Linux/macOS:
source venv/bin/activate
# Windows:
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
cp .env.example .env   # ajuste OLLAMA_BASE_URL=http://localhost:11434
python seed.py
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # acesse http://localhost:5173
```

### Ollama

```bash
ollama serve
ollama pull llama3
```

</details>

---

## 📁 Estrutura do Projeto

```
jurisai/
├── docker-compose.yml       ← orquestra os 3 serviços
├── .env.example             ← variáveis de ambiente do compose
├── docker-start.sh          ← script de primeiro uso (Linux/macOS)
├── docker-start.ps1         ← script de primeiro uso (Windows)
│
├── backend/
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── models.py        # Modelos SQLAlchemy
│   │   ├── schemas.py       # Schemas Pydantic
│   │   ├── auth.py          # Autenticação JWT
│   │   ├── ai_agent.py      # Agente IA (Ollama via httpx)
│   │   ├── database.py      # SQLite
│   │   ├── config.py        # Configurações
│   │   └── routes/          # Endpoints da API
│   ├── seed.py              # Dados de demonstração
│   └── requirements.txt
│
└── frontend/
    ├── Dockerfile           # multi-stage: Node build + Nginx
    ├── nginx.conf           # SPA + proxy /api → backend
    └── src/
        ├── pages/           # 10 telas completas
        ├── components/      # Layout, sidebar
        ├── lib/             # API client, utils
        ├── store/           # Zustand
        └── types/           # TypeScript
```

---

## 🔧 Tecnologias

### Backend
- **FastAPI** — API REST assíncrona
- **SQLAlchemy + SQLite** — Banco de dados
- **JWT + bcrypt** — Autenticação segura
- **Ollama** — Modelos de IA locais (llama3, mistral, gemma2…)
- **httpx** — Cliente HTTP assíncrono para o Ollama
- **PyPDF2, python-docx** — Extração de texto de documentos

### Frontend
- **React 18 + TypeScript** — Interface
- **Vite** — Build tool
- **TailwindCSS** — Estilização
- **Framer Motion** — Animações
- **Recharts** — Gráficos interativos
- **React Query** — Cache de dados
- **Zustand** — Estado global

### Infraestrutura
- **Docker + Docker Compose** — Orquestração
- **Nginx** — Servidor web + proxy reverso
- **Ollama** — Runtime de LLMs local

---

## ⚠️ Aviso de Responsabilidade

As informações apresentadas pela IA possuem **finalidade de apoio e organização** e não substituem a análise de um advogado ou profissional jurídico habilitado.

A IA:
- ✅ Organiza e resume informações fornecidas
- ✅ Extrai datas e partes de documentos
- ✅ Explica termos jurídicos em linguagem acessível
- ❌ **Não** inventa jurisprudência ou legislação
- ❌ **Não** toma decisões jurídicas
- ❌ **Não** garante resultados de processos
