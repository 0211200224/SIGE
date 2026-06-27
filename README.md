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
- MySQL2
- JWT (autenticação)
- bcryptjs (encriptação de senhas)

**Frontend**
- React 18 + Vite
- React Router v6
- Tailwind CSS
- Recharts (gráficos)

## Estrutura do Projecto

```
SIGE/
├── backend/
│   └── src/
│       ├── modules/      # alunos, auth, financeiro, notas, rh, ...
│       ├── middleware/
│       ├── config/
│       └── server.js
├── frontend/
│   └── src/
│       └── pages/        # Admin, Director, Financeiro, Estudante, ...
└── sige_db.sql           # Script de criação da base de dados
```

## Instalação e Execução

### Pré-requisitos
- Node.js >= 18
- MySQL >= 8

### 1. Base de dados

```bash
mysql -u root -p < sige_db.sql
```

### 2. Backend

```bash
cd backend
npm install
```

Cria o ficheiro `.env` na pasta `backend/`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=a_tua_senha
DB_NAME=sige_db
JWT_SECRET=chave_secreta
PORT=5000
```

```bash
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

A aplicação fica disponível em `http://localhost:5173`.

## Licença

Projecto académico — todos os direitos reservados.
