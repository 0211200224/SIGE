import sys, json, unicodedata
sys.path.insert(0, sys.argv[1])
from parse_mysql_dump import load

SP, D = sys.argv[1], sys.argv[2] + '/sisge_cade_lichinga_'
alunos = json.load(open(SP + '/plano_final.json', encoding='utf8'))['inserts']
L = {a['_old_id'] for a in alunos}

ref = {r['codigo']: r for r in load(D + 'tbl_referencia_pagamento.sql', 'tbl_referencia_pagamento')}
met = {r['codigo']: r for r in load(D + 'tbl_pagamento_metodo.sql', 'tbl_pagamento_metodo')}
mens = [x for x in load(D + 'tbl_mensalidade.sql', 'tbl_mensalidade') if x['aluno_FK'] in L and x['data_Pagamento'] >= '2026-01-01']
outros = [x for x in load(D + 'tbl_pagamento_entrada_alunos.sql', 'tbl_pagamento_entrada_alunos')
          if x['nomeAluno_FK'] in L and x['data_Pagamento'] >= '2026-01-01']

MESES = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']


def mes_num(m):
    m = ''.join(c for c in unicodedata.normalize('NFKD', m.upper()) if not unicodedata.combining(c)).replace('�', '')
    for i, n in enumerate(MESES):
        if m == n or (n == 'MARCO' and m.startswith('MAR') and m.endswith('O') and len(m) <= 5):
            return i + 1
    raise ValueError(m)


def metodo(conta):
    c = met[conta]
    if c['tipoPagamento'] == 'Banco':
        return 'Transferência Bancária'
    return 'M-Pesa' if 'PESA' in c['descricao'].upper() else 'E-Mola'


CAT = {  # categoria/periodicidade por referencia (apenas organizacao no SIGE; nome e valor vem do backup)
    '14488': ('servicos', 'mensal'), '732': ('servicos', 'mensal'),
    '966': ('servicos', 'única'), '742': ('servicos', 'única'),
    '15163': ('administrativo', 'única'), '15177': ('administrativo', 'única'), '733': ('administrativo', 'única'),
    '12999': ('academico', 'única'), '1797': ('academico', 'única'), '744': ('academico', 'única'),
    '743': ('academico', 'única'), '735': ('academico', 'única'), '10': ('outro', 'única'),
}

taxas = [{'key': 'MENS', 'nome': 'Mensalidade', 'valor': '2085.00', 'categoria': 'academico', 'periodicidade': 'mensal', 'classe': True}]
usadas = sorted({x['refPagamento_FK'] for x in outros}, key=lambda k: ref[k]['referencia'])
for k in usadas:
    cat, per = CAT[k]
    taxas.append({'key': k, 'nome': ref[k]['referencia'].strip(), 'valor': ref[k]['valor'], 'categoria': cat, 'periodicidade': per, 'classe': False})


def obs(conta, user):
    c = met[conta]
    return 'Importado do sistema antigo. Conta: %s (%s). Registado por: %s' % (c['descricao'].strip(), c['nrConta'], user)


pags = []
for x in mens:
    pags.append({'old_aluno': x['aluno_FK'], 'taxa': 'MENS', 'valor': x['valor'], 'data': x['data_Pagamento'],
                 'metodo': metodo(x['conta_FK']), 'mes_ref': '2026-%02d' % mes_num(x['mes']),
                 'referencia': 'MENS-%s-SISGE' % x['codigo'], 'obs': obs(x['conta_FK'], x['nome_usuario']), 'ord': int(x['codigo'])})
for x in outros:
    pags.append({'old_aluno': x['nomeAluno_FK'], 'taxa': x['refPagamento_FK'], 'valor': ref[x['refPagamento_FK']]['valor'],
                 'data': x['data_Pagamento'], 'metodo': metodo(x['metodoPagamento_FK']), 'mes_ref': None,
                 'referencia': x['codigoPagamento'], 'obs': obs(x['metodoPagamento_FK'], x['nomeUsuario']), 'ord': int(x['codigo'])})
pags.sort(key=lambda p: (p['data'], p['ord']))

staff = []
for x in load(D + 'tbl_professor.sql', 'tbl_professor'):
    if 'LICEU' not in x['nome'].upper():
        continue
    staff.append({'nome': x['nome'].strip(), 'genero': 'M' if x['sexo'].startswith('M') else 'F', 'bi': x['bilhete'],
                  'telefone': x['numero_1'], 'endereco': 'Bairro %s, %s' % (x['bairro'], x['cidade'].strip()),
                  'banco': x['entidade_bancaria'], 'conta': x['nr_conta'], 'salario': '6000.06',
                  'estado': 'activo' if x['estado'] == 'Activo' else 'inactivo', 'old': x['codigo']})

json.dump({'alunos': alunos, 'taxas': taxas, 'pagamentos': pags, 'staff': staff},
          open(SP + '/rebuild.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
tot = sum(float(p['valor']) for p in pags)
print('alunos', len(alunos), 'taxas', len(taxas), 'pagamentos', len(pags), 'total MT %.2f' % tot, 'staff', len(staff))
import collections
print(collections.Counter(p['mes_ref'] for p in pags if p['mes_ref']))
print(collections.Counter(p['metodo'] for p in pags))
