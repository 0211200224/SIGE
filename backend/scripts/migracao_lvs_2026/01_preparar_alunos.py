import sys, json, re, csv
sys.path.insert(0, sys.argv[1])
from parse_mysql_dump import load
from match import norm, score, old, new  # noqa (match.py prints pairs on import)

SP = sys.argv[1]
TEST_IDS = {'100551', '100552'}  # EDGAG / mm -- registos de teste

FIX = {
    'C�ssimo': 'Cássimo', 'Jo�o': 'João', 'Inoc�ncio': 'Inocêncio',
    'Eus�bio': 'Eusébio', 'Anast�ncio': 'Anastâncio', 'L�cia': 'Lúcia',
    'Ven�ncio': 'Venâncio', 'Ant�nio': 'António', 'Tom�s': 'Tomás',
    'Oct�via': 'Octávia', 'Juv�ncio': 'Juvêncio', 'Andr�': 'André',
    'Lu�sa': 'Luísa', 'Lu�s': 'Luís', 'Eul�lia': 'Eulália',
}


def clean(s):
    if s is None:
        return None
    for k, v in FIX.items():
        s = s.replace(k, v)
    s = re.sub(r'\s+', ' ', s).strip()
    return s or None


def title(s):
    s = clean(s)
    return s.title() if s and s.isupper() else s


issues = []


def data_nasc(o):
    d = o['dataNascimento']
    y = int(d[:4])
    if y < 1995 or d > '2016-12-31':
        issues.append((o['nome'], 'data de nascimento implausível para 7ª classe: %s (deixada vazia)' % d))
        return None
    return d


def bi(o):
    b = clean(o['bilhete'])
    if not b or set(b) <= {'0'}:
        return None
    return b.upper()


def tel(o):
    n = [clean(o['numero_1']), clean(o['numero_2'])]
    n = [x for x in n if x and len(re.sub(r'\D', '', x)) >= 9]
    return n


def endereco(o):
    parts = []
    b = title(o['bairro'])
    if b:
        parts.append('Bairro ' + b)
    if clean(o['rua']):
        parts.append('Rua ' + clean(o['rua']))
    if clean(o['nrCasa']):
        parts.append('Casa ' + clean(o['nrCasa']))
    c = clean(o['cidade']) or 'Lichinga'
    parts.append(c)
    return ', '.join(parts)


def encarregado(o):
    pai, mae = clean(o['nomePai']), clean(o['nomeMae'])
    if pai and pai.lower() not in ('incognito', 'incógnito'):
        return pai
    return mae


def mapear(o):
    t = tel(o)
    if any('�' in (clean(o[k]) or '') for k in ('nome', 'nomePai', 'nomeMae')):
        issues.append((o['nome'], 'ainda tem caracteres corrompidos no backup'))
    return {
        'nome': clean(o['nome']),
        'data_nascimento': data_nasc(o),
        'genero': 'M' if o['sexo'].startswith('M') else 'F',
        'naturalidade': title(o['provincia']) if (clean(o['provincia']) or '').upper() != 'MOCAMBIQUE' else None,
        'nacionalidade': 'Moçambicana',
        'bi': bi(o),
        'nome_pai': clean(o['nomePai']),
        'nome_mae': clean(o['nomeMae']),
        'telefone': ' / '.join(t)[:30] if t else None,
        'email': clean(o['e_mail']),
        'endereco': endereco(o),
        'turno': 'Tarde',
        'ano_lectivo': '2026',
        'nome_encarregado': encarregado(o),
        'tel_encarregado': t[0] if t else None,
        'status': 'activo' if o['estado'] == 'Activo' else 'inactivo',
        '_old_id': o['codigo'],
    }


matched_old = set()
updates = []
for n in new:
    best = max(old, key=lambda o: score(o['nome'], n['nome'])[0])
    if score(best['nome'], n['nome'])[0] < 0.75 or best['codigo'] in TEST_IDS:
        continue
    matched_old.add(best['codigo'])
    m = mapear(best)
    # so preenche campos vazios; nunca sobrescreve nome/genero/status/turma ja definidos
    patch = {k: v for k, v in m.items()
             if not k.startswith('_') and k not in ('nome', 'status', 'ano_lectivo')
             and v not in (None, '') and n.get(k) in (None, '')}
    updates.append({'id': n['id'], 'nome': n['nome'].strip(), 'old': best['codigo'], 'patch': patch})

inserts = [mapear(o) for o in old if o['codigo'] not in matched_old and o['codigo'] not in TEST_IDS]
inserts.sort(key=lambda x: norm(x['nome']))

json.dump({'updates': updates, 'inserts': inserts}, open(SP + '/plano.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)

cols = ['acao', 'nome', 'genero', 'data_nascimento', 'bi', 'nome_pai', 'nome_mae', 'nome_encarregado',
        'tel_encarregado', 'telefone', 'endereco', 'naturalidade', 'status']
with open(SP + '/previsao_importacao_LVS.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(cols)
    for u in updates:
        w.writerow(['COMPLETAR (id %s)' % u['id'], u['nome']] + [u['patch'].get(c, '') for c in cols[2:]])
    for i in inserts:
        w.writerow(['NOVO'] + [i.get(c) or '' for c in cols[1:]])

print('\n=== updates', len(updates), ' inserts', len(inserts))
for x in inserts:
    print('NOVO', x['nome'], x['genero'], x['data_nascimento'], x['bi'], x['status'])
print('\n=== problemas')
for i in issues:
    print(i)
