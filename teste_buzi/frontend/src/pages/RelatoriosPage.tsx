import { useState } from 'react'
import { useQuery } from 'react-query'
import { motion } from 'framer-motion'
import {
  BarChart3, FileText, Scale, Calendar,
  Printer, CheckCircle, Bot
} from 'lucide-react'
import api from '../lib/api'
import { formatDate, formatCurrency, getStatusLabel } from '../lib/utils'
import type { Processo, Prazo } from '../types'
import toast from 'react-hot-toast'

const REPORT_TYPES = [
  {
    id: 'processos',
    icon: Scale,
    title: 'Relatório de Processos',
    desc: 'Resumo completo de todos os processos cadastrados',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    id: 'prazos',
    icon: Calendar,
    title: 'Relatório de Prazos',
    desc: 'Prazos pendentes, vencidos e concluídos',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    id: 'movimentacoes',
    icon: FileText,
    title: 'Histórico de Movimentações',
    desc: 'Todas as movimentações registradas',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    id: 'documentos',
    icon: FileText,
    title: 'Relatório de Documentos',
    desc: 'Documentos enviados e análises da IA',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
]

function PrintableReport({ tipo, processos, prazos }: { tipo: string; processos: Processo[]; prazos: Prazo[] }) {
  if (tipo === 'processos') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Relatório de Processos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerado em {formatDate(new Date().toISOString())}</p>
          </div>
          <span className="badge-blue">{processos.length} processos</span>
        </div>
        {processos.map(p => (
          <div key={p.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{p.cliente}</p>
                <p className="text-xs text-slate-500 font-mono">{p.numero}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {getStatusLabel(p.status)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>Tipo: {p.tipo}</span>
              <span>Tribunal: {p.tribunal}</span>
              <span>Abertura: {formatDate(p.data_abertura)}</span>
              {p.valor_causa && <span>Valor: {formatCurrency(p.valor_causa)}</span>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (tipo === 'prazos') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100">Relatório de Prazos</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerado em {formatDate(new Date().toISOString())}</p>
          </div>
          <span className="badge-blue">{prazos.length} prazos</span>
        </div>
        {prazos.map(p => (
          <div key={p.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{p.titulo}</p>
                {p.descricao && <p className="text-xs text-slate-500 mt-0.5">{p.descricao}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatDate(p.data_vencimento)}</p>
                <span className="text-xs text-slate-500">{getStatusLabel(p.status)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>Selecione um tipo de relatório para visualizar</p>
    </div>
  )
}

export default function RelatoriosPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const { data: processos = [] } = useQuery<Processo[]>('processos-rel', () => api.get('/processos').then(r => r.data))
  const { data: prazos = [] } = useQuery<Prazo[]>('prazos-rel', () => api.get('/prazos').then(r => r.data))

  const handlePrint = () => {
    window.print()
    toast.success('Abrindo diálogo de impressão/PDF...')
  }

  return (
    <div className="space-y-5 max-w-screen-lg mx-auto">
      <div>
        <h1 className="page-title">Relatórios</h1>
        <p className="page-subtitle">Gere relatórios detalhados dos seus processos</p>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REPORT_TYPES.map(({ id, icon: Icon, title, desc, color, bg }) => (
          <motion.button
            key={id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveReport(id)}
            className={`card p-5 text-left transition-all ${
              activeReport === id
                ? 'ring-2 ring-blue-500 shadow-elevated'
                : 'hover:shadow-card-hover'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">{title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
            {activeReport === id && (
              <div className="mt-2 flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Selecionado</span>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Report preview */}
      {activeReport && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                {REPORT_TYPES.find(r => r.id === activeReport)?.title}
              </h2>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="btn-secondary text-sm gap-2">
                <Printer className="w-4 h-4" />
                Imprimir / PDF
              </button>
            </div>
          </div>
          <div className="p-5">
            <PrintableReport tipo={activeReport} processos={processos} prazos={prazos} />
          </div>
        </motion.div>
      )}

      {/* AI disclaimer */}
      <div className="card p-4 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10 flex items-start gap-3">
        <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">Relatórios com análise da IA</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Para relatórios com análise detalhada pela IA, acesse cada processo individualmente e clique em "Analisar com IA", depois gere o relatório.
            As análises da IA têm finalidade de apoio e não substituem avaliação profissional.
          </p>
        </div>
      </div>
    </div>
  )
}
