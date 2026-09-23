import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Plus, X, Loader2, CheckCircle, Clock,
  AlertTriangle, ChevronRight, Scale, Filter, Pencil
} from 'lucide-react'
import api from '../lib/api'
import { formatDate, daysUntil, getUrgencyBadge, getUrgencyColor, getStatusColor, getStatusLabel, cn } from '../lib/utils'
import type { Prazo, Processo } from '../types'
import toast from 'react-hot-toast'

function AddPrazoModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { data: processos = [] } = useQuery<Processo[]>('processos-prazos', () => api.get('/processos').then(r => r.data))
  const [form, setForm] = useState({
    processo_id: '', titulo: '', descricao: '',
    data_vencimento: '', observacoes: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/prazos', {
        ...form,
        processo_id: parseInt(form.processo_id),
        data_vencimento: new Date(form.data_vencimento).toISOString(),
      })
      toast.success('Prazo cadastrado!')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao cadastrar prazo')
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
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Novo Prazo</h2>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Processo *</label>
            <select className="input" value={form.processo_id} onChange={e => setForm({ ...form, processo_id: e.target.value })} required>
              <option value="">Selecione o processo</option>
              {processos.map(p => <option key={p.id} value={p.id}>{p.cliente} — {p.numero}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Título do prazo *</label>
            <input className="input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Apresentar contestação" required />
          </div>
          <div>
            <label className="label">Data de vencimento *</label>
            <input type="datetime-local" className="input" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} required />
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea className="input resize-none" rows={2} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Detalhes do prazo..." />
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea className="input resize-none" rows={2} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Notas adicionais..." />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar prazo
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-blue-500',
  concluido: 'bg-green-500',
  vencido: 'bg-red-500',
  cancelado: 'bg-slate-400',
}

function PrazoCard({ prazo, onUpdate }: { prazo: Prazo; onUpdate: () => void }) {
  const queryClient = useQueryClient()
  const days = daysUntil(prazo.data_vencimento)

  const updateMutation = useMutation(
    (status: string) => api.put(`/prazos/${prazo.id}`, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('prazos')
        toast.success('Prazo atualizado!')
      }
    }
  )

  const deleteMutation = useMutation(
    () => api.delete(`/prazos/${prazo.id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('prazos')
        toast.success('Prazo excluído')
      }
    }
  )

  const urgencyColor = prazo.status === 'pendente' ? getUrgencyColor(days) : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'card p-4 border-l-4',
        prazo.status === 'pendente' && (days !== null && days <= 3) ? 'border-l-red-500' :
        prazo.status === 'pendente' && (days !== null && days <= 7) ? 'border-l-amber-500' :
        prazo.status === 'concluido' ? 'border-l-green-500' :
        prazo.status === 'vencido' ? 'border-l-red-400' :
        'border-l-slate-300 dark:border-l-slate-600'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`badge ${getStatusColor(prazo.status)}`}>{getStatusLabel(prazo.status)}</span>
            {prazo.status === 'pendente' && days !== null && (
              <span className={`badge ${getUrgencyBadge(days)}`}>
                {days < 0 ? 'Vencido' : days === 0 ? 'Hoje' : `${days} dia${days !== 1 ? 's' : ''}`}
              </span>
            )}
          </div>
          <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">{prazo.titulo}</h3>
          {prazo.descricao && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{prazo.descricao}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(prazo.data_vencimento)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {prazo.status === 'pendente' && (
            <button
              onClick={() => updateMutation.mutate('concluido')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
              title="Marcar como concluído"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => {
              // abrir edição
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
            title="Editar prazo"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            onClick={() => deleteMutation.mutate()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {prazo.observacoes && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">{prazo.observacoes}</p>
      )}
    </motion.div>
  )
}

export default function PrazosPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [showModal, setShowModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const { data: prazos = [], isLoading } = useQuery<Prazo[]>(
    ['prazos', filterStatus],
    () => api.get('/prazos', { params: { status: filterStatus || undefined } }).then(r => r.data)
  )

  const grouped = {
    urgentes: prazos.filter(p => {
      if (p.status !== 'pendente') return false
      const d = daysUntil(p.data_vencimento)
      return d !== null && d <= 7
    }),
    proximos: prazos.filter(p => {
      if (p.status !== 'pendente') return false
      const d = daysUntil(p.data_vencimento)
      return d !== null && d > 7
    }),
    vencidos: prazos.filter(p => p.status === 'vencido'),
    concluidos: prazos.filter(p => p.status === 'concluido'),
  }

  const sections = [
    { key: 'urgentes', label: '🚨 Urgentes (≤7 dias)', items: grouped.urgentes, color: 'text-red-600' },
    { key: 'proximos', label: '📅 Próximos', items: grouped.proximos, color: 'text-blue-600' },
    { key: 'vencidos', label: '⏰ Vencidos', items: grouped.vencidos, color: 'text-red-400' },
    { key: 'concluidos', label: '✅ Concluídos', items: grouped.concluidos, color: 'text-green-600' },
  ]

  return (
    <div className="space-y-5 max-w-screen-lg mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Prazos</h1>
          <p className="page-subtitle">{prazos.filter(p => p.status === 'pendente').length} prazo{prazos.filter(p => p.status === 'pendente').length !== 1 ? 's' : ''} pendente{prazos.filter(p => p.status === 'pendente').length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo prazo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Urgentes', count: grouped.urgentes.length, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Próximos', count: grouped.proximos.length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Vencidos', count: grouped.vencidos.length, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          { label: 'Concluídos', count: grouped.concluidos.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
            </div>
            <Calendar className={`w-8 h-8 opacity-20 ${color}`} />
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '', label: 'Todos' },
            { value: 'pendente', label: 'Pendentes' },
            { value: 'vencido', label: 'Vencidos' },
            { value: 'concluido', label: 'Concluídos' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                filterStatus === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 border-l-4 border-l-slate-200">
              <div className="skeleton h-4 w-2/3 mb-2 rounded" />
              <div className="skeleton h-3 w-1/3 rounded" />
            </div>
          ))}
        </div>
      ) : prazos.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-600 dark:text-slate-400 font-medium mb-2">Nenhum prazo encontrado</h3>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-3 mx-auto">
            <Plus className="w-4 h-4" />
            Novo prazo
          </button>
        </div>
      ) : (
        sections.map(({ key, label, items, color }) => items.length > 0 && (
          <div key={key}>
            <h2 className={`font-semibold mb-3 ${color}`}>{label} ({items.length})</h2>
            <div className="space-y-2">
              {items.map(p => (
                <PrazoCard
                  key={p.id}
                  prazo={p}
                  onUpdate={() => queryClient.invalidateQueries('prazos')}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <AnimatePresence>
        {showModal && (
          <AddPrazoModal
            onClose={() => setShowModal(false)}
            onSuccess={() => queryClient.invalidateQueries('prazos')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
