'use client'

import Link from 'next/link'
import { Avatar } from '@/components/ui'

interface ClientePerf {
  cliente_id: string
  cliente_nome: string
  mensalidade: number
  recebido_mes: number
  investimento_meta: number
}

interface Props {
  clientes: ClientePerf[]
}

export default function ClientePerformanceTable({ clientes }: Props) {
  if (clientes.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Nenhum cliente ativo com dados no mês
      </p>
    )
  }

  const maxMensalidade = Math.max(...clientes.map(c => c.mensalidade), 1)

  return (
    <div className="divide-y divide-gray-50">
      {clientes.map(c => {
        const pct        = c.mensalidade > 0 ? Math.round((c.recebido_mes / c.mensalidade) * 100) : 0
        const statusPgt  = c.recebido_mes >= c.mensalidade
          ? { color: '#059669', label: 'Pago' }
          : c.recebido_mes > 0
          ? { color: '#d97706', label: 'Parcial' }
          : { color: '#9ca3af', label: 'Pendente' }

        return (
          <Link href={`/clientes/${c.cliente_id}`} key={c.cliente_id}>
            <div className="flex items-center gap-3 py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
              <Avatar nome={c.cliente_nome} size="sm" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-900 truncate">{c.cliente_nome}</p>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    {c.investimento_meta > 0 && (
                      <span className="text-xs text-gray-400">
                        💸 R$ {c.investimento_meta.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                    <span className="text-xs font-medium text-gray-700">
                      R$ {c.mensalidade.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Barra de receita */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((c.mensalidade / maxMensalidade) * 100, 100)}%`,
                        background: '#e5e7eb',
                      }}
                    />
                  </div>
                  {/* Progresso de recebimento */}
                  <div className="relative w-12 h-1.5 flex-shrink-0">
                    <div
                      className="absolute inset-0 h-1.5 rounded-full"
                      style={{ background: '#e5e7eb' }}
                    />
                    <div
                      className="absolute inset-0 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: statusPgt.color,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium w-14 text-right flex-shrink-0"
                    style={{ color: statusPgt.color }}
                  >
                    {statusPgt.label}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
