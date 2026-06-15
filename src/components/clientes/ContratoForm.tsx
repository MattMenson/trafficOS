'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Select, Button } from '@/components/ui'

const schema = z.object({
  descricao:    z.string().min(3, 'Descrição obrigatória'),
  valor_mensal: z.coerce.number().positive('Valor deve ser positivo'),
  data_inicio:  z.string().min(1, 'Data de início obrigatória'),
  data_fim:     z.string().optional(),
  tipo_contrato: z.enum(['mensal', 'trimestral', 'anual', 'avulso']),
  renovacao_auto: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onSave: (dados: FormData) => Promise<void>
}

export default function ContratoForm({ open, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo_contrato: 'mensal',
      renovacao_auto: false,
      data_inicio: new Date().toISOString().split('T')[0],
    },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await onSave(data)
      reset()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo contrato" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Descrição do serviço *"
          placeholder="Ex: Gestão Meta Ads + criativos"
          error={errors.descricao?.message}
          {...register('descricao')}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Valor mensal (R$) *"
            type="number"
            step="0.01"
            placeholder="3500.00"
            error={errors.valor_mensal?.message}
            {...register('valor_mensal')}
          />
          <Select label="Tipo de contrato" {...register('tipo_contrato')}>
            <option value="mensal">Mensal</option>
            <option value="trimestral">Trimestral</option>
            <option value="anual">Anual</option>
            <option value="avulso">Avulso</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Data de início *"
            type="date"
            error={errors.data_inicio?.message}
            {...register('data_inicio')}
          />
          <Input
            label="Data de fim (opcional)"
            type="date"
            {...register('data_fim')}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="rounded" {...register('renovacao_auto')} />
          Renovação automática
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={loading}>Salvar contrato</Button>
        </div>
      </form>
    </Modal>
  )
}
