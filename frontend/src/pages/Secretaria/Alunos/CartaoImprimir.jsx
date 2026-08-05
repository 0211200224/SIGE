import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import CartaoEstudante from '../../../components/cartao/CartaoEstudante'

export default function CartaoImprimir() {
  const { id } = useParams()
  const { escola } = useAuth()
  const [aluno, setAluno] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.get(`/secretaria/alunos/${id}`).then(r => setAluno(r.data)).catch(err => setErro(err.message))
  }, [id])

  if (erro) return (
    <div className="p-10 text-center text-on-surface-variant">
      <p className="font-medium">{erro}</p>
    </div>
  )
  if (!aluno) return (
    <div className="flex justify-center py-20"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
  )

  return (
    <div className="min-h-screen bg-surface-container-low print:bg-white">
      {/* Barra de acções — não imprime */}
      <div className="print:hidden sticky top-0 bg-white border-b border-outline-variant px-6 py-3 flex items-center justify-between z-10">
        <Link to={`/secretaria/alunos/${id}`} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>Voltar à ficha do aluno
        </Link>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:-translate-y-0.5 transition-all">
          <span className="material-symbols-outlined text-[18px]">print</span>Imprimir Cartão
        </button>
      </div>

      <div className="max-w-3xl mx-auto my-10 print:my-0">
        <p className="print:hidden text-center text-xs text-on-surface-variant mb-6">
          Tamanho real (85,6 × 54 mm) — frente à esquerda, verso à direita. Recorte pela borda depois de imprimir.
        </p>
        <div className="flex justify-center">
          <CartaoEstudante aluno={aluno} escola={escola} />
        </div>
      </div>
    </div>
  )
}
