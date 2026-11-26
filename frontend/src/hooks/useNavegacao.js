import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'

// O React Router guarda em history.state.idx a posição da página actual na
// pilha do separador (0 = primeira página da sessão nesta app).
const idxActual = () => window.history.state?.idx ?? 0

// Até onde se pode "avançar": é o maior idx visitado desde a última
// navegação nova (uma navegação nova corta o futuro, como no browser).
// Fica em sessionStorage para sobreviver à troca de layout/portal.
const CHAVE = 'sige_nav_max'
const lerMax = () => { try { return Number(sessionStorage.getItem(CHAVE)) || 0 } catch { return 0 } }
const gravarMax = (v) => { try { sessionStorage.setItem(CHAVE, String(v)) } catch {} }

// Setas ← → da barra do topo, em todo o sistema.
export function useHistoricoNavegacao() {
  const location = useLocation()
  const tipo = useNavigationType()
  const navigate = useNavigate()
  const [estado, setEstado] = useState(() => ({ idx: idxActual(), max: lerMax() }))

  useEffect(() => {
    const idx = idxActual()
    const max = tipo === 'PUSH' ? idx : Math.max(lerMax(), idx)
    gravarMax(max)
    setEstado({ idx, max })
  }, [location.key, tipo])

  return {
    podeVoltar: estado.idx > 0,
    podeAvancar: estado.idx < estado.max,
    voltar: () => navigate(-1),
    avancar: () => navigate(1),
  }
}

// Para botões "Voltar" e para o fim de um formulário (guardar/cancelar):
// volta à página de onde se veio (ex: da folha salarial para a ficha e de
// volta à folha). Só quando não há página anterior nesta sessão (link
// aberto directamente) é que usa o destino por omissão.
export function useVoltar(destinoPorOmissao) {
  const navigate = useNavigate()
  return () => (idxActual() > 0 ? navigate(-1) : navigate(destinoPorOmissao, { replace: true }))
}
