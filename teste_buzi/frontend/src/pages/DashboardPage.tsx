import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Scale, FileText, Calendar, AlertTriangle, TrendingUp,
  Clock, ChevronRight, Activity, Folder, Bot
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart,
  Bar, XAxis, YAxis, Tooltip, Legend
} from 'recharts'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { formatDate, formatRelative, daysUntil, getUrgencyBadge, getUrgencyColor, getStatusColor, getStatusLabel } from '../lib/utils'
import type { DashboardStats } from '../types'

const STATUS_COLORS: Record<string, string> = {
  ativo: '#22c55e',
  aguardando: '#f59e0b',
  concluido: '#94a3b8',
  arquivado: '#6b7280',
  suspenso: '#ef4444',
}

const CHART_COLORS = ['#3b82f6', '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

function SkeletonCard() {
  return (
    <div className="card p-5">
      <div className="skeleton h-4 w-1/2 mb-3 rounded" />
      <div className="skeleton h-8 w-1/3 mb-2 rounded" />
      <div className="skeleton h-3 w-2/3 rounded" />
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: stats, isLoading } = useQuery<DashboardStats>(
    'dashboard-stats',
    () => api.get('/dashboard/stats').then(r => r.data),
    { refetchInterval: 60000 }
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const statCards = [
    {
      label: 'Processos ativos',
      value: stats?.processos_ativos ?? 0,
      icon: Scale,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      link: '/processos?status=ativo',
    },
    {
      label: 'Prazos próximos',
      value: stats?.prazos_proximos ?? 0,
      icon: Calendar,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      link: '/prazos',
    },
    {
      label: 'Documentos analisados',
      value: stats?.documentos_analisados ?? 0,
      icon: FileText,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      link: '/documentos',
    },
    {
      label: 'Exigem atenção',
      value: stats?.processos_atencao ?? 0,
      icon: AlertTriangle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      link: '/processos?status=aguardando',
    },
  ]

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {greeting}, {user?.nome?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link to="/assistente" className="btn-primary hidden sm:flex">
          <Bot className="w-4 h-4" />
          Assistente IA
        </Link>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={card.link} className="card-hover p-5 flex items-start justify-between group block">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{card.label}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{card.value}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Ver detalhes
                    </p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </Link>
              </motion.div>
            )
          })
        }
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status pie */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-5"
        >
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Processos por Status
          </h3>
          {isLoading ? (
            <div className="h-48 skeleton rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.processos_por_status || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ status, count }) => `${getStatusLabel(status)}: ${count}`}
                  labelLine={false}
                >
                  {stats?.processos_por_status?.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [val, getStatusLabel(name as string)]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Tipo bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-5"
        >
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-600" />
            Processos por Tipo
          </h3>
          {isLoading ? (
            <div className="h-48 skeleton rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.processos_por_tipo || []} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="tipo" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" name="Processos" radius={[0, 4, 4, 0]}>
                  {stats?.processos_por_tipo?.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Prazos Urgentes
            </h3>
            <Link to="/prazos" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="skeleton h-4 w-3/4 mb-2 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              ))
              : stats?.prazos_urgentes?.length === 0
                ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhum prazo urgente</p>
                  </div>
                )
                : stats?.prazos_urgentes?.map((p) => {
                  const days = daysUntil(p.data_vencimento)
                  return (
                    <Link
                      key={p.id}
                      to={`/processos/${p.processo_id}`}
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{p.titulo}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.processo_cliente} · {p.processo_numero}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`badge ${getUrgencyBadge(days)}`}>
                          {days !== null && days >= 0 ? `${days}d` : 'Vencido'}
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(p.data_vencimento)}</p>
                      </div>
                    </Link>
                  )
                })
            }
          </div>
        </motion.div>

        {/* Recent movimentações */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Últimas Movimentações
            </h3>
            <Link to="/processos" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="skeleton h-4 w-3/4 mb-2 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              ))
              : stats?.ultimas_movimentacoes?.length === 0
                ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma movimentação recente</p>
                  </div>
                )
                : stats?.ultimas_movimentacoes?.map((m) => (
                  <Link
                    key={m.id}
                    to={`/processos/${m.processo_id}`}
                    className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{m.tipo}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.descricao}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{m.processo_cliente} · {formatRelative(m.data)}</p>
                    </div>
                  </Link>
                ))
            }
          </div>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-5"
      >
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Ações rápidas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/processos', icon: Scale, label: 'Novo processo', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
            { to: '/documentos', icon: FileText, label: 'Enviar documento', color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
            { to: '/prazos', icon: Calendar, label: 'Adicionar prazo', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' },
            { to: '/assistente', icon: Bot, label: 'Consultar IA', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400' },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">{label}</span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
