'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Select, Button } from '@/components/ui'
import type { Gasto } from '@/types/database'

const schema = z.object({
  descricao:   z.string().min(2, 'Descrição obrigatória'),
  categoria:   z.enum(['ferramentas', 'freelancer', 'imposto', 'infraestrutura', 'marketing', 'outros']),
  valor:       z.coerce.number().positive('Valor deve ser positivo'),
  data_gasto:  z.string().min(1, 'Data obrigatória'),
  cliente_id:  z.string().optional(),
  recorrente:  z.boolean(),
})

type FormData = z.infer<typeof schema>

const CATEGORIAS = [
  { value: 'ferramentas',    label: '🛠️ Ferramentas SaaS' },
  { value: 'freelancer',     label: '👤 Freelancer / Equipe' },
  { value: 'imposto',        label: '📋 Impostos e taxas' },
  { value: 'infraestrutura', label: '☁️ Infraestrutura' },
  { value: 'marketing',      label: '📣 Marketing próprio' },
  { value: 'outros',         label: '📦 Outros' },
]

interface Props {
  open: boolean
  onClose: () => void
  onSave: (dados: Partial<Gasto>) => Promise<void>
  inicial?: Partial<Gasto>
}

export default function GastoForm({ open, onClose, onSave, inicial }: Props) {
  const [loading, setLoading]   = useState(false)
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string }>>([])
  const isEdit = Boolean(inicial?.id)

  useEffect(() => {
    window.fetch('/api/clientes')
      .then(r => r.json())
      .then(data => setClientes(data || []))
  }, [])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      descricao:  inicial?.descricao  || '',
      categoria:  inicial?.categoria  || 'ferramentas',
      valor:      inicial?.valor      || undefined,
      data_gasto: inicial?.data_gasto || new Date().toISOString().split('T')[0],
      cliente_id: inicial?.cliente_id || '',
      recorrente: inicial?.recorrente || false,
    },
  })

  // Re-popula o form com os dados do registro correto cada vez que o modal abre
  useEffect(() => {
    if (open) {
      reset({
        descricao:  inicial?.descricao  || '',
        categoria:  inicial?.categoria  || 'ferramentas',
        valor:      inicial?.valor      || undefined,
        data_gasto: inicial?.data_gasto || new Date().toISOString().split('T')[0],
        cliente_id: inicial?.cliente_id || '',
        recorrente: inicial?.recorrente || false,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inicial])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        cliente_id: data.cliente_id || null,
      }
      await onSave(payload)
      reset()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar gasto' : 'Registrar gasto'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Descrição *"
          placeholder="Ex: ActiveCampaign — plano Pro"
          error={errors.descricao?.message}
          {...register('descricao')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select label="Categoria *" error={errors.categoria?.message} {...register('categoria')}>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Input
            label="Valor (R$) *"
            type="number"
            step="0.01"
            placeholder="290.00"
            error={errors.valor?.message}
            {...register('valor')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data *"
            type="date"
            error={errors.data_gasto?.message}
            {...register('data_gasto')}
          />
          <Select label="Vincular ao cliente (opcional)" {...register('cliente_id')}>
            <option value="">Gasto geral</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="rounded" {...register('recorrente')} />
          Gasto recorrente (mensal)
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEdit ? 'Salvar alterações' : 'Registrar gasto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
