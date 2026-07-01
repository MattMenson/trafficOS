# TrafficOS — Sistema para Gestores de Tráfego

Sistema completo para gestão de clientes, financeiro, campanhas Meta Ads e relatórios.

---

## Stack

- **Frontend & Backend**: Next.js 14 (App Router)
- **Banco de dados**: Supabase (PostgreSQL + Auth + RLS)
- **Integração**: Meta Marketing API v20
- **UI**: Tailwind CSS + Radix UI + Recharts
- **Linguagem**: TypeScript

---

## Setup inicial (passo a passo)

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e execute o arquivo `supabase/migrations/001_schema_inicial.sql`
3. Vá em **Settings → API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Conectar contas Meta (duas formas, escolha uma)

A Meta exige, sem exceção, um app criado em developers.facebook.com pra gerar qualquer token de acesso à Marketing API — não existe forma de pular essa etapa (nem ferramentas como Adveronix ou UTMify escapam disso, elas só usam o app delas em vez do seu). O que dá pra escolher é o quanto dessa complexidade entra na configuração do TrafficOS.

**Opção A — Colar token manualmente (mais simples, recomendada)**

Não usa OAuth, não precisa de App Secret nem de URI de redirect configurada em lugar nenhum.

1. Acesse [developers.facebook.com](https://developers.facebook.com) → crie um app tipo **Business** (leva 2 minutos, sem App Review necessário pra uso próprio)
2. Adicione o produto **Marketing API** ao app
3. Vá em [business.facebook.com](https://business.facebook.com) → **Configurações do negócio → Usuários → Usuários do sistema**
4. Clique **Adicionar**, crie um system user, depois **Gerar novo token**
5. Selecione o app criado no passo 1 e marque as permissões: `ads_read`, `ads_management`, `business_management`, `read_insights`
6. Copie o token gerado (token de system user não expira, ao contrário do token de usuário comum que dura 60 dias)
7. Na página **Meta Ads** do TrafficOS, clique em **"Colar token manualmente"** e informe o ID do Business Manager + o token

Não precisa de nenhuma das variáveis `NEXT_PUBLIC_META_APP_ID`, `META_APP_SECRET` ou `NEXT_PUBLIC_META_REDIRECT_URI` nesse caminho.

**Opção B — Login com Facebook (OAuth, um clique pro usuário final)**

Melhor se vários gestores forem usar o sistema e você quiser que cada um conecte a própria conta sem lidar com token manualmente.

1. No mesmo app criado acima, vá em **Facebook Login → Configurações**
2. Em **Configurações do App → Básico**, copie:
   - `ID do Aplicativo` → `NEXT_PUBLIC_META_APP_ID`
   - `Chave Secreta do Aplicativo` → `META_APP_SECRET`
3. Em **Facebook Login → Configurações**, adicione a URI de redirecionamento:
   - Dev: `http://localhost:3000/api/meta/callback`
   - Produção: `https://seudominio.com/api/meta/callback`

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com suas chaves
```

### 4. Instalar dependências e rodar

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### 5. Ativar sincronização automática (produção, na Vercel)

Não é obrigatório em dev, mas necessário pra sincronização rodar sozinha em produção (`vercel.json` já define o cron):

1. Gere um valor aleatório para `CRON_SECRET` (ex: `openssl rand -hex 32`)
2. Cadastre `CRON_SECRET` em **Vercel → Project → Settings → Environment Variables**
3. Faça o deploy. A Vercel passa a chamar `/api/cron/sync-meta` sozinha, no horário definido em `vercel.json` (padrão: a cada 6 horas)
4. No plano **Hobby** da Vercel, cron só roda 1x por dia — troque o `schedule` em `vercel.json` para `"0 6 * * *"` nesse caso. No plano **Pro**, intervalos menores (ex: `0 */6 * * *`) funcionam normalmente.

---

## Estrutura do projeto

```
trafficOS/
├── supabase/
│   └── migrations/
│       └── 001_schema_inicial.sql     # Schema completo do banco
│
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── cadastro/page.tsx
│   │   ├── (app)/                     # Rotas protegidas
│   │   │   ├── layout.tsx             # Layout com sidebar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── clientes/
│   │   │   │   ├── page.tsx           # Lista de clientes
│   │   │   │   └── [id]/page.tsx      # Detalhe do cliente
│   │   │   ├── financeiro/page.tsx
│   │   │   ├── gastos/page.tsx
│   │   │   ├── meta/
│   │   │   │   ├── page.tsx           # Contas de anúncio
│   │   │   │   └── [accountId]/page.tsx
│   │   │   ├── relatorios/page.tsx
│   │   │   ├── ideias/page.tsx
│   │   │   └── tarefas/page.tsx
│   │   └── api/
│   │       ├── cron/
│   │       │   └── sync-meta/route.ts # Sincronização automática (Vercel Cron)
│   │       ├── meta/
│   │       │   ├── callback/route.ts  # OAuth callback
│   │       │   ├── sync/route.ts      # Sincroniza métricas (manual, por usuário)
│   │       │   └── accounts/route.ts
│   │       └── relatorios/
│   │           └── pdf/route.ts
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Client-side Supabase
│   │   │   ├── server.ts              # Server-side Supabase (sessão do usuário)
│   │   │   └── admin.ts               # Service role Supabase (cron, bypassa RLS)
│   │   └── meta-api.ts                # Meta Marketing API
│   │
│   ├── types/
│   │   └── database.ts                # Types TypeScript
│   │
│   ├── components/
│   │   ├── ui/                        # Componentes base
│   │   ├── dashboard/
│   │   ├── clientes/
│   │   ├── financeiro/
│   │   └── meta/
│   │
│   └── middleware.ts                  # Auth middleware
│
├── .env.example
├── package.json
└── README.md
```

---

## Módulos do sistema

| Módulo | Descrição |
|--------|-----------|
| **Dashboard** | MRR, clientes ativos, investimento gerenciado, alertas |
| **Clientes** | Cadastro, contratos, histórico, anotações |
| **Financeiro** | Faturamento, pagamentos, inadimplência |
| **Gastos** | Custos operacionais, margem por cliente |
| **Meta Ads** | Vincular BM, contas de anúncio, sincronização |
| **Relatórios** | Métricas por conta, exportação PDF, envio ao cliente |
| **Ideias** | Estratégias e ideias por cliente com status |
| **Entregas** | Comprometimentos formais e tracking |
| **Tarefas** | Kanban operacional |

---

## Fluxo de integração com Meta API

```
Gestor cadastra BM ID + Access Token
          ↓
Sistema valida token e busca contas de anúncio
          ↓
Gestor vincula cada conta a um cliente
          ↓
Sincronização automática via Vercel Cron (/api/cron/sync-meta)
roda sozinha em produção, sem precisar de clique
          ↓
Métricas salvas em meta_metricas (cache local)
          ↓
Dashboard e relatórios consomem o cache
```

O botão "Sincronizar tudo" na página Meta Ads continua disponível pra forçar uma atualização imediata, mas deixou de ser obrigatório: o cron cuida disso sozinho em produção.

---

## Permissões necessárias no token Meta

- `ads_read` — Leitura de campanhas e conjuntos
- `ads_management` — Necessário para alguns reports
- `business_management` — Acesso ao Business Manager
- `read_insights` — Métricas de performance

---

## Roadmap

- [x] Schema do banco de dados
- [x] Types TypeScript
- [x] Integração Meta API (lib)
- [x] Middleware de autenticação
- [ ] Módulo de clientes (CRUD completo)
- [ ] Módulo financeiro
- [x] Sincronização Meta API (API Route + cron)
- [ ] Dashboard com dados reais
- [ ] Geração de relatórios PDF
- [ ] Notificações (contratos vencendo, budget esgotado)
- [ ] Multi-usuário / agência (times)
