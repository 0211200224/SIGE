// Abrir ficheiros guardados como base64 (data: URI) numa nova aba.
// Navegar directamente para um "data:" URI (via <a href> ou location.href)
// é bloqueado pelo Chrome/Edge por segurança (mostra uma aba em branco
// com o título "Blocked"), especialmente para PDFs. A forma correcta é
// converter para um Blob e abrir o seu URL temporário (blob:), que não
// sofre essa restrição e ainda mostra o visualizador nativo do browser.
export function abrirFicheiroBase64(dataUri, janelaExistente) {
  if (!dataUri) {
    if (janelaExistente) janelaExistente.close()
    return
  }
  const [cabecalho, base64] = dataUri.split(',')
  const mimeMatch = cabecalho.match(/data:(.*?);base64/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })
  const url = URL.createObjectURL(blob)

  if (janelaExistente && !janelaExistente.closed) {
    janelaExistente.location.href = url
  } else {
    window.open(url, '_blank')
  }
  // Dar tempo ao browser para carregar o blob antes de libertar a memória.
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
