"""
Agente Jurídico com IA — integração com Ollama (local).

Utiliza a API REST do Ollama (http://localhost:11434).
O agente apenas organiza e resume informações fornecidas pelo usuário.
Não inventa jurisprudência, legislação ou dados processuais.
"""
import json
import httpx
from typing import Optional, List, Dict
from app.config import settings

SYSTEM_PROMPT = """Você é um assistente jurídico especializado em apoio à gestão de processos.
Seu papel é AUXILIAR advogados e profissionais jurídicos a organizar, resumir e compreender informações de processos e documentos.

DIRETRIZES FUNDAMENTAIS:
1. Baseie suas respostas APENAS nas informações fornecidas pelo usuário ou presentes nos documentos/processos disponíveis.
2. NUNCA invente jurisprudência, artigos de lei, decisões judiciais ou dados processuais.
3. Se não houver informações suficientes, informe claramente essa limitação.
4. Quando houver incerteza, declare explicitamente: "Com base nas informações disponíveis..." ou "Não tenho informações suficientes para..."
5. Não tome decisões jurídicas — apenas organize e apresente informações.
6. Explique termos jurídicos de forma clara quando solicitado.
7. SEMPRE inclua o aviso: as informações têm finalidade de apoio e não substituem orientação profissional.

CAPACIDADES:
- Resumir processos e documentos
- Extrair datas, prazos e partes envolvidas
- Identificar obrigações e pontos importantes
- Explicar movimentações processuais em linguagem acessível
- Organizar e relacionar informações de documentos
- Gerar resumos estruturados

LIMITAÇÕES:
- Não tenho acesso à internet ou bases jurídicas externas
- Não atualizo dados em tempo real
- Não consulto sistemas jurídicos externos (PJe, e-SAJ, etc.)

Responda sempre em português do Brasil, de forma clara, organizada e profissional."""


# ── Ollama helpers ─────────────────────────────────────────────────────────────

async def _ollama_available() -> bool:
    """Verifica se o Ollama está rodando e o modelo está disponível."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            if r.status_code != 200:
                return False
            models = [m["name"] for m in r.json().get("models", [])]
            # Accept exact match or prefix match (e.g. "llama3" matches "llama3:8b")
            return any(
                m == settings.ollama_model or m.startswith(settings.ollama_model)
                for m in models
            )
    except Exception:
        return False


async def _chat(
    messages: List[Dict[str, str]],
    temperature: float = 0.3,
    json_mode: bool = False,
) -> str:
    """
    Chama POST /api/chat do Ollama (protocolo nativo).
    Retorna o conteúdo da resposta como string.
    """
    payload: Dict = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature},
    }
    if json_mode:
        payload["format"] = "json"

    async with httpx.AsyncClient(
        base_url=settings.ollama_base_url,
        timeout=120.0,           # modelos locais podem ser lentos
    ) as client:
        r = await client.post("/api/chat", json=payload)
        r.raise_for_status()
        return r.json()["message"]["content"]


# ── Public functions ───────────────────────────────────────────────────────────

async def analyze_document(content: str, filename: str) -> Dict:
    """Analisa um documento jurídico e extrai informações estruturadas."""
    if not await _ollama_available():
        return _mock_document_analysis(filename)

    prompt = f"""Analise o seguinte documento jurídico e forneça uma análise estruturada.

Nome do arquivo: {filename}
Conteúdo:
{content[:8000]}

Responda SOMENTE com um objeto JSON válido, sem texto antes ou depois, no formato:
{{
  "resumo": "Resumo conciso do documento em 2-3 parágrafos",
  "tipo_documento": "Tipo do documento (petição, decisão, sentença, etc.)",
  "datas": ["lista de datas importantes encontradas no formato: Data - Descrição"],
  "partes": ["lista de partes envolvidas: Nome - Papel"],
  "obrigacoes": ["lista de obrigações identificadas"],
  "pontos_importantes": ["lista de pontos importantes"],
  "prazos_identificados": ["lista de prazos mencionados"]
}}

Se algum campo não tiver informações, use uma lista vazia [] ou string vazia "".
IMPORTANTE: Baseie-se APENAS no conteúdo fornecido."""

    try:
        raw = await _chat(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            json_mode=True,
        )
        return _parse_json(raw, _mock_document_analysis(filename))
    except Exception as exc:
        return _mock_document_analysis(filename)


async def analyze_processo(processo_data: dict) -> Dict:
    """Gera análise de IA para um processo."""
    if not await _ollama_available():
        return _mock_processo_analysis(processo_data)

    movimentacoes_text = "\n".join([
        f"- {m.get('data', '')}: {m.get('tipo', '')} - {m.get('descricao', '')}"
        for m in processo_data.get("movimentacoes", [])[:20]
    ])

    prompt = f"""Analise as informações do seguinte processo jurídico:

Número: {processo_data.get('numero')}
Cliente: {processo_data.get('cliente')}
Tipo: {processo_data.get('tipo')}
Tribunal: {processo_data.get('tribunal')}
Status: {processo_data.get('status')}
Parte Contrária: {processo_data.get('parte_contraria', 'Não informado')}

Movimentações:
{movimentacoes_text if movimentacoes_text else 'Nenhuma movimentação registrada'}

Responda SOMENTE com um objeto JSON válido, sem texto antes ou depois, no formato:
{{
  "resumo": "Resumo do processo em 2-3 parágrafos",
  "principais_acontecimentos": ["lista dos principais acontecimentos"],
  "pontos_importantes": ["pontos que merecem atenção"],
  "situacao_atual": "Situação atual do processo com base nas movimentações"
}}

IMPORTANTE: Baseie-se APENAS nas informações fornecidas acima."""

    try:
        raw = await _chat(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            json_mode=True,
        )
        return _parse_json(raw, _mock_processo_analysis(processo_data))
    except Exception:
        return _mock_processo_analysis(processo_data)


async def chat_with_agent(
    message: str,
    history: List[Dict[str, str]],
    context: Optional[str] = None,
) -> str:
    """Conversa com o agente jurídico usando Ollama."""
    if not await _ollama_available():
        return _mock_chat_response(message)

    messages: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if context:
        messages.append({
            "role": "system",
            "content": f"Contexto adicional disponível:\n{context}",
        })

    # Últimas 10 mensagens do histórico
    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": message})

    try:
        reply = await _chat(messages, temperature=0.3)
        disclaimer = (
            "\n\n---\n"
            "*⚠️ As informações acima têm finalidade de apoio e organização "
            "e não substituem a análise de um advogado ou profissional jurídico habilitado.*"
        )
        return reply + disclaimer
    except Exception as exc:
        return (
            f"Desculpe, ocorreu um erro ao processar sua pergunta. "
            f"Verifique se o Ollama está rodando e o modelo **{settings.ollama_model}** está disponível.\n\n"
            f"Erro técnico: {exc}"
        )


# ── Helpers ────────────────────────────────────────────────────────────────────

def _parse_json(raw: str, fallback: Dict) -> Dict:
    """Tenta extrair JSON da resposta do modelo."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Alguns modelos envolvem o JSON em blocos ```json … ```
        import re
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        return fallback


# ── Mock responses ─────────────────────────────────────────────────────────────

def _mock_document_analysis(filename: str) -> Dict:
    return {
        "resumo": (
            f"⚠️ **Ollama não disponível** — o documento '{filename}' foi recebido com sucesso.\n\n"
            f"Para análise por IA, verifique:\n"
            f"1. O Ollama está instalado e rodando (`ollama serve`)\n"
            f"2. O modelo está baixado: `ollama pull {settings.ollama_model}`\n"
            f"3. A URL configurada em `OLLAMA_BASE_URL` está correta (padrão: http://localhost:11434)"
        ),
        "tipo_documento": "Documento jurídico (análise pendente)",
        "datas": ["Ollama indisponível — inicie o serviço para extração automática"],
        "partes": ["Ollama indisponível — inicie o serviço para identificação de partes"],
        "obrigacoes": [],
        "pontos_importantes": [
            "O documento foi armazenado com sucesso",
            f"Execute: ollama pull {settings.ollama_model}",
            "Depois clique em 'Analisar' novamente",
        ],
        "prazos_identificados": [],
    }


def _mock_processo_analysis(processo_data: dict) -> Dict:
    return {
        "resumo": (
            f"⚠️ **Ollama não disponível** — inicie o serviço para analisar o processo "
            f"{processo_data.get('numero', '')}.\n\n"
            f"Execute: `ollama serve` e `ollama pull {settings.ollama_model}`"
        ),
        "principais_acontecimentos": ["Ollama indisponível — inicie o serviço para análise automática"],
        "pontos_importantes": [f"Execute: ollama pull {settings.ollama_model}"],
        "situacao_atual": f"Status atual: {processo_data.get('status', 'Não informado')}",
    }


def _mock_chat_response(message: str) -> str:
    return f"""⚠️ **Ollama não está disponível**

Recebi sua mensagem: *"{message}"*

Para usar o assistente jurídico com IA local, siga os passos:

**1. Instalar o Ollama**
Acesse [ollama.com](https://ollama.com) e instale para o seu sistema operacional.

**2. Iniciar o serviço**
```
ollama serve
```

**3. Baixar o modelo**
```
ollama pull {settings.ollama_model}
```

**4. (Opcional) Alterar o modelo em `backend/.env`**
```
OLLAMA_MODEL=llama3
OLLAMA_BASE_URL=http://localhost:11434
```

Modelos recomendados para uso jurídico:
- `llama3` — equilíbrio entre velocidade e qualidade
- `llama3:70b` — maior qualidade (exige mais RAM)
- `mistral` — rápido e eficiente
- `gemma2` — boa capacidade em português

**Funcionalidades disponíveis sem IA:**
- Cadastro e gestão de processos
- Upload e armazenamento de documentos
- Controle de prazos
- Sistema de notificações

---
*⚠️ As informações apresentadas pela IA possuem finalidade de apoio e organização e não substituem a análise de um advogado ou profissional jurídico habilitado.*"""
