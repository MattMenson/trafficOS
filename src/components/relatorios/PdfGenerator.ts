'use client'

// -------------------------------------------------------
// TrafficOS — Gerador de PDF do Relatório
// Usa jsPDF + jspdf-autotable (já no package.json)
// -------------------------------------------------------

interface DadosRelatorio {
  gerado_em: string
  periodo: { inicio: string; fim: string }
  gestor: { nome: string; email: string }
  cliente: {
    nome: string; email: string | null; segmento: string | null
    cnpj_cpf: string | null; contrato: { descricao: string; valor_mensal: number } | null
  }
  financeiro: {
    total_faturado: number; total_recebido: number; total_pendente: number
    pagamentos: Array<{ descricao: string; valor: number; status: string; data_vencimento: string }>
  }
  meta: {
    contas: Array<{ nome: string; investimento: number; leads: number; cpl: number }>
    totais: {
      investimento: number; impressoes: number; alcance: number
      cliques: number; leads: number; conversoes: number
      ctr: number; cpm: number; cpc: number; cpl: number; cpa: number
    }
    evolucao_diaria: Array<{ data: string; investimento: number; leads: number; ctr: number }>
  }
  entregas: Array<{ titulo: string; tipo: string | null; status: string }>
  ideias_impl: Array<{ titulo: string; categoria: string | null }>
}

function formatBRL(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function formatPeriodo(inicio: string, fim: string) {
  const i = new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const f = new Date(fim    + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  return `${i} a ${f}`
}

// Barra simples desenhada em canvas → base64 para o PDF
function gerarBarChartBase64(
  dados: Array<{ label: string; value: number }>,
  w = 480, h = 140
): string {
  if (typeof document === 'undefined') return ''
  const canvas  = document.createElement('canvas')
  canvas.width  = w * 2   // retina
  canvas.height = h * 2
  const ctx     = canvas.getContext('2d')!
  ctx.scale(2, 2)

  const max    = Math.max(...dados.map(d => d.value), 1)
  const padX   = 48
  const padY   = 12
  const padBot = 28
  const barW   = Math.max(4, (w - padX * 2) / dados.length - 4)
  const innerH = h - padY - padBot

  // Grid
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth   = 0.5
  for (let i = 0; i <= 4; i++) {
    const y = padY + innerH - (i / 4) * innerH
    ctx.beginPath()
    ctx.moveTo(padX, y)
    ctx.lineTo(w - padX, y)
    ctx.stroke()

    ctx.fillStyle   = '#9ca3af'
    ctx.font        = '8px sans-serif'
    ctx.textAlign   = 'right'
    ctx.fillText(formatBRL((max * i) / 4).replace('R$ ', 'R$'), padX - 4, y + 3)
  }

  // Barras
  dados.forEach((d, i) => {
    const x       = padX + i * ((w - padX * 2) / dados.length) + 2
    const barH    = (d.value / max) * innerH
    const y       = padY + innerH - barH

    ctx.fillStyle = '#1D9E75'
    ctx.beginPath()
    ctx.roundRect(x, y, barW, barH, 2)
    ctx.fill()

    // Label
    ctx.fillStyle   = '#374151'
    ctx.font        = '7px sans-serif'
    ctx.textAlign   = 'center'
    ctx.fillText(d.label, x + barW / 2, h - padBot + 14)
  })

  return canvas.toDataURL('image/png')
}

export async function gerarPDF(dados: DadosRelatorio): Promise<void> {
  // Import dinâmico — jspdf só roda no browser
  const { default: jsPDF }   = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W   = 210
  const M   = 14   // margem lateral

  // ── Cores ──
  const VERDE    = [29,  158, 117] as [number, number, number]
  const VERDE_CL = [232, 248, 241] as [number, number, number]
  const CINZA    = [107, 114, 128] as [number, number, number]
  const ESCURO   = [17,  24,  39]  as [number, number, number]
  const LINHA    = [229, 231, 235] as [number, number, number]

  let y = 0

  // ── CAPA / HEADER ──
  doc.setFillColor(...VERDE)
  doc.rect(0, 0, W, 42, 'F')

  doc.setFillColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('Relatório de Performance', M, 16)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(dados.cliente.nome, M, 24)
  doc.text(formatPeriodo(dados.periodo.inicio, dados.periodo.fim), M, 30)

  // Logo texto "TrafficOS" no canto direito
  doc.setFontSize(8)
  doc.setTextColor(200, 240, 225)
  doc.text('TrafficOS', W - M, 14, { align: 'right' })
  doc.text(`Gerado por ${dados.gestor.nome}`, W - M, 20, { align: 'right' })
  doc.text(`${new Date(dados.gerado_em).toLocaleDateString('pt-BR')}`, W - M, 26, { align: 'right' })

  y = 50

  // ── SEÇÃO: Resumo Financeiro ──
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ESCURO)
  doc.text('Resumo financeiro', M, y)
  y += 6

  // Cards de métrica (3 colunas)
  const cardW = (W - M * 2 - 8) / 3
  const metricas = [
    { label: 'Total faturado',  value: formatBRL(dados.financeiro.total_faturado) },
    { label: 'Total recebido',  value: formatBRL(dados.financeiro.total_recebido) },
    { label: 'Pendente',        value: formatBRL(dados.financeiro.total_pendente) },
  ]
  metricas.forEach((m, i) => {
    const cx = M + i * (cardW + 4)
    doc.setFillColor(...VERDE_CL)
    doc.roundedRect(cx, y, cardW, 18, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...CINZA)
    doc.text(m.label, cx + 4, y + 6)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ESCURO)
    doc.text(m.value, cx + 4, y + 14)
  })
  y += 24

  // Tabela de pagamentos (se houver)
  if (dados.financeiro.pagamentos.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...CINZA)
    doc.text('Pagamentos do período', M, y)
    y += 3

    autoTable(doc, {
      startY:    y,
      margin:    { left: M, right: M },
      head:      [['Descrição', 'Vencimento', 'Valor', 'Status']],
      body:      dados.financeiro.pagamentos.map(p => [
        p.descricao,
        formatDate(p.data_vencimento),
        formatBRL(p.valor),
        p.status === 'pago' ? 'Pago ✓' : p.status === 'atrasado' ? 'Atrasado' : 'Pendente',
      ]),
      styles:         { fontSize: 8, cellPadding: 3 },
      headStyles:     { fillColor: VERDE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles:   { 0: { cellWidth: 72 }, 1: { cellWidth: 26 }, 2: { cellWidth: 28 }, 3: { cellWidth: 22 } },
      didParseCell: (data) => {
        if (data.column.index === 3 && data.section === 'body') {
          const v = data.cell.raw as string
          if (v.includes('✓'))        data.cell.styles.textColor = [5, 150, 105]
          else if (v === 'Atrasado')  data.cell.styles.textColor = [220, 38, 38]
          else                        data.cell.styles.textColor = [180, 117, 23]
        }
      },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ── SEÇÃO: Meta Ads ──
  if (dados.meta.totais.investimento > 0) {
    // Linha divisória
    doc.setDrawColor(...LINHA)
    doc.line(M, y, W - M, y)
    y += 6

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ESCURO)
    doc.text('Meta Ads — resultados', M, y)
    y += 7

    // KPIs Meta (2 linhas de 4)
    const kpis = [
      { label: 'Investimento',   value: formatBRL(dados.meta.totais.investimento) },
      { label: 'Impressões',     value: dados.meta.totais.impressoes.toLocaleString('pt-BR') },
      { label: 'Alcance',        value: dados.meta.totais.alcance.toLocaleString('pt-BR') },
      { label: 'Cliques',        value: dados.meta.totais.cliques.toLocaleString('pt-BR') },
      { label: 'CTR',            value: `${dados.meta.totais.ctr.toFixed(2)}%` },
      { label: 'CPM',            value: formatBRL(dados.meta.totais.cpm) },
      { label: 'Leads',          value: dados.meta.totais.leads.toLocaleString('pt-BR') },
      { label: 'CPL',            value: dados.meta.totais.cpl > 0 ? formatBRL(dados.meta.totais.cpl) : '—' },
    ]

    const kpiW  = (W - M * 2 - 12) / 4
    const rows  = [kpis.slice(0, 4), kpis.slice(4, 8)]

    rows.forEach((row, ri) => {
      row.forEach((k, ci) => {
        const cx = M + ci * (kpiW + 4)
        const cy = y + ri * 22
        doc.setFillColor(248, 250, 252)
        doc.roundedRect(cx, cy, kpiW, 18, 2, 2, 'F')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...CINZA)
        doc.text(k.label, cx + 3, cy + 6)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...ESCURO)
        doc.text(k.value, cx + 3, cy + 13)
      })
    })
    y += 50

    // Gráfico de barras — investimento diário
    if (dados.meta.evolucao_diaria.length > 1) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...CINZA)
      doc.text('Investimento diário', M, y)
      y += 3

      // Verifica se cabe na página — se não, adiciona nova página
      if (y + 45 > 270) { doc.addPage(); y = 20 }

      const chartDados = dados.meta.evolucao_diaria.map(d => ({
        label: new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: d.investimento,
      }))

      const chartPng = gerarBarChartBase64(chartDados, 480, 130)
      if (chartPng) {
        doc.addImage(chartPng, 'PNG', M, y, W - M * 2, 35)
        y += 40
      }
    }

    // Breakdown por conta
    if (dados.meta.contas.length > 1) {
      if (y + 30 > 270) { doc.addPage(); y = 20 }

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...CINZA)
      doc.text('Desempenho por conta', M, y)
      y += 3

      autoTable(doc, {
        startY:  y,
        margin:  { left: M, right: M },
        head:    [['Conta', 'Investimento', 'Leads', 'CPL']],
        body:    dados.meta.contas.map(c => [
          c.nome,
          formatBRL(c.investimento),
          c.leads.toLocaleString('pt-BR'),
          c.cpl > 0 ? formatBRL(c.cpl) : '—',
        ]),
        styles:     { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: VERDE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }
  }

  // ── SEÇÃO: Entregas ──
  if (dados.entregas.length > 0) {
    if (y + 40 > 270) { doc.addPage(); y = 20 }
    doc.setDrawColor(...LINHA)
    doc.line(M, y, W - M, y)
    y += 6

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ESCURO)
    doc.text('Entregas do período', M, y)
    y += 4

    autoTable(doc, {
      startY:  y,
      margin:  { left: M, right: M },
      head:    [['Entrega', 'Tipo', 'Status']],
      body:    dados.entregas.map(e => [
        e.titulo,
        e.tipo || '—',
        e.status.replace('_', ' '),
      ]),
      styles:     { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 0: { cellWidth: 100 } },
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ── SEÇÃO: Estratégias implementadas ──
  if (dados.ideias_impl.length > 0) {
    if (y + 30 > 270) { doc.addPage(); y = 20 }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ESCURO)
    doc.text('Estratégias implementadas', M, y)
    y += 5

    dados.ideias_impl.forEach(ideia => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.setFillColor(...VERDE_CL)
      doc.roundedRect(M, y, W - M * 2, 8, 1, 1, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...ESCURO)
      doc.text(`• ${ideia.titulo}`, M + 3, y + 5.5)
      if (ideia.categoria) {
        doc.setTextColor(...CINZA)
        doc.text(ideia.categoria, W - M - 3, y + 5.5, { align: 'right' })
      }
      y += 10
    })
    y += 4
  }

  // ── RODAPÉ em todas as páginas ──
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFillColor(248, 250, 252)
    doc.rect(0, 282, W, 15, 'F')
    doc.setDrawColor(...LINHA)
    doc.line(0, 282, W, 282)

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...CINZA)
    doc.text(`TrafficOS · Relatório gerado em ${new Date(dados.gerado_em).toLocaleString('pt-BR')}`, M, 289)
    doc.text(`${p} / ${totalPages}`, W - M, 289, { align: 'right' })
    if (dados.gestor.email) {
      doc.text(dados.gestor.email, W / 2, 289, { align: 'center' })
    }
  }

  // ── Salva o arquivo ──
  const nomeArquivo = `Relatorio_${dados.cliente.nome.replace(/\s+/g, '_')}_${dados.periodo.inicio.slice(0, 7)}.pdf`
  doc.save(nomeArquivo)
}
