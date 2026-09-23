import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import {
  Bot, Send, Loader2, Copy, CheckCheck, Trash2,
  Scale, FileText, User, Info
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../lib/api'
import { generateSessionId, formatRelative } from '../lib/utils'
import type { Processo, Documento, ChatMessage } from '../types'
import toast from 'react-hot-toast'

const SUGGESTED_QUESTIONS = [
  'Resuma os principais pontos deste processo',
  'Quais são as próximas etapas processuais?',
  'Existem prazos mencionados?',
  'Explique a última movimentação em linguagem simples',
  'Quais documentos estão relacionados?',
  'Quais são os pontos mais importantes?',
]

function ChatBubble({ msg, onCopy }: { msg: ChatMessage; onCopy: (text: string) => void }) {
  const isUser = msg.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopy(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isUser ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
          {isUser ? (
            <p className="text-sm">{msg.content}</p>
          ) : (
            <div className="prose-legal text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelative(msg.created_at)}</span>
          {!isUser && (
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title="Copiar resposta"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function AssistentePage() {
  const [searchParams] = useSearchParams()
  const processoIdParam = searchParams.get('processo')

  const [sessionId] = useState(() => generateSessionId())
  const [message, setMessage] = useState('')
  const [selectedProcesso, setSelectedProcesso] = useState<number | null>(processoIdParam ? parseInt(processoIdParam) : null)
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: processos = [] } = useQuery<Processo[]>(
    'processos-chat',
    () => api.get('/processos').then(r => r.data)
  )
  const { data: documentos = [] } = useQuery<Documento[]>(
    'documentos-chat',
    () => api.get('/documentos').then(r => r.data)
  )

  // Load initial history
  useEffect(() => {
    api.get('/chat/history', { params: { session_id: sessionId } })
      .then(r => setMessages(r.data))
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim() || sending) return

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: message.trim(),
      processo_id: selectedProcesso || undefined,
      documento_id: selectedDoc || undefined,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setMessage('')
    setSending(true)
    inputRef.current?.focus()

    try {
      const res = await api.post('/chat/message', {
        content: userMsg.content,
        processo_id: selectedProcesso || null,
        documento_id: selectedDoc || null,
        session_id: sessionId,
      })
      setMessages(prev => [...prev, res.data])
    } catch (err: any) {
      toast.error('Erro ao enviar mensagem')
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  const handleClearHistory = async () => {
    if (!confirm('Limpar histórico desta conversa?')) return
    await api.delete('/chat/history', { params: { session_id: sessionId } })
    setMessages([])
    toast.success('Histórico limpo')
  }

  const selectedProcessoData = processos.find(p => p.id === selectedProcesso)
  const selectedDocData = documentos.find(d => d.id === selectedDoc)

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-600" />
            Assistente Jurídico IA
          </h1>
          <p className="page-subtitle">Faça perguntas sobre processos e documentos</p>
        </div>
        <button onClick={handleClearHistory} className="btn-ghost text-sm gap-1">
          <Trash2 className="w-4 h-4" />
          Limpar
        </button>
      </div>

      {/* Context selectors */}
      <div className="card p-3 mb-3 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Scale className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            className="input text-sm py-1.5"
            value={selectedProcesso || ''}
            onChange={e => setSelectedProcesso(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Selecionar processo (opcional)</option>
            {processos.map(p => (
              <option key={p.id} value={p.id}>{p.cliente} — {p.numero}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            className="input text-sm py-1.5"
            value={selectedDoc || ''}
            onChange={e => setSelectedDoc(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Selecionar documento (opcional)</option>
            {documentos.map(d => (
              <option key={d.id} value={d.id}>{d.nome_original}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Context chips */}
      {(selectedProcessoData || selectedDocData) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedProcessoData && (
            <span className="badge-blue flex items-center gap-1.5 text-xs py-1.5 px-3">
              <Scale className="w-3 h-3" />
              {selectedProcessoData.cliente}
            </span>
          )}
          {selectedDocData && (
            <span className="badge-green flex items-center gap-1.5 text-xs py-1.5 px-3">
              <FileText className="w-3 h-3" />
              {selectedDocData.nome_original}
            </span>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto card p-4 space-y-4 mb-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Assistente Jurídico</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Faça perguntas sobre processos, documentos, prazos e movimentações. Selecione um processo ou documento acima para dar contexto.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setMessage(q)}
                  className="text-left text-xs px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-400 transition-all"
                >
                  "{q}"
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 max-w-sm">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                As respostas da IA têm finalidade de apoio e não substituem a orientação de um profissional jurídico habilitado.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <ChatBubble key={msg.id} msg={msg} onCopy={handleCopy} />
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="chat-bubble-assistant">
                  <div className="flex gap-1 items-center py-1">
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="card p-3">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta sobre o processo ou documento..."
              rows={2}
              className="input resize-none py-2.5 text-sm"
              disabled={sending}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="btn-primary px-4 py-2.5 flex-shrink-0 self-end"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}
