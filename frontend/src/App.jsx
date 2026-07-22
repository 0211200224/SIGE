import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, ROLE_HOME } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/layout/Layout'

// Auth
import Login from './pages/Login'
import AlterarSenha from './pages/AlterarSenha'
import EsqueciSenha from './pages/EsqueciSenha'

// Configuração
import EscolaInicial from './pages/Configuracao/EscolaInicial'
import CriacaoFuncionarios from './pages/Configuracao/CriacaoFuncionarios'

// Director
import DirectorLayout from './pages/Director/DirectorLayout'
import DirectorDashboard from './pages/Director/Dashboard'
import Utilizadores from './pages/Director/Utilizadores/index'
import PoliticasAcademicas from './pages/Director/Politicas/Academicas'
import PoliticasFinanceiras from './pages/Director/Politicas/Financeiras'
import PoliticasAdministrativas from './pages/Director/Politicas/Administrativas'
import Aprovacoes from './pages/Director/Aprovacoes/index'
import Auditoria from './pages/Director/Auditoria/index'
import RelatoriosExecutivos from './pages/Director/Relatorios/index'
import IndicadoresInstitucionais from './pages/Director/Indicadores/index'

// Portais + Layouts
import SecretariaLayout from './pages/Secretaria/SecretariaLayout'
import SecretariaPortal from './pages/Secretaria/Portal'
import AlunosList from './pages/Secretaria/Alunos/index'
import AlunoNovo from './pages/Secretaria/Alunos/Novo'
import AlunoDetalhe from './pages/Secretaria/Alunos/Detalhe'
import Matriculas from './pages/Secretaria/Matriculas/index'
import MatriculaNova from './pages/Secretaria/Matriculas/Nova'
import TurmasSecretaria from './pages/Secretaria/Turmas/index'
import Documentos from './pages/Secretaria/Documentos/index'
import Encarregados from './pages/Secretaria/Encarregados/index'
import Transferencias from './pages/Secretaria/Transferencias/index'
import Solicitacoes from './pages/Secretaria/Solicitacoes/index'
import RelatoriosSecretaria from './pages/Secretaria/Relatorios/index'

import PedagogicoLayout from './pages/Pedagogico/PedagogicoLayout'
import PedagogicoPortal from './pages/Pedagogico/Portal'
import Classes from './pages/Pedagogico/Classes/index'
import Salas from './pages/Pedagogico/Salas/index'
import TurmasPedagogico from './pages/Pedagogico/Turmas/index'
import Disciplinas from './pages/Pedagogico/Disciplinas/index'
import Atribuicoes from './pages/Pedagogico/Atribuicoes/index'
import Ranking from './pages/Pedagogico/Ranking/index'
import Periodos from './pages/Pedagogico/Periodos/index'
import PlanosCurriculares from './pages/Pedagogico/PlanosCurriculares/index'
import Avaliacoes from './pages/Pedagogico/Avaliacoes/index'
import ValidacaoNotas from './pages/Pedagogico/ValidacaoNotas/index'
import FrequenciaPedagogico from './pages/Pedagogico/Frequencia/index'
import FechoPeriodo from './pages/Pedagogico/FechoPeriodo/index'
import ConselhoClasse from './pages/Pedagogico/ConselhoClasse/index'
import ResultadosFinais from './pages/Pedagogico/ResultadosFinais/index'
import RelatoriosPedagogico from './pages/Pedagogico/RelatoriosPedagogico/index'

import ProfessorLayout from './pages/Professor/ProfessorLayout'
import ProfessorPortal from './pages/Professor/Portal'
import ProfessorTurmas from './pages/Professor/Turmas/index'
import ProfessorNotas from './pages/Professor/Notas/index'
import ProfessorPresencas from './pages/Professor/Presencas/index'
import ProfessorPautas from './pages/Professor/Pautas/index'

import FinanceiroLayout from './pages/Financeiro/FinanceiroLayout'
import FinanceiroPortal from './pages/Financeiro/Portal'
import PlanosPropinas from './pages/Financeiro/PlanosPropinas/index'
import ContasAlunos from './pages/Financeiro/ContasAlunos/index'
import Taxas from './pages/Financeiro/Taxas/index'
import Pagamentos from './pages/Financeiro/Pagamentos/index'
import Pendentes from './pages/Financeiro/Pendentes/index'
import Dividas from './pages/Financeiro/Dividas/index'
import Recibos from './pages/Financeiro/Recibos/index'
import Cobrancas from './pages/Financeiro/Cobrancas/index'
import Bolsas from './pages/Financeiro/Bolsas/index'
import FechoFinanceiro from './pages/Financeiro/FechoFinanceiro/index'
import RelatoriosFinanceiro from './pages/Financeiro/RelatoriosFinanceiro/index'

import RHLayout from './pages/RH/RHLayout'
import RHPortal from './pages/RH/Portal'
import Funcionarios from './pages/RH/Funcionarios/index'
import FuncionarioNovo from './pages/RH/Funcionarios/Novo'
import FuncionarioDetalhe from './pages/RH/Funcionarios/Detalhe'
import FuncionarioEditar from './pages/RH/Funcionarios/Editar'
import DocumentosFuncionario from './pages/RH/Documentos/index'
import Departamentos from './pages/RH/Departamentos/index'
import Cargos from './pages/RH/Cargos/index'
import Contratos from './pages/RH/Contratos/index'
import Ferias from './pages/RH/Ferias/index'
import Faltas from './pages/RH/Faltas/index'
import FolhaPagamento from './pages/RH/FolhaPagamento/index'
import FolhaDetalhe from './pages/RH/FolhaPagamento/Detalhe'
import ConfiguracaoSalarial from './pages/RH/Configuracao/index'

import AdminLayout from './pages/Admin/AdminLayout'
import AdminPortal from './pages/Admin/Portal'
import NovaEscola from './pages/Admin/NovaEscola'
import GerirEscola from './pages/Admin/GerirEscola'

import EstudanteLayout from './pages/Estudante/EstudanteLayout'
import EstudantePortal from './pages/Estudante/Portal'
import EstudantePerfil from './pages/Estudante/Perfil/index'
import EstudanteNotas from './pages/Estudante/Notas/index'
import EstudantePresencas from './pages/Estudante/Presencas/index'
import EstudanteFinanceiro from './pages/Estudante/Financeiro/index'
import EstudanteBoletim from './pages/Estudante/Boletim/index'

import RelatoriosLayout from './pages/Relatorios/RelatoriosLayout'
import RelatoriosPortal from './pages/Relatorios/Portal'
import RelatorioAcademicos from './pages/Relatorios/Academicos/index'
import RelatorioPautas from './pages/Relatorios/Pautas/index'
import RelatorioBoletins from './pages/Relatorios/Boletins/index'
import RelatorioFinanceiros from './pages/Relatorios/Financeiros/index'
import RelatorioRH from './pages/Relatorios/RH/index'

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace />
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/esqueci-senha" element={<PublicOnlyRoute><EsqueciSenha /></PublicOnlyRoute>} />
          <Route path="/alterar-senha" element={<PrivateRoute roles={['director','secretaria','professor','financeiro','rh','pedagogico','aluno','super_admin']}><AlterarSenha /></PrivateRoute>} />

          {/* Root redirect */}
          <Route path="/" element={<PrivateRoute />}>
            <Route index element={<RoleRedirect />} />
          </Route>

          {/* Configuração — director e super_admin */}
          <Route element={<PrivateRoute allowedRoles={['director', 'super_admin']} />}>
            <Route path="/configuracao" element={<EscolaInicial />} />
            <Route path="/configuracao/funcionarios" element={<CriacaoFuncionarios />} />
          </Route>

          {/* Dashboard director (legado) */}
          <Route element={<PrivateRoute allowedRoles={['director']} />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DirectorDashboard />} />
            </Route>
          </Route>

          {/* Portal do Director */}
          <Route element={<PrivateRoute allowedRoles={['director']} />}>
            <Route path="/diretor" element={<DirectorLayout />}>
              <Route index element={<DirectorDashboard />} />
              <Route path="utilizadores" element={<Utilizadores />} />
              <Route path="politicas/academicas" element={<PoliticasAcademicas />} />
              <Route path="politicas/financeiras" element={<PoliticasFinanceiras />} />
              <Route path="politicas/administrativas" element={<PoliticasAdministrativas />} />
              <Route path="aprovacoes" element={<Aprovacoes />} />
              <Route path="auditoria" element={<Auditoria />} />
              <Route path="relatorios" element={<RelatoriosExecutivos />} />
              <Route path="indicadores" element={<IndicadoresInstitucionais />} />
            </Route>
          </Route>

          {/* Secretaria */}
          <Route element={<PrivateRoute allowedRoles={['director','secretaria']} />}>
            <Route path="/secretaria" element={<SecretariaLayout />}>
              <Route index element={<SecretariaPortal />} />
              <Route path="alunos" element={<AlunosList />} />
              <Route path="alunos/novo" element={<AlunoNovo />} />
              <Route path="alunos/:id" element={<AlunoDetalhe />} />
              <Route path="matriculas" element={<Matriculas />} />
              <Route path="matriculas/nova" element={<MatriculaNova />} />
              <Route path="turmas" element={<TurmasSecretaria />} />
              <Route path="encarregados" element={<Encarregados />} />
              <Route path="transferencias" element={<Transferencias />} />
              <Route path="solicitacoes" element={<Solicitacoes />} />
              <Route path="documentos" element={<Documentos />} />
              <Route path="relatorios" element={<RelatoriosSecretaria />} />
            </Route>
          </Route>

          {/* Pedagógico */}
          <Route element={<PrivateRoute allowedRoles={['director','pedagogico']} />}>
            <Route path="/pedagogico" element={<PedagogicoLayout />}>
              <Route index element={<PedagogicoPortal />} />
              <Route path="classes" element={<Classes />} />
              <Route path="salas" element={<Salas />} />
              <Route path="turmas" element={<TurmasPedagogico />} />
              <Route path="disciplinas" element={<Disciplinas />} />
              <Route path="atribuicoes" element={<Atribuicoes />} />
              <Route path="periodos" element={<Periodos />} />
              <Route path="planos" element={<PlanosCurriculares />} />
              <Route path="avaliacoes" element={<Avaliacoes />} />
              <Route path="validacao-notas" element={<ValidacaoNotas />} />
              <Route path="frequencia" element={<FrequenciaPedagogico />} />
              <Route path="fecho-periodo" element={<FechoPeriodo />} />
              <Route path="conselhos" element={<ConselhoClasse />} />
              <Route path="resultados" element={<ResultadosFinais />} />
              <Route path="ranking" element={<Ranking />} />
              <Route path="relatorios" element={<RelatoriosPedagogico />} />
            </Route>
          </Route>

          {/* Professor */}
          <Route element={<PrivateRoute allowedRoles={['director','professor','pedagogico']} />}>
            <Route path="/professor" element={<ProfessorLayout />}>
              <Route index element={<ProfessorPortal />} />
              <Route path="turmas" element={<ProfessorTurmas />} />
              <Route path="notas" element={<ProfessorNotas />} />
              <Route path="presencas" element={<ProfessorPresencas />} />
              <Route path="pautas" element={<ProfessorPautas />} />
            </Route>
          </Route>

          {/* Financeiro */}
          <Route element={<PrivateRoute allowedRoles={['director','financeiro']} />}>
            <Route path="/financeiro" element={<FinanceiroLayout />}>
              <Route index element={<FinanceiroPortal />} />
              <Route path="planos" element={<PlanosPropinas />} />
              <Route path="contas" element={<ContasAlunos />} />
              <Route path="taxas" element={<Taxas />} />
              <Route path="pagamentos" element={<Pagamentos />} />
              <Route path="pendentes" element={<Pendentes />} />
              <Route path="dividas" element={<Dividas />} />
              <Route path="recibos" element={<Recibos />} />
              <Route path="cobrancas" element={<Cobrancas />} />
              <Route path="bolsas" element={<Bolsas />} />
              <Route path="fecho" element={<FechoFinanceiro />} />
              <Route path="relatorios" element={<RelatoriosFinanceiro />} />
            </Route>
          </Route>

          {/* RH */}
          <Route element={<PrivateRoute allowedRoles={['director','rh']} />}>
            <Route path="/rh" element={<RHLayout />}>
              <Route index element={<RHPortal />} />
              <Route path="funcionarios" element={<Funcionarios />} />
              <Route path="funcionarios/novo" element={<FuncionarioNovo />} />
              <Route path="funcionarios/:id" element={<FuncionarioDetalhe />} />
              <Route path="funcionarios/:id/editar" element={<FuncionarioEditar />} />
              <Route path="funcionarios/:id/documentos" element={<DocumentosFuncionario />} />
              <Route path="departamentos" element={<Departamentos />} />
              <Route path="cargos" element={<Cargos />} />
              <Route path="contratos" element={<Contratos />} />
              <Route path="ferias" element={<Ferias />} />
              <Route path="faltas" element={<Faltas />} />
              <Route path="folha-pagamento" element={<FolhaPagamento />} />
              <Route path="folha-pagamento/:id" element={<FolhaDetalhe />} />
              <Route path="configuracao" element={<ConfiguracaoSalarial />} />
            </Route>
          </Route>

          {/* Super Admin */}
          <Route element={<PrivateRoute allowedRoles={['super_admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminPortal />} />
              <Route path="escolas" element={<AdminPortal />} />
            </Route>
          </Route>
          <Route element={<PrivateRoute allowedRoles={['super_admin']} />}>
            <Route path="/admin/nova-escola" element={<NovaEscola />} />
            <Route path="/admin/escola/:id" element={<GerirEscola />} />
          </Route>

          {/* Estudante */}
          <Route element={<PrivateRoute allowedRoles={['aluno']} />}>
            <Route path="/estudante" element={<EstudanteLayout />}>
              <Route index element={<EstudantePortal />} />
              <Route path="perfil" element={<EstudantePerfil />} />
              <Route path="notas" element={<EstudanteNotas />} />
              <Route path="presencas" element={<EstudantePresencas />} />
              <Route path="financeiro" element={<EstudanteFinanceiro />} />
              <Route path="boletim" element={<EstudanteBoletim />} />
            </Route>
          </Route>

          {/* Relatórios */}
          <Route element={<PrivateRoute allowedRoles={['director','secretaria','pedagogico','financeiro','rh']} />}>
            <Route path="/relatorios" element={<RelatoriosLayout />}>
              <Route index element={<RelatoriosPortal />} />
              <Route path="academicos" element={<RelatorioAcademicos />} />
              <Route path="pautas" element={<RelatorioPautas />} />
              <Route path="boletins" element={<RelatorioBoletins />} />
              <Route path="financeiros" element={<RelatorioFinanceiros />} />
              <Route path="rh" element={<RelatorioRH />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
