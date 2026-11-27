# Migração do sistema antigo → SIGE · Liceu Valério Samuel (escola_id 6)

Executada em **27/11/2026**. Implementação real do SIGE no Liceu: tudo o que existia
na escola 6 era de teste e foi substituído por dados do backup do sistema antigo.

## Origem dos dados

Backup MySQL do sistema antigo (offline, XAMPP/Workbench), BD `sisge_cade_lichinga`,
um ficheiro `.sql` por tabela (pasta "BASE DE DADOS RECENTE NOVEMBRO 2026").

O sistema antigo servia **duas escolas sem separação** (CADA-PS, primário, e o Liceu).
Regra seguida: só entra no SIGE o que é **evidentemente do Liceu**; o resto fica pendente.

- Alunos do Liceu = `tbl_aluno.vaga_FK = 13962` (classe "SETIMA CLASSE LICEU 2026") → 81, menos 2 registos de teste (`EDGAG`, `mm`) = **79**.
- Pagamentos: só **2026** e só destes 79 alunos (`tbl_mensalidade` + `tbl_pagamento_entrada_alunos`). Os anteriores são do tempo em que estavam no primário (CADA).
- Funcionários: só os 3 com "Liceu" no nome (`tbl_professor`).

## O que foi feito na base de dados (Supabase)

**Apagado (dados de teste da escola 6):** alunos e contas de aluno, classes, turmas, salas,
disciplinas, taxas, avaliações, períodos lectivos, planos de propinas/curriculares,
cargos, departamentos, notificações (e, em cascata, notas, presenças, matrículas, cobranças, pagamentos).

**Mantido:** registo da escola; director José Valério Samuel (LVS.DIR.001) com ficha,
contrato e salários; `financeiro_configuracao`, `rh_configuracao`, `auditoria_log`.

**Criado a partir do backup:**

| Item | Detalhe |
|---|---|
| Classe | 7ª Classe (Secundário) |
| Sala | SALA 1 (código SS1, 100 lugares) |
| Turma | A — Tarde — 2026 — capacidade 100 |
| Alunos | 79, matrícula `6-2026-0001…0079`, todos matriculados na Turma A (`MAT-2026-00001…`) |
| Contas de aluno | `LVS.EST.0001…0079`, senha inicial = data de nascimento DDMMAAAA (ou `sige2024` sem data) |
| Taxas | 14 (Mensalidade 2085 + 13 referências pagas pelos alunos do Liceu em 2026), `sujeito_iva = nao` |
| Pagamentos | 999 confirmados (558 mensalidades + 441 outros) = **1 539 476,00 MT**, cada um com cobrança "pago", recibo `REC-2026-NNNNN`, referência e observação com a conta e quem registou no sistema antigo |
| Contas dos alunos | 79 linhas em `contas_alunos` (2026), total pago = total cobrado |
| Funcionários | Guarda Liceu, Omar Liceu, Feliciano LICEU (cargo CTA, 6000,06 MT, E-Mola) |

### Mapeamento de campos do aluno

| Sistema antigo | SIGE |
|---|---|
| nome, sexo, bilhete, nomePai, nomeMae | nome, genero, bi, nome_pai, nome_mae |
| numero_1 (+ numero_2) | tel_encarregado (o 1.º) / telefone (ambos) |
| bairro, rua, nrCasa, cidade | endereco |
| provincia | naturalidade |
| pai (ou mãe se "Incognito") | nome_encarregado |
| estado Activo/Inativo | status activo/inactivo |

Limpezas: datas de nascimento impossíveis para a 7ª classe (fora de 1995–2016) ficaram vazias (27);
sexo claramente trocado ficou vazio (4); acentos corrompidos no backup (`�`) corrigidos por dicionário.

## Pendente (aguarda confirmação)

1. 77 funcionários do backup sem escola definida — lista para marcar `LVS_funcionarios_PENDENTES_confirmar.csv`.
2. Disciplinas do Liceu (não existem no backup).
3. Plano de mensalidades no Financeiro (o backup só tem o que foi pago — dívida actual aparece 0).
4. 27 possíveis pagamentos duplicados (mesmo aluno/item/dia), importados tal como no backup.
5. Os 3 funcionários "Liceu" parecem registos genéricos (nascimento 1898); folhas de salário não importadas.
6. Completar fichas: 27 datas de nascimento, 4 sexos, BI curtos que parecem cédula.

## Scripts (ordem de execução)

Os dados (dump, ficheiros JSON intermédios, cópias de segurança, CSV com senhas) **não estão no git**
por conterem dados pessoais e hashes de senha.

1. `parse_mysql_dump.py` — leitor de `INSERT INTO ... VALUES` de dumps MySQL (usado pelos outros).
2. `match.py` + `01_preparar_alunos.py <pasta_trabalho> <pasta_backup>` — mapeia/limpa os alunos → `plano.json`
   (na 1.ª fase cruzava com os alunos de teste existentes; para a reconstrução usa-se `plano_final.json` com todos os 79).
3. `02_preparar_reconstrucao.py <pasta_trabalho> <pasta_backup>` — gera `rebuild.json` (alunos, taxas, pagamentos, funcionários).
4. `03_reconstruir_lvs.js <backend> <rebuild.json> <copia_seguranca.json> [commit]`
   — sem `commit` faz dry-run (executa e reverte). Corre tudo **num único bloco `DO` no servidor**
   (atómico) porque a ligação ao Supabase cai em transacções longas com muitas idas e voltas.

Cópia de segurança do estado anterior: `SIGE/backups/lvs_escola6_completo_antes_reconstrucao_20261127.json` (fora do repositório).
