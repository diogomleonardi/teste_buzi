import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, AlertCircle, Scale } from 'lucide-react'
import api from '../lib/api'
import { formatRelative, cn } from '../lib/utils'
import type { Notification } from '../types'
import toast from 'react-hot-toast'

const TIPO_CONFIG = {
  info: { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  success: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  error: { icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
}

export default function NotificacoesPage() {
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery<Notification[]>(
    'notifications',
    () => api.get('/notifications').then(r => r.data)
  )

  const markRead = useMutation(
    (id: number) => api.put(`/notifications/${id}/read`),
    { onSuccess: () => { queryClient.invalidateQueries('notifications'); queryClient.invalidateQueries('unread-count') } }
  )

  const markAllRead = useMutation(
    () => api.put('/notifications/read-all'),
    {
      onSuccess: () => {
        toast.success('Todas notificações marcadas como lidas')
        queryClient.invalidateQueries('notifications')
        queryClient.invalidateQueries('unread-count')
      }
    }
  )

  const unread = notifications.filter(n => !n.lida)

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notificações</h1>
          <p className="page-subtitle">{unread.length} não lida{unread.length !== 1 ? 's' : ''}</p>
        </div>
        {unread.length > 0 && (
          <button onClick={() => markAllRead.mutate()} className="btn-ghost text-sm">
            <CheckCheck className="w-4 h-4" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 flex gap-3">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="flex-1">
                <div className="skeleton h-4 w-2/3 mb-2 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-600 dark:text-slate-400 font-medium mb-2">Nenhuma notificação</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500">Você está em dia!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const config = TIPO_CONFIG[n.tipo] || TIPO_CONFIG.info
            const Icon = config.icon
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  'card p-4 flex items-start gap-3 cursor-pointer hover:shadow-card-hover transition-all',
                  !n.lida && 'ring-1 ring-blue-200 dark:ring-blue-800'
                )}
                onClick={() => !n.lida && markRead.mutate(n.id)}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
                  <Icon className={cn('w-5 h-5', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-medium', !n.lida ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400')}>
                      {n.titulo}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.lida && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                      <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{formatRelative(n.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.mensagem}</p>
                  {n.processo_id && (
                    <Link
                      to={`/processos/${n.processo_id}`}
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1.5"
                    >
                      <Scale className="w-3 h-3" />
                      Ver processo
                    </Link>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
