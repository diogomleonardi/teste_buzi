export interface Processo {
  id: number
  numero: string
  cliente: string
  tipo: string
  tribunal: string
  vara?: string
  status: 'ativo' | 'aguardando' | 'concluido' | 'arquivado' | 'suspenso'
  descricao?: string
  valor_causa?: number
  data_abertura: string
  data_encerramento?: string
  advogado_id: number
  parte_contraria?: string
  ai_resumo?: string
  ai_pontos_importantes?: string
  created_at: string
  updated_at?: string
  movimentacoes?: Movimentacao[]
}

export interface User {
  id: number
  nome: string
  email: string
  oab?: string
  cargo?: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export interface Movimentacao {
  id: number
  tipo: string
  descricao: string
  data: string
  documento_id?: number
  created_at: string
}

export interface Documento {
  id: number
  nome: string
  nome_original: string
  tipo: string
  tamanho: number
  processo_id?: number
  uploader_id: number
  status: 'pendente' | 'processando' | 'analisado' | 'erro'
  ai_resumo?: string
  ai_datas?: string
  ai_partes?: string
  ai_obrigacoes?: string
  ai_pontos_importantes?: string
  created_at: string
  updated_at?: string
}

export interface Prazo {
  id: number
  processo_id: number
  titulo: string
  descricao?: string
  data_vencimento: string
  status: 'pendente' | 'concluido' | 'vencido' | 'cancelado'
  documento_id?: number
  observacoes?: string
  created_at: string
}

export interface Notification {
  id: number
  titulo: string
  mensagem: string
  tipo: 'info' | 'warning' | 'success' | 'error'
  lida: boolean
  processo_id?: number
  created_at: string
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  processo_id?: number
  documento_id?: number
  session_id?: string
  created_at: string
}

export interface DashboardStats {
  total_processos: number
  processos_ativos: number
  processos_atencao: number
  prazos_proximos: number
  documentos_analisados: number
  ultimas_movimentacoes: Array<{
    id: number
    tipo: string
    descricao: string
    data: string
    processo_numero: string
    processo_cliente: string
    processo_id: number
  }>
  prazos_urgentes: Array<{
    id: number
    titulo: string
    data_vencimento: string
    processo_numero: string
    processo_cliente: string
    processo_id: number
    days_left: number
  }>
  processos_por_status: Array<{ status: string; count: number }>
  processos_por_tipo: Array<{ tipo: string; count: number }>
}
