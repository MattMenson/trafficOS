'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@/components/ui'

export default function CadastroPage() {
  const router = useRouter()
  const supabase = createClient()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-medium text-gray-900">TrafficOS</h1>
          <p className="text-sm text-gray-500 mt-1">Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <Input
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            required
          />
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            required
          />
          <Input
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            Criar conta
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="text-gray-900 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
