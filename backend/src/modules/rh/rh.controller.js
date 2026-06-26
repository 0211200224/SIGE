const rh = require('./rh.service')
const { success, created, error, notFound } = require('../../utils/response')

const wrap = (fn, isCreate) => async (req, res) => {
  try {
    const result = await fn(req)
    return isCreate ? created(res, result) : success(res, result)
  } catch (err) {
    return error(res, err.message, 400)
  }
}

// Departamentos
exports.listarDepartamentos = wrap(req => rh.listarDepartamentos(req.tenantId))
exports.criarDepartamento = wrap(req => rh.criarDepartamento(req.tenantId, req.body), true)
exports.atualizarDepartamento = wrap(req => rh.atualizarDepartamento(req.tenantId, req.params.id, req.body))
exports.eliminarDepartamento = wrap(req => rh.eliminarDepartamento(req.tenantId, req.params.id))

// Cargos
exports.listarCargos = wrap(req => rh.listarCargos(req.tenantId))
exports.criarCargo = wrap(req => rh.criarCargo(req.tenantId, req.body), true)
exports.atualizarCargo = wrap(req => rh.atualizarCargo(req.tenantId, req.params.id, req.body))
exports.eliminarCargo = wrap(req => rh.eliminarCargo(req.tenantId, req.params.id))

// Funcionários
exports.listar = wrap(req => rh.listar(req.tenantId, req.query))
exports.criar = wrap(req => rh.criar(req.tenantId, req.body), true)
exports.obter = async (req, res) => {
  try {
    const f = await rh.obterPorId(req.tenantId, req.params.id)
    if (!f) return notFound(res, 'Funcionário não encontrado')
    return success(res, f)
  } catch (err) { return error(res, err.message, 400) }
}
exports.atualizar = wrap(req => rh.atualizar(req.tenantId, req.params.id, req.body))

exports.criarAcesso = wrap(req => rh.criarAcesso(req.tenantId, req.params.id, req.body.role), true)
exports.revogarAcesso = wrap(req => rh.revogarAcesso(req.tenantId, req.params.id))
exports.reativarAcesso = wrap(req => rh.reativarAcesso(req.tenantId, req.params.id))

exports.obterFoto = async (req, res) => {
  try {
    const foto = await rh.obterFoto(req.tenantId, req.params.id)
    return success(res, { foto })
  } catch (err) { return error(res, err.message, 400) }
}
exports.obterResumoFuncionario = wrap(req => rh.obterResumoFuncionario(req.tenantId, req.params.id))

// Contratos
exports.listarContratos = wrap(req => rh.listarContratos(req.tenantId, req.query))
exports.criarContrato = wrap(req => rh.criarContrato(req.tenantId, req.body), true)
exports.atualizarContrato = wrap(req => rh.atualizarContrato(req.tenantId, req.params.id, req.body))

// Férias
exports.listarFerias = wrap(req => rh.listarFerias(req.tenantId, req.query))
exports.criarFerias = wrap(req => rh.criarFerias(req.tenantId, req.body), true)
exports.atualizarEstadoFerias = wrap(req => rh.atualizarEstadoFerias(req.tenantId, req.params.id, req.body.estado, req.user.id))

// Faltas
exports.listarFaltas = wrap(req => rh.listarFaltas(req.tenantId, req.query))
exports.criarFalta = wrap(req => rh.criarFalta(req.tenantId, req.body), true)
exports.eliminarFalta = wrap(req => rh.eliminarFalta(req.tenantId, req.params.id))

// Folha de Pagamento
exports.listarFolhas = wrap(req => rh.listarFolhas(req.tenantId))
exports.gerarFolha = wrap(req => rh.gerarFolha(req.tenantId, req.body.mes, req.body.ano, req.user.id), true)
exports.obterFolha = wrap(req => rh.obterFolha(req.tenantId, req.params.id))
exports.processarFolha = wrap(req => rh.processarFolha(req.tenantId, req.params.id))
exports.eliminarFolha = wrap(req => rh.eliminarFolha(req.tenantId, req.params.id))
exports.pagarFolha = wrap(req => rh.pagarFolha(req.tenantId, req.params.id))
exports.atualizarLinhaSalario = wrap(req => rh.atualizarLinhaSalario(req.tenantId, req.params.id, req.body))

// Configuração Salarial
exports.obterConfiguracao = wrap(req => rh.obterConfiguracao(req.tenantId))
exports.atualizarConfiguracao = wrap(req => rh.atualizarConfiguracao(req.tenantId, req.body))

// Documentos do Funcionário
exports.listarDocumentos = wrap(req => rh.listarDocumentosFuncionario(req.tenantId, req.params.id))
exports.criarDocumento = wrap(req => rh.criarDocumentoFuncionario(req.tenantId, { funcionario_id: req.params.id, ...req.body }), true)
exports.obterDocumento = wrap(req => rh.obterDocumentoFuncionario(req.tenantId, req.params.docId))
exports.eliminarDocumento = wrap(req => rh.eliminarDocumentoFuncionario(req.tenantId, req.params.docId))

// Stats
exports.obterStats = wrap(req => rh.obterStats(req.tenantId))
