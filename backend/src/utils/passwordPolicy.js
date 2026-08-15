// Regra de senha forte -- único ponto de validação para os locais onde o
// utilizador define a sua própria senha (primeiro acesso e alteração
// normal). Nunca aplicada às senhas geradas automaticamente pelo sistema
// (data de nascimento / 'sige2024'), que são sempre temporárias e forçam
// troca obrigatória no primeiro acesso.
const validarForcaSenha = (senha) => {
  if (!senha || senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres.'
  if (!/[a-z]/.test(senha)) return 'A senha deve ter pelo menos uma letra minúscula.'
  if (!/[A-Z]/.test(senha)) return 'A senha deve ter pelo menos uma letra maiúscula.'
  if (!/[0-9]/.test(senha)) return 'A senha deve ter pelo menos um número.'
  if (/^\d{8}$/.test(senha)) return 'A senha não pode ser igual à senha padrão (data de nascimento).'
  if (/^(.)\1+$/.test(senha)) return 'A senha não pode ser um único caractere repetido.'
  return null
}

module.exports = { validarForcaSenha }
