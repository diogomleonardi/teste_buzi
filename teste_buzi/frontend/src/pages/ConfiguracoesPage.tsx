import { useState } from 'react'
import { useMutation } from 'react-query'
import { motion } from 'framer-motion'
import {
  User, Shield, Moon, Sun, Key, Save,
  Loader2, Bot, Info, Eye, EyeOff
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function ConfiguracoesPage() {
  const { user, isDark, toggleDark, setAuth } = useAuthStore()
  const [profile, setProfile] = useState({ nome: user?.nome || '', oab: user?.oab || '', cargo: user?.cargo || '' })
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [activeTab, setActiveTab] = useState<'perfil' | 'seguranca' | 'aparencia' | 'ia'>('perfil')

  const updateProfile = useMutation({
  mutationFn: () => api.put('/auth/me', profile),
  onSuccess: (res) => {
    const token = localStorage.getItem('jurisai_token') || ''
    setAuth(res.data, token)
    toast.success('Perfil atualizado com sucesso!')
  },
  onError: () => {
  toast.error('Erro ao atualizar perfil')
}
})

  const TABS = [
    { id: 'perfil', icon: User, label: 'Perfil' },
    { id: 'seguranca', icon: Shield, label: 'Segurança' },
    { id: 'aparencia', icon: Moon, label: 'Aparência' },
    { id: 'ia', icon: Bot, label: 'Inteligência Artificial' },
  ] as const

  const initials = user?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U'

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerencie sua conta e preferências</p>
      </div>

      {/* User card */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div>
          <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg">{user?.nome}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{user?.email}</p>
          <div className="flex items-center gap-3 mt-1">
            {user?.oab && <span className="badge-blue">{user.oab}</span>}
            <span className="text-xs text-slate-500 dark:text-slate-400">{user?.cargo}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1 overflow-x-auto">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {activeTab === 'perfil' && (
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Dados pessoais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Nome completo</label>
                <input className="input" value={profile.nome} onChange={e => setProfile({ ...profile, nome: e.target.value })} />
              </div>
              <div>
                <label className="label">OAB</label>
                <input className="input" value={profile.oab} onChange={e => setProfile({ ...profile, oab: e.target.value })}
                  placeholder="SP-123456" />
              </div>
              <div>
                <label className="label">Cargo</label>
                <select className="input" value={profile.cargo} onChange={e => setProfile({ ...profile, cargo: e.target.value })}>
                  <option value="Advogado">Advogado</option>
                  <option value="Advogado Sênior">Advogado Sênior</option>
                  <option value="Sócio">Sócio</option>
                  <option value="Estagiário">Estagiário</option>
                  <option value="Paralegal">Paralegal</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Email</label>
                <input className="input opacity-60 cursor-not-allowed" value={user?.email} disabled />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">O email não pode ser alterado</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => updateProfile.mutate()}
                disabled={updateProfile.isLoading}
                className="btn-primary"
              >
                {updateProfile.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar alterações
              </button>
            </div>
          </div>
        )}

        {activeTab === 'seguranca' && (
          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                Segurança da conta
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Senha atual</label>
                  <div className="relative">
                    <input type={showCurrentPw ? 'text' : 'password'} className="input pr-10"
                      value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                      placeholder="••••••••" />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Nova senha</label>
                  <div className="relative">
                    <input type={showNewPw ? 'text' : 'password'} className="input pr-10"
                      value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                      placeholder="Mínimo 6 caracteres" minLength={6} />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirmar nova senha</label>
                  <input type="password" className="input" value={passwords.confirm}
                    onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                    placeholder="••••••••" />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (passwords.new !== passwords.confirm) {
                      toast.error('As senhas não coincidem')
                      return
                    }
                    toast.success('Funcionalidade de troca de senha disponível em breve')
                  }}
                  className="btn-primary"
                >
                  <Key className="w-4 h-4" />
                  Alterar senha
                </button>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                Informações de segurança
              </h3>
              <div className="space-y-3">
                {[
                  '🔒 Sua senha é armazenada com criptografia bcrypt',
                  '🔑 Autenticação via tokens JWT com expiração de 8 horas',
                  '🛡️ Todas as requisições são validadas no servidor',
                  '📁 Arquivos enviados são validados antes do armazenamento',
                  '🚫 Credenciais nunca são expostas no frontend',
                ].map((item, i) => (
                  <p key={i} className="text-sm text-slate-600 dark:text-slate-400">{item}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'aparencia' && (
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {isDark ? <Moon className="w-4 h-4 text-blue-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
              Aparência
            </h3>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Modo escuro</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Alterne entre os temas claro e escuro</p>
              </div>
              <button
                onClick={toggleDark}
                className={`relative w-12 h-6 rounded-full transition-all duration-200 ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${isDark ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { if (isDark) toggleDark() }}
                className={`p-4 rounded-xl border-2 transition-all ${!isDark ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
              >
                <Sun className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Modo claro</p>
              </button>
              <button
                onClick={() => { if (!isDark) toggleDark() }}
                className={`p-4 rounded-xl border-2 transition-all ${isDark ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}
              >
                <Moon className="w-6 h-6 text-blue-600 mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Modo escuro</p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'ia' && (
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" />
                Configuração do Ollama (IA local)
              </h3>
              <div className="space-y-4">

                {/* Status */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    IA 100% local — sem custo, sem API externa
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    O JurisAI utiliza o <strong>Ollama</strong> para executar modelos de linguagem localmente na sua máquina.
                    Nenhum dado é enviado para servidores externos.
                  </p>
                </div>

                {/* Como configurar */}
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Como configurar</p>
                  <div className="space-y-2">
                    {[
                      { step: '1', label: 'Instale o Ollama', cmd: 'Acesse ollama.com e baixe para seu sistema' },
                      { step: '2', label: 'Inicie o serviço', cmd: 'ollama serve' },
                      { step: '3', label: 'Baixe um modelo', cmd: 'ollama pull llama3' },
                    ].map(({ step, label, cmd }) => (
                      <div key={step} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</p>
                          <code className="text-xs font-mono text-slate-500 dark:text-slate-400">{cmd}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modelos recomendados */}
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modelos recomendados</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'llama3', desc: 'Equilíbrio velocidade/qualidade', badge: 'Recomendado' },
                      { name: 'llama3:70b', desc: 'Maior qualidade (exige +RAM)', badge: 'Premium' },
                      { name: 'mistral', desc: 'Rápido e eficiente', badge: 'Leve' },
                      { name: 'gemma2', desc: 'Bom em português', badge: 'Google' },
                    ].map(({ name, desc, badge }) => (
                      <div key={name} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <code className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">{name}</code>
                          <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">{badge}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Variáveis de ambiente */}
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">backend/.env</p>
                  <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">{`OLLAMA_BASE_URL=http://localhost:11434\nOLLAMA_MODEL=llama3`}</pre>
                </div>

              </div>
            </div>

            <div className="card p-5 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                Aviso de responsabilidade
              </h3>
              <div className="space-y-2">
                {[
                  '⚠️ As informações apresentadas pela IA possuem finalidade de apoio e organização',
                  '🚫 A IA não substitui a análise de um advogado ou profissional jurídico habilitado',
                  '❌ A IA não inventa jurisprudência, legislação ou dados processuais',
                  '🔍 A IA analisa apenas informações fornecidas pelo usuário',
                  '📋 Quando não há informações suficientes, a IA informa claramente',
                  '✅ A IA não toma decisões jurídicas pelo usuário',
                ].map((item, i) => (
                  <p key={i} className="text-sm text-slate-600 dark:text-slate-400">{item}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
