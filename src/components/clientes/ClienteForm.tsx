'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal, Input, Select, Textarea, Button } from '@/components/ui'
import type { Cliente } from '@/types/database'

const schema = z.object({
  nome:        z.string().min(2, 'Nome obrigatório'),
  email:       z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone:    z.string().optional(),
  segmento:    z.string().optional(),
  cnpj_cpf:   z.string().optional(),
  status:      z.enum(['ativo', 'pausado', 'encerrado', 'prospecto']),
  observacoes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onSave: (dados: Partial<Cliente>) => Promise<void>
  inicial?: Partial<Cliente>
}

const SEGMENTOS = [
  'Saúde', 'Fitness', 'E-commerce', 'Educação', 'Imobiliário',
  'Restaurante', 'Beleza', 'Tecnologia', 'Advocacia', 'Outros',
]

export default function ClienteForm({ open, onClose, onSave, inicial }: Props) {
  const [loading, setLoading] = useState(false)
  const isEdit = Boolean(inicial?.id)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome:        inicial?.nome        || '',
      email:       inicial?.email       || '',
      telefone:    inicial?.telefone    || '',
      segmento:    inicial?.segmento    || '',
      cnpj_cpf:   inicial?.cnpj_cpf   || '',
      status:      inicial?.status      || 'ativo',
      observacoes: inicial?.observacoes || '',
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
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nome + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Input
              label="Nome do cliente *"
              placeholder="Ex: Clínica Viva"
              error={errors.nome?.message}
              {...register('nome')}
            />
          </div>
          <div>
            <Select label="Status" {...register('status')}>
              <option value="prospecto">Prospecto</option>
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="encerrado">Encerrado</option>
            </Select>
          </div>
        </div>

        {/* Email + Telefone */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="E-mail"
            type="email"
            placeholder="contato@cliente.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Telefone / WhatsApp"
            placeholder="(11) 99999-9999"
            {...register('telefone')}
          />
        </div>

        {/* Segmento + CNPJ */}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Segmento" {...register('segmento')}>
            <option value="">Selecionar...</option>
            {SEGMENTOS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Input
            label="CNPJ / CPF"
            placeholder="00.000.000/0001-00"
            {...register('cnpj_cpf')}
          />
        </div>

        {/* Observações */}
        <Textarea
          label="Observações"
          placeholder="Informações relevantes sobre o cliente, nicho, produto, público..."
          rows={3}
          {...register('observacoes')}
        />

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEdit ? 'Salvar alterações' : 'Criar cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
