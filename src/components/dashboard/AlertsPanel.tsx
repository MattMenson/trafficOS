'use client'

import Link from 'next/link'

interface Alerta {
  tipo: 'contrato' | 'pagamento' | 'entrega' | 'tarefa'
  urgencia: 'alta' | 'media'
  titulo: string
  subtitulo: string
  link: string
}

interface Props {
  contratosVencendo: Array<{ cliente_nome: string; dias_restantes: number; valor_mensal: number }>
  pagamentosAtrasados: Array<{ cliente_nome: string; valor: number; dias_atraso: number }>
  entregasAtrasadas: Array<{ id: string; titulo: string; clientes: { nome: string } }>
  tarefasUrgentes: Array<{ id: string; titulo: string; prioridade: string; clientes?: { nome: string } }>
}

const ICONE: Record<string, string> = {
  contrato:  '📄',
  pagamento: '💰',
  entrega:   '📦',
  tarefa:    '✅',
}

const COR: Record<string, string> = {
  alta:  'border-l-red-400 bg-red-50',
  media: 'border-l-amber-400 bg-amber-50',
}

const COR_TEXTO: Record<string, string> = {
  alta:  'text-red-700',
  media: 'text-amber-700',
}

export default function AlertsPanel({ contratosVencendo, pagamentosAtrasados, entregasAtrasadas, tarefasUrgentes }: Props) {
  const alertas: Alerta[] = [
    ...pagamentosAtrasados.map(p => ({
      tipo:      'pagamento' as const,
      urgencia:  (p.dias_atraso > 5 ? 'alta' : 'media') as 'alta' | 'media',
      titulo:    `${p.cliente_nome} — pagamento atrasado`,
      subtitulo: `R$ ${p.valor.toLocaleString('pt-BR')} · ${p.dias_atraso} dia(s) em atraso`,
      link:      '/financeiro',
    })),
    ...contratosVencendo.map(c => ({
      tipo:      'contrato' as const,
      urgencia:  (c.dias_restantes <= 7 ? 'alta' : 'media') as 'alta' | 'media',
      titulo:    `${c.cliente_nome} — contrato vencendo`,
      subtitulo: `R$ ${c.valor_mensal.toLocaleString('pt-BR')}/mês · vence em ${c.dias_restantes} dia(s)`,
      link:      '/clientes',
    })),
    ...entregasAtrasadas.map(e => ({
      tipo:      'entrega' as const,
      urgencia:  'alta' as const,
      titulo:    `${e.clientes?.nome} — entrega atrasada`,
      subtitulo: e.titulo,
      link:      '/ideias',
    })),
    ...tarefasUrgentes.map(t => ({
      tipo:      'tarefa' as const,
      urgencia:  (t.prioridade === 'urgente' ? 'alta' : 'media') as 'alta' | 'media',
      titulo:    t.titulo,
      subtitulo: t.clientes?.nome ? `Cliente: ${t.clientes.nome}` : 'Tarefa geral',
      link:      '/tarefas',
    })),
  ].sort((a, b) => (a.urgencia === 'alta' ? -1 : 1) - (b.urgencia === 'alta' ? -1 : 1))

  if (alertas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <span className="text-3xl mb-2">✅</span>
        <p className="text-sm font-medium text-gray-700">Tudo em dia</p>
        <p className="text-xs text-gray-400 mt-1">Nenhum alerta no momento</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alertas.map((a, i) => (
        <Link href={a.link} key={i}>
          <div className={`flex items-start gap-3 p-3 rounded-lg border-l-2 cursor-pointer hover:brightness-95 transition-all ${COR[a.urgencia]}`}>
            <span className="text-base mt-0.5 flex-shrink-0">{ICONE[a.tipo]}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium leading-tight ${COR_TEXTO[a.urgencia]}`}>
                {a.titulo}
              </p>
              <p className={`text-xs mt-0.5 opacity-80 ${COR_TEXTO[a.urgencia]}`}>
                {a.subtitulo}
              </p>
            </div>
            <span className={`text-xs flex-shrink-0 mt-0.5 ${COR_TEXTO[a.urgencia]}`}>→</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
