import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  FileText, Upload, Loader2, Sparkles, Trash2, CheckCircle,
  AlertCircle, Clock, File, X, ChevronDown, ChevronUp, Eye
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../lib/api'
import { formatDate, formatFileSize, getStatusColor, getStatusLabel, parseJsonArray } from '../lib/utils'
import type { Documento } from '../types'
import toast from 'react-hot-toast'

type UploadStage = 'idle' | 'uploading' | 'extracting' | 'analyzing' | 'done' | 'error'

const STAGE_LABELS: Record<UploadStage, string> = {
  idle: '',
  uploading: 'Recebendo documento...',
  extracting: 'Extraindo informações...',
  analyzing: 'Analisando com IA...',
  done: 'Concluído!',
  error: 'Erro no processamento',
}

function UploadProgress({ stage }: { stage: UploadStage }) {
  const stages: UploadStage[] = ['uploading', 'extracting', 'analyzing', 'done']
  const currentIdx = stages.indexOf(stage)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400">{STAGE_LABELS[stage]}</span>
        {stage === 'done' && <CheckCircle className="w-5 h-5 text-green-500" />}
        {stage === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
      </div>
      <div className="flex gap-2">
        {stages.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i < currentIdx ? 'bg-green-500'
              : i === currentIdx ? 'bg-blue-500 animate-pulse'
              : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        {['Recebido', 'Extraído', 'Analisado', 'Concluído'].map((label, i) => (
          <span key={label} className={i <= currentIdx ? 'text-blue-500' : ''}>{label}</span>
        ))}
      </div>
    </div>
  )
}

function DocumentCard({ doc }: { doc: Documento }) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)

  const deleteMutation = useMutation(
    () => api.delete(`/documentos/${doc.id}`),
    {
      onSuccess: () => {
        toast.success('Documento excluído')
        queryClient.invalidateQueries('documentos')
      }
    }
  )

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await api.post(`/documentos/${doc.id}/analyze`)
      setAnalysis(res.data)
      queryClient.invalidateQueries('documentos')
      toast.success('Análise concluída!')
      setExpanded(true)
    } catch {
      toast.error('Erro ao analisar documento')
    } finally {
      setAnalyzing(false)
    }
  }

  const fileIcons: Record<string, string> = {
    pdf: '📄', docx: '📝', doc: '📝', txt: '📃', rtf: '📃', odt: '📝'
  }

  const datas = parseJsonArray(doc.ai_datas)
  const partes = parseJsonArray(doc.ai_partes)
  const obrigacoes = parseJsonArray(doc.ai_obrigacoes)
  const pontos = parseJsonArray(doc.ai_pontos_importantes)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xl flex-shrink-0">
          {fileIcons[doc.tipo] || '📄'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{doc.nome_original}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatFileSize(doc.tamanho)} · {doc.tipo.toUpperCase()} · {formatDate(doc.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={getStatusColor(doc.status)}>{getStatusLabel(doc.status)}</span>
          {doc.status === 'analisado' ? (
            <button onClick={() => setExpanded(!expanded)} className="btn-ghost p-1.5 text-xs gap-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-primary text-xs px-3 py-1.5 gap-1"
            >
              {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {analyzing ? 'Analisando...' : 'Analisar'}
            </button>
          )}
          <button
            onClick={() => deleteMutation.mutate()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded analysis */}
      <AnimatePresence>
        {expanded && (doc.ai_resumo || analysis) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4 bg-blue-50/30 dark:bg-blue-900/10">
              {doc.ai_resumo && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Resumo</h4>
                  <div className="prose-legal text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.ai_resumo}</ReactMarkdown>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {datas.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Datas encontradas</h4>
                    <ul className="space-y-1">
                      {datas.map((d, i) => <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />{d}
                      </li>)}
                    </ul>
                  </div>
                )}
                {partes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Partes envolvidas</h4>
                    <ul className="space-y-1">
                      {partes.map((p, i) => <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />{p}
                      </li>)}
                    </ul>
                  </div>
                )}
                {obrigacoes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Obrigações</h4>
                    <ul className="space-y-1">
                      {obrigacoes.map((o, i) => <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />{o}
                      </li>)}
                    </ul>
                  </div>
                )}
                {pontos.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Pontos importantes</h4>
                    <ul className="space-y-1">
                      {pontos.map((p, i) => <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />{p}
                      </li>)}
                    </ul>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400 italic">
                ⚠️ Esta análise tem finalidade de apoio e organização e não substitui avaliação profissional.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function DocumentosPage() {
  const queryClient = useQueryClient()
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle')
  const [processoId, setProcessoId] = useState('')

  const { data: documentos = [], isLoading } = useQuery<Documento[]>(
    'documentos',
    () => api.get('/documentos').then(r => r.data)
  )

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]

    setUploadStage('uploading')
    const formData = new FormData()
    formData.append('file', file)
    if (processoId) formData.append('processo_id', processoId)

    try {
      setUploadStage('extracting')
      await api.post('/documentos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploadStage('done')
      queryClient.invalidateQueries('documentos')
      toast.success(`'${file.name}' enviado com sucesso!`)
      setTimeout(() => setUploadStage('idle'), 3000)
    } catch (err: any) {
      setUploadStage('error')
      toast.error(err.response?.data?.detail || 'Erro ao enviar arquivo')
      setTimeout(() => setUploadStage('idle'), 3000)
    }
  }, [processoId, queryClient])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    disabled: uploadStage !== 'idle',
  })

  return (
    <div className="space-y-5 max-w-screen-xl mx-auto">
      <div>
        <h1 className="page-title">Documentos</h1>
        <p className="page-subtitle">{documentos.length} documento{documentos.length !== 1 ? 's' : ''} armazenado{documentos.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Upload area */}
      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-blue-600" />
          Enviar documento
        </h2>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : uploadStage !== 'idle'
                ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed'
                : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
          }`}
        >
          <input {...getInputProps()} />

          {uploadStage !== 'idle' ? (
            <div className="max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                {uploadStage === 'done' ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : uploadStage === 'error' ? (
                  <AlertCircle className="w-6 h-6 text-red-500" />
                ) : (
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                )}
              </div>
              <UploadProgress stage={uploadStage} />
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isDragActive ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                PDF, DOCX, DOC, TXT · Máximo 10MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Documents list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 flex items-center gap-3">
              <div className="skeleton w-10 h-10 rounded-lg" />
              <div className="flex-1">
                <div className="skeleton h-4 w-1/2 mb-2 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : documentos.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-600 dark:text-slate-400 font-medium mb-2">Nenhum documento enviado</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500">Envie documentos para análise pela IA</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Documentos recentes</h2>
          {documentos.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
        </div>
      )}
    </div>
  )
}
