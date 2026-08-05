function getInitials(nome = '') {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function fmtData(d) {
  return d ? new Date(d).toLocaleDateString('pt-MZ') : '—'
}

// Validade = fim do ano lectivo da matrícula actual do aluno (31 de Dezembro
// do ano_lectivo) -- o calendário escolar em Moçambique coincide com o ano
// civil, por isso não é preciso guardar uma data de validade à parte.
function validade(anoLectivo) {
  if (!anoLectivo) return '—'
  return `31/12/${anoLectivo}`
}

function Frente({ aluno, escola }) {
  return (
    <div className="cartao-face" style={{ background: '#fbf9f5' }}>
      <div className="cartao-band" style={{ background: escola?.cor_principal || '#1a2b4b' }}>
        <div className="cartao-logo">
          {escola?.logo
            ? <img src={escola.logo} alt="" />
            : <span>{escola?.sigla || 'SIGE'}</span>}
        </div>
        <div className="cartao-band-text">
          <div className="cartao-school">{escola?.nome || 'Escola'}</div>
          <div className="cartao-doc-title" style={{ color: escola?.cor_secundaria || '#fdbc13' }}>Cartão de Estudante</div>
        </div>
        <div className="cartao-band-accent" style={{ background: escola?.cor_secundaria || '#fdbc13' }} />
      </div>

      <div className="cartao-body">
        <div className="cartao-photo">
          {aluno?.foto
            ? <img src={aluno.foto} alt="" />
            : <span>{getInitials(aluno?.nome)}</span>}
        </div>
        <div className="cartao-fields">
          <div className="cartao-nome">{aluno?.nome || '—'}</div>
          <div className="cartao-field-row">
            <div className="cartao-field"><label>Classe</label><span>{aluno?.classe_nome || '—'}</span></div>
            <div className="cartao-field"><label>Turma</label><span>{aluno?.turma_nome || '—'}</span></div>
          </div>
          <div className="cartao-field-row">
            <div className="cartao-field"><label>Período</label><span>{aluno?.turno || '—'}</span></div>
            <div className="cartao-field"><label>Sala</label><span>{aluno?.sala_nome || '—'}</span></div>
          </div>
          <div className="cartao-field-row">
            <div className="cartao-field"><label>Validade</label><span>{validade(aluno?.ano_lectivo)}</span></div>
          </div>
        </div>
      </div>

      <div className="cartao-footer">
        <div>
          <label>Código de acesso</label>
          <div className="cartao-code" style={{ color: escola?.cor_principal || '#1a2b4b' }}>{aluno?.codigo_acesso || '—'}</div>
        </div>
      </div>
    </div>
  )
}

function Verso({ aluno, escola }) {
  return (
    <div className="cartao-face" style={{ background: '#fbf9f5' }}>
      <div className="cartao-band cartao-band--verso" style={{ background: escola?.cor_principal || '#1a2b4b' }}>
        <div className="cartao-logo cartao-logo--sm">
          {escola?.logo
            ? <img src={escola.logo} alt="" />
            : <span>{escola?.sigla || 'SIGE'}</span>}
        </div>
        <div className="cartao-band-text">
          <div className="cartao-school cartao-school--sm">{escola?.nome || 'Escola'}</div>
        </div>
        <div className="cartao-band-accent" style={{ background: escola?.cor_secundaria || '#fdbc13' }} />
      </div>

      <div className="cartao-verso-body">
        <p className="cartao-intransmissivel">Intransmissível</p>
        <p className="cartao-verso-texto">
          Este cartão é propriedade da <strong>{escola?.nome || 'escola'}</strong>. Caso o localize, queira
          por favor entregá-lo na nossa instituição ou ligar: <strong>{escola?.contacto || '—'}</strong>.
        </p>
      </div>

      <div className="cartao-footer cartao-footer--center">
        <span className="cartao-emitido">Ano lectivo {aluno?.ano_lectivo || '—'} · Nº {aluno?.numero_matricula || '—'}</span>
      </div>
    </div>
  )
}

// Cartão de estudante — frente e verso, à escala real de um cartão CR80
// (85,6 × 54 mm), a mesma proporção de um cartão bancário. As cores vêm
// sempre da configuração da escola (cor_principal / cor_secundaria), nunca
// fixas no componente.
export default function CartaoEstudante({ aluno, escola }) {
  return (
    <div className="cartao-par">
      <Frente aluno={aluno} escola={escola} />
      <Verso aluno={aluno} escola={escola} />

      <style>{`
        .cartao-par {
          display: flex;
          gap: 8mm;
          flex-wrap: wrap;
        }
        .cartao-face {
          width: 85.6mm;
          height: 53.98mm;
          border-radius: 3mm;
          overflow: hidden;
          position: relative;
          box-shadow: 0 1px 2px rgba(15,26,46,0.10), 0 6px 16px -6px rgba(15,26,46,0.28);
          font-family: -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          color: #1c2333;
          break-inside: avoid;
        }
        .cartao-band {
          height: 17mm;
          display: flex;
          align-items: center;
          gap: 3mm;
          padding: 0 4mm;
          position: relative;
        }
        .cartao-band--verso { height: 13mm; }
        .cartao-band-accent { position: absolute; left: 0; right: 0; bottom: 0; height: 0.8mm; }
        .cartao-logo {
          width: 10mm; height: 10mm;
          border-radius: 50%;
          background: #fbf9f5;
          border: 0.4mm solid rgba(255,255,255,0.85);
          flex: 0 0 auto;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          font-weight: 800; font-size: 3mm; color: #1a2b4b;
        }
        .cartao-logo--sm { width: 7mm; height: 7mm; font-size: 2.2mm; }
        .cartao-logo img { width: 100%; height: 100%; object-fit: cover; }
        .cartao-band-text { min-width: 0; }
        .cartao-school {
          font-size: 3.1mm; font-weight: 700; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cartao-school--sm { font-size: 2.6mm; }
        .cartao-doc-title {
          font-size: 2.2mm; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; margin-top: 0.4mm;
        }
        .cartao-body { display: flex; gap: 3mm; padding: 3mm 4mm 0; }
        .cartao-photo {
          width: 18mm; height: 22mm;
          border-radius: 1.4mm;
          background: linear-gradient(160deg, #c9d2e3, #a9b6cf);
          border: 0.25mm solid rgba(26,43,75,0.18);
          flex: 0 0 auto;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          font-size: 4.5mm; font-weight: 800; color: #ffffffcc;
        }
        .cartao-photo img { width: 100%; height: 100%; object-fit: cover; }
        .cartao-fields { min-width: 0; padding-top: 0.4mm; flex: 1; }
        .cartao-nome {
          font-size: 3.4mm; font-weight: 800; line-height: 1.2; margin-bottom: 1.6mm;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cartao-field-row { display: flex; gap: 3.5mm; margin-bottom: 1.4mm; }
        .cartao-field label {
          display: block; font-size: 1.9mm; font-weight: 700; letter-spacing: 0.05em;
          text-transform: uppercase; color: #8a93a6; margin-bottom: 0.2mm;
        }
        .cartao-field span { display: block; font-size: 2.7mm; font-weight: 600; }
        .cartao-footer {
          position: absolute; left: 0; right: 0; bottom: 0; height: 10mm;
          background: #f1ede3; border-top: 0.2mm dashed rgba(26,43,75,0.15);
          display: flex; align-items: center; padding: 0 4mm;
        }
        .cartao-footer--center { justify-content: center; }
        .cartao-footer label {
          display: block; font-size: 1.8mm; font-weight: 700; letter-spacing: 0.05em;
          text-transform: uppercase; color: #8a93a6;
        }
        .cartao-code {
          font-family: ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace;
          font-size: 3.3mm; font-weight: 700; letter-spacing: 0.02em;
        }
        .cartao-verso-body { padding: 4mm 5mm 0; text-align: center; }
        .cartao-intransmissivel {
          font-size: 3mm; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
          color: #96700a; margin: 0 0 1.6mm;
        }
        .cartao-verso-texto { font-size: 2.5mm; line-height: 1.5; color: #5b6478; margin: 0; }
        .cartao-verso-texto strong { color: #1c2333; }
        .cartao-emitido { font-size: 2mm; color: #8a93a6; letter-spacing: 0.02em; }
      `}</style>
    </div>
  )
}
