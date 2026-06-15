'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal, Input, Select, Textarea, Button } from '@/components/ui'

interface FormData {
  titulo: string
  conteudo: string
  tipo: string
}

const TIPOS_ANOTACAO = [
  { value: 'nota',     label: '📝 Nota geral' },
  { value: 'reuniao',  label: '🤝 Reunião' },
  { value: 'ligacao',  label: '📞 Ligação' },
  { value: 'email',    label: '✉️ E-mail' },
  { value: 'insight',  label: '💡 Insight' },
  { value: 'alerta',   label: '⚠️ Alerta' },
]

interface Props {
  open: boolean
  onClose: () => void
  onSave: (dados: FormData) => Promise<void>
}

export default function AnotacaoForm({ open, onClose, onSave }: Props) {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { tipo: 'nota', titulo: '', conteudo: '' },
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
    <Modal open={open} onClose={onClose} title="Nova anotação" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Título (opcional)" placeholder="Reunião de alinhamento..." {...register('titulo')} />
          <Select label="Tipo" {...register('tipo')}>
            {TIPOS_ANOTACAO.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </div>
        <Textarea
          label="Conteúdo *"
          placeholder="Descreva o que foi discutido, decidido ou observado..."
          rows={5}
          required
          {...register('conteudo')}
        />
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={loading}>Salvar anotação</Button>
        </div>
      </form>
    </Modal>
  )
}
