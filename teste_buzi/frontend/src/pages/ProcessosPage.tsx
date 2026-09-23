import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scale, Plus, Search, Filter, ChevronDown,
  Trash2, X, Loader2, Pencil
} from 'lucide-react'
import api from '../lib/api'
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, cn } from '../lib/utils'
import type { Processo } from '../types'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'arquivado', label: 'Arquivado' },
]

const [processoEditando, setProcessoEditando] = useState<Processo | null>(null)

const TIPO_OPTIONS = [
  'Ação de Indenização', 'Ação Trabalhista', 'Ação de Divórcio', 'Ação de Cobrança',
  'Inventário', 'Ação Penal', 'Mandado de Segurança', 'Ação Civil Pública',
  'Execução Fiscal', 'Outros'
]

function ProcessoModal({
  onClose,
  onSuccess,
  processo,
}: {
  onClose: () => void
  onSuccess: () => void
  processo?: Processo
}) {
  const [form, setForm] = useState({
    numero: processo?.numero || '',
    cliente: processo?.cliente || '',
    tipo: processo?.tipo || '',
    tribunal: processo?.tribunal || '',
    vara: processo?.vara || '',
    descricao: processo?.descricao || '',
    valor_causa: processo?.valor_causa != null ? String(processo.valor_causa) : '',
    data_abertura: processo?.data_abertura ? processo.data_abertura.substring(0, 10) : '',
    parte_contraria: processo?.parte_contraria || '',
    status: processo?.status || 'ativo'
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        valor_causa: form.valor_causa ? parseFloat(form.valor_causa) : null,
        data_abertura: new Date(form.data_abertura).toISOString(),
      }

      if (processo) {
        await api.put(`/processos/${processo.id}`, payload)
        toast.success('Processo atualizado com sucesso!')
      } else {
        await api.post('/processos', payload)
        toast.success('Processo cadastrado com sucesso!')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || (processo ? 'Erro ao atualizar processo' : 'Erro ao cadastrar processo'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{processo ? 'Editar Processo' : 'Novo Processo'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{processo ? 'Atualize as informações do processo' : 'Preencha as informações do processo'}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Número do processo *</label>
              <input className="input" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })}
                placeholder="1234567-89.2024.8.26.0001" required />
            </div>
            <div>
              <label className="label">Cliente *</label>
              <input className="input" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })}
                placeholder="Nome do cliente" required />
            </div>
            <div>
              <label className="label">Parte contrária</label>
              <input className="input" value={form.parte_contraria} onChange={e => setForm({ ...form, parte_contraria: e.target.value })}
                placeholder="Nome da parte contrária" />
            </div>
            <div>
              <label className="label">Tipo de processo *</label>
              <select className="input" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} required>
                <option value="">Selecione o tipo</option>
                {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={e =>
                  setForm({
                    ...form,
                    status: e.target.value as Processo['status']
                  })
                }
              >
                {STATUS_OPTIONS
                  .filter(s => s.value)
                  .map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label">Tribunal/Órgão *</label>
              <input className="input" value={form.tribunal} onChange={e => setForm({ ...form, tribunal: e.target.value })}
                placeholder="TJSP — 1ª Vara Cível" required />
            </div>
            <div>
              <label className="label">Vara</label>
              <input className="input" value={form.vara} onChange={e => setForm({ ...form, vara: e.target.value })}
                placeholder="1ª Vara Cível" />
            </div>
            <div>
              <label className="label">Data de abertura *</label>
              <input type="date" className="input" value={form.data_abertura} onChange={e => setForm({ ...form, data_abertura: e.target.value })} required />
            </div>
            <div>
              <label className="label">Valor da causa (R$)</label>
              <input type="number" className="input" value={form.valor_causa} onChange={e => setForm({ ...form, valor_causa: e.target.value })}
                placeholder="0,00" step="0.01" min="0" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descrição</label>
              <textarea className="input resize-none" rows={3} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição resumida do processo..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Salvando...' : processo ? 'Salvar alterações' : 'Cadastrar processo'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function ProcessosPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [processoEditando, setProcessoEditando] = useState<Processo | null>(null)

  const { data: processos = [], isLoading } = useQuery<Processo[]>(
    ['processos', search, status],
    () => api.get('/processos', { params: { search, status } }).then(r => r.data)

)


  const deleteMutation = useMutation(
  (id: number) => api.delete(`/processos/${id}`),
  {
    onSuccess: () => {
      toast.success('Processo excluído')
      queryClient.invalidateQueries('processos')
    },
    onError: () => {
      toast.error('Erro ao excluir processo')
    }
  }
)

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Tem certeza que deseja excluir este processo?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-5 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Processos</h1>
          <p className="page-subtitle">{processos.length} processo{processos.length !== 1 ? 's' : ''} encontrado{processos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setProcessoEditando(null); setShowModal(true) }} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo processo
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por número, cliente ou tipo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select className="input w-auto" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start gap-4">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="flex-1">
                  <div className="skeleton h-4 w-1/3 mb-2 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : processos.length === 0 ? (
        <div className="card p-12 text-center">
          <Scale className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-600 dark:text-slate-400 font-medium mb-2">Nenhum processo encontrado</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
            {search || status ? 'Tente outros filtros de busca.' : 'Comece cadastrando o primeiro processo.'}
          </p>
          <button onClick={() => { setProcessoEditando(null); setShowModal(true) }} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" />
            Novo processo
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {processos.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                to={`/processos/${p.id}`}
                className="card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 p-4 flex items-start gap-4 block group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {p.cliente}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{p.numero}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={getStatusColor(p.status)}>{getStatusLabel(p.status)}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setProcessoEditando(p)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                        title="Editar processo"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, p.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        title="Excluir processo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{p.tipo}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{p.tribunal}</span>
                    {p.valor_causa && (
                      <>
                        <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(p.valor_causa)}</span>
                      </>
                    )}
                    <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Aberto em {formatDate(p.data_abertura)}</span>
                  </div>

                  {p.movimentacoes && p.movimentacoes.length > 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                      Última mov.: {p.movimentacoes[0].tipo} — {formatDate(p.movimentacoes[0].data)}
                    </p>
                  )}
                </div>

                <ChevronDown className="w-4 h-4 text-slate-400 rotate-[-90deg] group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ProcessoModal
            processo={processoEditando || undefined}
            onClose={() => {
              setShowModal(false)
              setProcessoEditando(null)
            }}
            onSuccess={() => queryClient.invalidateQueries('processos')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
