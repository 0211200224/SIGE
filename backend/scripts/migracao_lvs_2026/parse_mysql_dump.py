import re

BS = chr(92)
ESC = {'n': '\n', 'r': '\r', 't': '\t', '0': '\0', 'Z': '\x1a'}


def parse_values(s):
    rows = []
    i = 0
    n = len(s)
    while i < n:
        if s[i] == '(':
            i += 1
            row = []
            while True:
                while s[i] in ' ,':
                    i += 1
                if s[i] == ')':
                    i += 1
                    break
                if s[i] == "'":
                    i += 1
                    buf = []
                    while True:
                        c = s[i]
                        if c == BS:
                            nx = s[i + 1]
                            buf.append(ESC.get(nx, nx))
                            i += 2
                            continue
                        if c == "'":
                            if i + 1 < n and s[i + 1] == "'":
                                buf.append("'")
                                i += 2
                                continue
                            i += 1
                            break
                        buf.append(c)
                        i += 1
                    row.append(''.join(buf))
                else:
                    j = i
                    while s[j] not in ',)':
                        j += 1
                    v = s[i:j].strip()
                    row.append(None if v == 'NULL' else v)
                    i = j
            rows.append(row)
        else:
            i += 1
    return rows


def load(path, table):
    txt = open(path, encoding='utf8', errors='replace').read()
    body = txt.split('CREATE TABLE')[1].split('ENGINE')[0].split('\n', 1)[1]
    cols = re.findall(r'^\s+`(\w+)`', body, re.M)
    out = []
    for m in re.finditer(r'INSERT INTO `%s` VALUES (.*?);\n' % table, txt, re.S):
        out += [dict(zip(cols, r)) for r in parse_values(m.group(1))]
    return out
