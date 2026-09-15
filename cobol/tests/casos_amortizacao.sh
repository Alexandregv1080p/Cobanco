#!/usr/bin/env bash
# Bateria de testes do motor de amortizacao.
# Nao valida o PMT exato na mao: verifica INVARIANTES que precisam
# valer sempre (saldo fecha em 0.00, soma das amortizacoes = principal,
# parcela fixa no PRICE, etc). Robusto a arredondamento.
set -uo pipefail
BIN=amortizacao
fail=0

check() { # descricao  valor_obtido  valor_esperado
  if [ "$2" = "$3" ]; then
    echo "PASS: $1"
  else
    echo "FAIL: $1  (esperado '$3', veio '$2')"
    fail=1
  fi
}

echo "== PRICE: 100000, 1.5%/mes, 12x =="
out=$(echo "100000.00;0.015;12;PRICE" | $BIN)
echo "$out"
check "PRICE 12 parcelas"        "$(echo "$out" | wc -l | tr -d ' ')" "12"
check "PRICE juros[1]=1500.00"   "$(echo "$out" | head -1  | cut -d';' -f3)" "1500.00"
check "PRICE saldo final 0.00"   "$(echo "$out" | tail -1  | cut -d';' -f5)" "0.00"
check "PRICE soma amort=principal" \
      "$(echo "$out" | awk -F';' '{s+=$4} END{printf "%.2f", s}')" "100000.00"
check "PRICE parcela fixa (1==11)" \
      "$(echo "$out" | head -1 | cut -d';' -f2)" \
      "$(echo "$out" | sed -n '11p' | cut -d';' -f2)"

echo "== SAC: 100000, 1.5%/mes, 12x =="
out=$(echo "100000.00;0.015;12;SAC" | $BIN)
echo "$out"
check "SAC amort[1]=8333.33"     "$(echo "$out" | head -1 | cut -d';' -f4)" "8333.33"
check "SAC juros[1]=1500.00"     "$(echo "$out" | head -1 | cut -d';' -f3)" "1500.00"
check "SAC saldo final 0.00"     "$(echo "$out" | tail -1 | cut -d';' -f5)" "0.00"
check "SAC soma amort=principal" \
      "$(echo "$out" | awk -F';' '{s+=$4} END{printf "%.2f", s}')" "100000.00"

echo "== Taxa zero: 1000, 0%, 10x PRICE =="
out=$(echo "1000.00;0;10;PRICE" | $BIN)
echo "$out"
check "i=0 parcela[1]=100.00"    "$(echo "$out" | head -1 | cut -d';' -f2)" "100.00"
check "i=0 juros[1]=0.00"        "$(echo "$out" | head -1 | cut -d';' -f3)" "0.00"
check "i=0 saldo final 0.00"     "$(echo "$out" | tail -1 | cut -d';' -f5)" "0.00"

echo "== Validacoes =="
check "erro sistema invalido" \
      "$(echo "1000;0.01;12;XPTO" | $BIN)" "ERRO;sistema deve ser PRICE ou SAC"
check "erro valor zero" \
      "$(echo "0;0.01;12;PRICE" | $BIN | cut -d';' -f1)" "ERRO"

echo "==============================="
if [ "$fail" -eq 0 ]; then echo "TODOS OS TESTES PASSARAM"; else echo "HOUVE FALHAS"; fi
exit $fail
