import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Scale, Calendar, FileText, Bot, Plus, Loader2,
  Activity, Clock, AlertTriangle, X, Sparkles, ChevronRight, User,
  Building, DollarSign, Hash, Trash2
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../lib/api'
import { formatDate, formatDateTime, formatCurrency, getStatusColor, getStatusLabel, parseJsonArray } from '../lib/utils'
import type { Processo, Movimentacao } from '../types'
import toast from 'react-hot-toast'


function AddMovimentacaoModal({ processoId, onClose, onSuccess }: { processoId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ tipo: '', descricao: '', data: new Date().toISOString().slice(0, 10) })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/processos/${processoId}/movimentacoes`, {
        ...form,
        data: new Date(form.data).toISOString(),
      })
      toast.success('Movimentação cadastrada!')
      onSuccess()
      onClose()
    } catch {
      toast.error('Erro ao cadastrar movimentação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nova Movimentação</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Tipo de movimentação *</label>
            <input className="input" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
              placeholder="Ex: Petição, Decisão, Audiência..." required />
          </div>
          <div>
            <label className="label">Data *</label>
            <input type="date" className="input" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} required />
          </div>
          <div>
            <label className="label">Descrição *</label>
            <textarea className="input resize-none" rows={4} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descreva a movimentação..." required />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function ProcessoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddMov, setShowAddMov] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  const { data: processo, isLoading } = useQuery<Processo>(
    ['processo', id],
    () => api.get(`/processos/${id}`).then(r => r.data),
    { enabled: !!id }
  )

  const deleteMutation = useMutation(
    (movimentacaoId: number) =>
      api.delete(
        `/processos/${id}/movimentacoes/${movimentacaoId}`
      ),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['processo', id])
        toast.success('Movimentação excluída')
      },
      onError: () => {
        toast.error('Erro ao excluir movimentação')
      }
    }
  )

  const handleAnalyzeAI = async () => {
    setAnalyzing(true)
    try {
      const res = await api.post(`/processos/${id}/analyze`)
      setAiResult(res.data)
      queryClient.invalidateQueries(['processo', id])
      toast.success('Análise da IA concluída!')
    } catch {
      toast.error('Erro ao analisar processo')
    } finally {
      setAnalyzing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="skeleton h-8 w-32 rounded" />
        <div className="card p-6">
          <div className="skeleton h-6 w-1/3 mb-4 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-4 w-full rounded" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!processo) {
    return (
      <div className="text-center py-16">
        <Scale className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Processo não encontrado</p>
        <Link to="/processos" className="btn-primary mt-4 mx-auto">Voltar</Link>
      </div>
    )
  }

  const movimentos = processo.movimentacoes || []

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">{processo.cliente}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{processo.numero}</p>
        </div>
        <span className={getStatusColor(processo.status)}>{getStatusLabel(processo.status)}</span>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main info */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-600" />
            Informações do Processo
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {[
              { icon: Hash, label: 'Número', value: processo.numero },
              { icon: User, label: 'Cliente', value: processo.cliente },
              { icon: Scale, label: 'Tipo', value: processo.tipo },
              { icon: Building, label: 'Tribunal', value: processo.tribunal },
              { icon: Building, label: 'Vara', value: processo.vara || '—' },
              { icon: User, label: 'Parte contrária', value: processo.parte_contraria || '—' },
              { icon: DollarSign, label: 'Valor da causa', value: formatCurrency(processo.valor_causa) },
              { icon: Calendar, label: 'Data de abertura', value: formatDate(processo.data_abertura) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Icon className="w-3 h-3" />{label}
                </dt>
                <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
          {processo.descricao && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descrição</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{processo.descricao}</p>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <button
            onClick={handleAnalyzeAI}
            disabled={analyzing}
            className="btn-primary w-full justify-center py-3"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? 'Analisando...' : 'Analisar com IA'}
          </button>

          <button onClick={() => setShowAddMov(true)} className="btn-secondary w-full justify-center">
            <Plus className="w-4 h-4" />
            Nova movimentação
          </button>

          <Link to={`/assistente?processo=${id}`} className="btn-secondary w-full justify-center flex">
            <Bot className="w-4 h-4" />
            Consultar IA
          </Link>

          <Link to={`/prazos?processo=${id}`} className="btn-secondary w-full justify-center flex">
            <Calendar className="w-4 h-4" />
            Gerenciar prazos
          </Link>
        </div>
      </div>

      {/* AI Analysis */}
      <AnimatePresence>
        {(aiResult || processo.ai_resumo) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="card border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10"
          >
            <div className="flex items-center gap-2 p-5 border-b border-blue-200 dark:border-blue-800">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">Análise da IA</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Baseada nas informações do processo</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {(aiResult?.resumo || processo.ai_resumo) && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Resumo</h3>
                  <div className="prose-legal text-slate-600 dark:text-slate-400 text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiResult?.resumo || processo.ai_resumo || ''}</ReactMarkdown>
                  </div>
                </div>
              )}

              {aiResult?.principais_acontecimentos?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Principais acontecimentos</h3>
                  <ul className="space-y-1">
                    {aiResult.principais_acontecimentos.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResult?.pontos_importantes?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Pontos importantes
                  </h3>
                  <ul className="space-y-1">
                    {aiResult.pontos_importantes.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                  ⚠️ As informações acima têm finalidade de apoio e organização e não substituem a análise de um advogado ou profissional jurídico habilitado.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Timeline de movimentações
          </h2>
          <button onClick={() => setShowAddMov(true)} className="btn-ghost text-sm gap-1">
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>

        <div className="p-5">
          {movimentos.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhuma movimentação registrada</p>
              <button onClick={() => setShowAddMov(true)} className="btn-primary mt-3 mx-auto text-sm">
                <Plus className="w-4 h-4" />
                Adicionar primeira movimentação
              </button>
            </div>
          ) : (
            <ol className="relative border-l border-slate-200 dark:border-slate-700 ml-3 space-y-0">
              {movimentos.map((mov, i) => (
                <motion.li
                  key={mov.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="mb-8 ml-6 last:mb-0"
                >
                  <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full -left-3 ring-4 ring-white dark:ring-slate-900">
                    <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </span>

                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                      {mov.tipo}
                    </span>

                    <time className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(mov.data)}
                    </time>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {mov.descricao}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Excluir esta movimentação?')) {
                          deleteMutation.mutate(mov.id)
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Excluir movimentação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddMov && (
          <AddMovimentacaoModal
            processoId={processo.id}
            onClose={() => setShowAddMov(false)}
            onSuccess={() => queryClient.invalidateQueries(['processo', id])}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
