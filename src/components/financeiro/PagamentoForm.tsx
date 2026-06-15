'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Select, Button } from '@/components/ui'
import type { Pagamento } from '@/types/database'

const schema = z.object({
  cliente_id:       z.string().min(1, 'Selecione o cliente'),
  descricao:        z.string().min(2, 'Descrição obrigatória'),
  valor:            z.coerce.number().positive('Valor deve ser positivo'),
  data_vencimento:  z.string().min(1, 'Data de vencimento obrigatória'),
  data_pagamento:   z.string().optional(),
  status:           z.enum(['pendente', 'pago', 'atrasado', 'cancelado']),
  forma_pagamento:  z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onSave: (dados: Partial<Pagamento>) => Promise<void>
  inicial?: Partial<Pagamento>
}

export default function PagamentoForm({ open, onClose, onSave, inicial }: Props) {
  const [loading, setLoading]   = useState(false)
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string }>>([])
  const isEdit = Boolean(inicial?.id)

  useEffect(() => {
    window.fetch('/api/clientes?status=ativo')
      .then(r => r.json())
      .then(data => setClientes(data || []))
  }, [])

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      cliente_id:      inicial?.cliente_id      || '',
      descricao:       inicial?.descricao       || 'Gestão Meta Ads',
      valor:           inicial?.valor           || undefined,
      data_vencimento: inicial?.data_vencimento || '',
      data_pagamento:  inicial?.data_pagamento  || '',
      status:          inicial?.status          || 'pendente',
      forma_pagamento: inicial?.forma_pagamento || '',
    },
  })

  const statusWatch = watch('status')

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        data_pagamento: data.data_pagamento || null,
      }
      await onSave(payload)
      reset()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar pagamento' : 'Registrar pagamento'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select label="Cliente *" error={errors.cliente_id?.message} {...register('cliente_id')}>
          <option value="">Selecionar cliente...</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>

        <Input
          label="Descrição *"
          placeholder="Ex: Gestão Meta Ads — junho/25"
          error={errors.descricao?.message}
          {...register('descricao')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Valor (R$) *"
            type="number"
            step="0.01"
            placeholder="3500.00"
            error={errors.valor?.message}
            {...register('valor')}
          />
          <Select label="Status" {...register('status')}>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="atrasado">Atrasado</option>
            <option value="cancelado">Cancelado</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Vencimento *"
            type="date"
            error={errors.data_vencimento?.message}
            {...register('data_vencimento')}
          />
          {statusWatch === 'pago' && (
            <Input
              label="Data de pagamento"
              type="date"
              {...register('data_pagamento')}
            />
          )}
        </div>

        <Select label="Forma de pagamento" {...register('forma_pagamento')}>
          <option value="">Selecionar...</option>
          <option value="pix">PIX</option>
          <option value="transferencia">Transferência</option>
          <option value="boleto">Boleto</option>
          <option value="cartao">Cartão</option>
          <option value="dinheiro">Dinheiro</option>
        </Select>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEdit ? 'Salvar alterações' : 'Registrar pagamento'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
