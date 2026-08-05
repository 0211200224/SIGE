import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../../services/api'
import { useAuth } from '../../../contexts/AuthContext'
import ReciboImpressao from '../../../components/recibo/ReciboImpressao'

export default function ImprimirReciboEstudante() {
  const { id } = useParams()
  const { escola } = useAuth()
  const [recibo, setRecibo] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    // estudante.controller devolve { data: ... } — ao contrario do financeiro.
    api.get(`/estudante/recibos/${id}`).then(r => setRecibo(r.data)).catch(err => setErro(err.message))
  }, [id])

  if (erro) return (
    <div className="p-10 text-center text-on-surface-variant">
      <p className="font-medium">{erro}</p>
      <p className="text-sm mt-1">Só é possível ver recibos dos teus próprios pagamentos já confirmados.</p>
    </div>
  )
  if (!recibo) return (
    <div className="flex justify-center py-20"><span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span></div>
  )

  return <ReciboImpressao recibo={recibo} escola={escola} backTo="/estudante/financeiro" backLabel="Voltar ao financeiro" />
}
