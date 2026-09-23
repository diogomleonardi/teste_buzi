import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '—'
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return '—'
  }
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
  } catch {
    return '—'
  }
}

export function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null
  try {
    return differenceInDays(new Date(date), new Date())
  } catch {
    return null
  }
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ativo: 'badge-green',
    aguardando: 'badge-yellow',
    concluido: 'badge-gray',
    arquivado: 'badge-gray',
    suspenso: 'badge-red',
    pendente: 'badge-blue',
    vencido: 'badge-red',
    cancelado: 'badge-gray',
    analisado: 'badge-green',
    processando: 'badge-yellow',
    erro: 'badge-red',
  }
  return map[status] || 'badge-gray'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ativo: 'Ativo',
    aguardando: 'Aguardando',
    concluido: 'Concluído',
    arquivado: 'Arquivado',
    suspenso: 'Suspenso',
    pendente: 'Pendente',
    vencido: 'Vencido',
    cancelado: 'Cancelado',
    analisado: 'Analisado',
    processando: 'Processando',
    erro: 'Erro',
  }
  return map[status] || status
}

export function getUrgencyColor(days: number | null): string {
  if (days === null) return 'text-slate-500'
  if (days < 0) return 'text-red-600'
  if (days <= 3) return 'text-red-500'
  if (days <= 7) return 'text-amber-500'
  if (days <= 14) return 'text-yellow-500'
  return 'text-green-600'
}

export function getUrgencyBadge(days: number | null): string {
  if (days === null) return 'badge-gray'
  if (days < 0) return 'badge-red'
  if (days <= 3) return 'badge-red'
  if (days <= 7) return 'badge-yellow'
  if (days <= 14) return 'badge-blue'
  return 'badge-green'
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function parseJsonArray(json: string | null | undefined): string[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
