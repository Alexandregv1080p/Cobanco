#!/usr/bin/env bash
# Bateria de testes do motor de transacoes.
set -uo pipefail
BIN=transacoes
fail=0

check() { # descricao  valor_obtido  valor_esperado
  if [ "$2" = "$3" ]; then
    echo "PASS: $1"
  else
    echo "FAIL: $1  (esperado '$3', veio '$2')"
    fail=1
  fi
}

echo "== DEPOSITO =="
check "deposito 100+50"        "$(echo 'DEPOSITO;50.00;100.00;0;0'  | $BIN)" "OK;150.00"
# Decimal exato: 0.10 + 0.20 = 0.30 (float classico daria 0.30000000000000004)
check "deposito decimal exato" "$(echo 'DEPOSITO;0.20;0.10;0;0'     | $BIN)" "OK;0.30"

echo "== SAQUE =="
check "saque ok"               "$(echo 'SAQUE;30.00;100.00;0;0'     | $BIN)" "OK;70.00"
check "saque insuficiente"     "$(echo 'SAQUE;150.00;100.00;0;0'    | $BIN)" "ERRO;saldo insuficiente"
check "saque com cheque esp."  "$(echo 'SAQUE;150.00;100.00;0;100.00' | $BIN)" "OK;-50.00"

echo "== TRANSFERENCIA =="
check "transf ok"              "$(echo 'TRANSFERENCIA;80.00;200.00;50.00;0' | $BIN)" "OK;120.00;130.00"
check "transf insuficiente"    "$(echo 'TRANSFERENCIA;80.00;50.00;0;0'      | $BIN)" "ERRO;saldo insuficiente na origem"

echo "== Validacoes =="
check "valor zero"             "$(echo 'DEPOSITO;0;100;0;0'  | $BIN)" "ERRO;valor deve ser maior que zero"
check "operacao invalida"      "$(echo 'FOO;10;100;0;0'      | $BIN | cut -d';' -f1)" "ERRO"

echo "==============================="
if [ "$fail" -eq 0 ]; then echo "TRANSACOES: TODOS OS TESTES PASSARAM"; else echo "TRANSACOES: HOUVE FALHAS"; fi
exit $fail
