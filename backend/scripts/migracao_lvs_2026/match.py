import sys, json, unicodedata, re, difflib
sys.path.insert(0, sys.argv[1])
from parse_mysql_dump import load

SP = sys.argv[1]
D = sys.argv[2] + '/sisge_cade_lichinga_'
old = [x for x in load(D + 'tbl_aluno.sql', 'tbl_aluno') if x['vaga_FK'] == '13962']
new = json.load(open(SP + '/existentes.json', encoding='utf8'))


def norm(s):
    s = (s or '').replace('�', '')
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z ]', ' ', s)).strip()


def score(a, b):
    na, nb = norm(a), norm(b)
    r = difflib.SequenceMatcher(None, na, nb).ratio()
    ta, tb = set(na.split()), set(nb.split())
    j = len(ta & tb) / max(1, min(len(ta), len(tb)))
    return max(r, j * 0.95), r, j


pairs = []
for n in new:
    best = max(old, key=lambda o: score(o['nome'], n['nome'])[0])
    s = score(best['nome'], n['nome'])
    pairs.append((round(s[0], 2), n['id'], n['nome'].strip(), best['codigo'], best['nome'].strip(), n.get('turma')))
for p in sorted(pairs):
    print(p)
