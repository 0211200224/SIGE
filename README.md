# SIGE — Sistema Integrado de Gestão Escolar

Sistema web completo para gestão de instituições de ensino, com múltiplos portais por perfil de utilizador.

## Portais

| Portal | Descrição |
|--------|-----------|
| **Admin** | Gestão de escolas, utilizadores e configurações do sistema |
| **Director** | Visão geral da instituição e relatórios executivos |
| **Secretaria** | Matrículas, alunos e documentação |
| **Pedagógico** | Turmas, notas e presenças |
| **Financeiro** | Propinas, pagamentos, bolsas, dívidas e recibos |
| **RH** | Gestão de recursos humanos |
| **Professor** | Lançamento de notas e presenças |
| **Estudante** | Consulta de notas, presenças e situação financeira |

## Tecnologias

**Backend**
- Node.js + Express
- PostgreSQL (Supabase) via driver `pg`
- JWT (autenticação)
- bcryptjs (encriptação de senhas)

**Frontend**
- React 18 + Vite
- React Router v6
- Tailwind CSS
- Recharts (gráficos)

## Arquitetura de produção

```
┌─────────────┐        ┌──────────────┐        ┌───────────────┐
│   Vercel    │ ───►   │   Render     │ ───►   │   Supabase    │
│  (frontend) │  HTTPS │  (backend)   │  5432  │  (Postgres)   │
│  Vite/React │        │  Express/pg  │        │  47 tabelas   │
└─────────────┘        └──────────────┘        └───────────────┘
```

- **Frontend**: `frontend/` deployado no Vercel. Root Directory = `frontend`. Variável de build `VITE_API_URL` aponta para o backend.
- **Backend**: `backend/` deployado no Render (Web Service, Node). Root Directory = `backend`. Liga ao Postgres via `DATABASE_URL`.
- **Base de dados**: Postgres gerido pelo Supabase (projecto `ceyzgkvtcufnvpjqpflf`). Ligação via **Session Pooler** (`aws-0-eu-west-1.pooler.supabase.com:5432`), não pela ligação directa (essa só tem endereço IPv6 e falha em redes só-IPv4).

**Deploy contínuo**: qualquer `git push` para `main` dispara automaticamente um novo deploy no Render e no Vercel (ambos ligados ao repositório GitHub).

⚠️ **O repositório GitHub está público.** Nunca commitar `.env`, passwords, tokens ou connection strings — só nomes de variáveis (ver `.env.example` em cada pasta).

## Estrutura do Projecto

```
SIGE/
├── backend/
│   ├── src/
│   │   ├── modules/          # alunos, auth, financeiro, notas, rh, pedagogico, secretaria, director, ...
│   │   ├── middleware/
│   │   ├── config/
│   │   │   └── database.js   # Pool do pg + traducao de placeholders ? -> $n + simulacao de insertId
│   │   ├── seed.js           # cria o utilizador admin inicial (id=1)
│   │   └── server.js
│   ├── supabase_schema.sql   # schema Postgres completo (47 tabelas) - fonte de verdade actual
│   ├── fix_booleans.sql      # ALTERs aplicados: BOOLEAN -> SMALLINT (historico, ja aplicado)
│   ├── fix_identity.sql      # ALTERs aplicados: GENERATED ALWAYS -> BY DEFAULT (historico, ja aplicado)
│   ├── render.yaml           # config de deploy no Render (Blueprint)
│   ├── migrate_*.js          # scripts antigos de migracao MySQL (obsoletos, mantidos por historico)
│   └── sige_db.sql           # schema MySQL original (obsoleto, mantido por historico)
├── frontend/
│   ├── src/
│   │   ├── pages/            # Admin, Director, Financeiro, Estudante, ...
│   │   └── services/api.js   # BASE = import.meta.env.VITE_API_URL
│   └── vercel.json           # rewrite para SPA routing (react-router)
└── .mcp.json                 # config do MCP remoto do Supabase (so a URL, sem segredos)
```

## Variáveis de ambiente

### Backend (`backend/.env` local — nunca commitado; em produção: Render → Environment)

| Variável | Descrição | Onde consultar o valor real |
|---|---|---|
| `DATABASE_URL` | Connection string do Postgres (Session Pooler do Supabase) | Supabase → Project Settings → Database → Connection Pooling → URI (modo Session) |
| `JWT_SECRET` | Chave para assinar tokens JWT | `backend/.env` local, ou Render → Environment |
| `JWT_EXPIRES_IN` | Validade do token | `7d` |
| `FRONTEND_URL` | Origem(s) permitidas no CORS, separadas por vírgula | URL do deploy no Vercel |
| `PORT` | Porta do servidor (Render define automaticamente) | — |

### Frontend (`frontend/.env.local` — nunca commitado; em produção: Vercel → Environment Variables)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL da API do backend, com `/api` no fim (ex: `https://sige-1.onrender.com/api`). **Tem de estar definida antes do build** — o Vite grava o valor no bundle em tempo de build, não em runtime. Mudar a variável no Vercel exige um novo deploy. |

## Instalação e Execução local

### Pré-requisitos
- Node.js >= 18
- Uma base Postgres acessível (local, ou o próprio Supabase de desenvolvimento)

### 1. Backend

```bash
cd backend
npm install
```

Cria `backend/.env` (usa `backend/.env.example` como modelo) com `DATABASE_URL` a apontar para o Supabase (Session Pooler).

```bash
npm run dev
```

Primeira vez: corre `node src/seed.js` para criar o utilizador admin inicial.

### 2. Frontend

```bash
cd frontend
npm install
```

Cria `frontend/.env.local` (usa `frontend/.env.example` como modelo). Em desenvolvimento local podes deixar `VITE_API_URL` por definir — cai automaticamente para `http://localhost:3001/api`.

```bash
npm run dev
```

A aplicação fica disponível em `http://localhost:5173`.

## Autenticação

O login é sempre por **código de acesso**, nunca por email (`ESP.DIR.001`, formato `SIGLA.ROLE.NNN`). O único utilizador pré-criado na base de dados é o **super_admin** (via `seed.js`) — é ele quem cria as escolas e o primeiro utilizador (director) de cada uma. A partir daí, cada director pode criar a sua própria equipa (secretaria, professores, etc.) dentro da sua escola.

- Código do super_admin: `SIGE.ADM.001`
- Password: ver `backend/.env` local ou o gestor de segredos do Render — não documentado aqui por ser o único utilizador de nível root do sistema.

Ao criar um utilizador, o sistema gera automaticamente o código (`SIGLA.ROLE.NNN`) e uma senha padrão = data de nascimento em `DDMMAAAA` (ou `sige2024` se não houver data de nascimento) — ver `backend/src/utils/codigoGenerator.js`. O utilizador é obrigado a definir uma nova senha no primeiro login (`primeiro_login = 1`).

**Regras de autorização** (`backend/src/middleware/role.js`):
- Criar/listar/activar/desactivar/eliminar escolas → só `super_admin`
- Ver/editar uma escola específica → `super_admin`, ou o `director` dessa mesma escola
- Criar utilizadores (`POST /api/auth/register`) → `super_admin` (qualquer escola/role) ou `director` (só a própria escola, nunca outro `director`/`super_admin`)

## Nota sobre a migração MySQL → Postgres/Supabase

O projecto nasceu em MySQL (`sige_db.sql` + `migrate_*.js`, mantidos por histórico mas já não usados). Foi migrado por completo para Postgres/Supabase. Decisões relevantes para quem for mexer no schema:

- **Tabelas reconstruídas a partir do código**: `cobrancas`, `contratos`, `faltas_rh`, `grade_levels`, `subjects`, `class_groups`, `teaching_assignments`, `politicas_academicas/financeiras/administrativas`, `solicitacoes_aprovacao`, `auditoria_log`, `salas`, `matriculas`, `departamentos`, `cargos`, `ferias`, `folha_pagamento`, `notificacoes` — nunca tiveram `CREATE TABLE` versionado; a estrutura foi inferida a partir do uso real em `backend/src/modules/**`. Ver `backend/supabase_schema.sql` para a definição final.
- **`TINYINT(1)` → `SMALLINT`** (não `BOOLEAN`): o código usa literais `0`/`1` (ex: `WHERE activo = 1`) espalhados por toda a aplicação; `SMALLINT` mantém essa sintaxe a funcionar sem reescrever todas as queries.
- **`AUTO_INCREMENT` → `GENERATED BY DEFAULT AS IDENTITY`** (não `ALWAYS`): permite `INSERT` explícito de `id`, tal como o `seed.js` faz.
- **`database.js` traduz `?` → `$1,$2...`** automaticamente, e simula `insertId` (via `RETURNING id`) para não ser preciso alterar as ~400 chamadas a `db.query()` espalhadas pelos módulos.
- **`ON DUPLICATE KEY UPDATE` → `ON CONFLICT ... DO UPDATE`**, **`DATE_FORMAT`/`DATEDIFF`/`CURDATE()` → `TO_CHAR`/subtração de datas/`CURRENT_DATE`** foram corrigidos módulo a módulo (`financeiro`, `secretaria`, `rh`, `pedagogico`, `director`, `escolas`, `relatorios`).

## Problemas conhecidos

- `director.service.js` (relatório de contratos a vencer) lê a coluna `c.tipo_contrato`, que não existe em `contratos` (a coluna real é `tipo`) — bug pré-existente à migração, ainda por corrigir.
- Bundle do frontend > 500 kB após minificação (aviso do Vite no build) — candidato a code-splitting/`manualChunks` no futuro.
- Plano free do Render "adormece" o backend após inatividade; o primeiro pedido depois disso pode demorar 30-60s ou falhar uma vez antes de responder.

## Licença

Projecto académico — todos os direitos reservados.
