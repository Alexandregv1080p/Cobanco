#!/usr/bin/env bash
# Bateria de testes do motor de amortizacao.
# Saida agora: linha 1 = RESUMO;... ; demais linhas = parcelas.
# Testa invariantes (saldo fecha em 0.00, soma amort = principal,
# parcela fixa no Price) + custos regulatorios (IOF, CET).
set -uo pipefail
BIN=amortizacao
fail=0

check() { # descricao  obtido  esperado
  if [ "$2" = "$3" ]; then echo "PASS: $1"; else echo "FAIL: $1  (esperado '$3', veio '$2')"; fail=1; fi
}
maior() { awk -v a="$1" -v b="$2" 'BEGIN{print (a+0>b+0)?"sim":"nao"}'; }
maiorig() { awk -v a="$1" -v b="$2" 'BEGIN{print (a+0>=b+0)?"sim":"nao"}'; }

echo "== PRICE: 100000, 1.5%/mes, 12x =="
out=$(echo "100000.00;0.015;12;PRICE" | $BIN); echo "$out"
res=$(echo "$out" | head -1); parc=$(echo "$out" | tail -n +2)
check "PRICE resumo presente"    "$(echo "$res" | cut -d';' -f1)" "RESUMO"
check "PRICE 12 parcelas"        "$(echo "$parc" | wc -l | tr -d ' ')" "12"
check "PRICE juros[1]=1500.00"   "$(echo "$parc" | head -1 | cut -d';' -f3)" "1500.00"
check "PRICE saldo final 0.00"   "$(echo "$parc" | tail -1 | cut -d';' -f5)" "0.00"
check "PRICE soma amort=principal" \
      "$(echo "$parc" | awk -F';' '{s+=$4} END{printf "%.2f", s}')" "100000.00"
check "PRICE parcela fixa (1==11)" \
      "$(echo "$parc" | head -1 | cut -d';' -f2)" "$(echo "$parc" | sed -n '11p' | cut -d';' -f2)"
check "PRICE IOF>0"              "$(maior "$(echo "$res" | cut -d';' -f3)" 0)" "sim"
check "PRICE CET mensal>=taxa"   "$(maiorig "$(echo "$res" | cut -d';' -f4)" 0.015)" "sim"

echo "== SAC: 100000, 1.5%/mes, 12x =="
out=$(echo "100000.00;0.015;12;SAC" | $BIN); parc=$(echo "$out" | tail -n +2)
check "SAC amort[1]=8333.33"     "$(echo "$parc" | head -1 | cut -d';' -f4)" "8333.33"
check "SAC saldo final 0.00"     "$(echo "$parc" | tail -1 | cut -d';' -f5)" "0.00"
check "SAC soma amort=principal" \
      "$(echo "$parc" | awk -F';' '{s+=$4} END{printf "%.2f", s}')" "100000.00"

echo "== AMERICANO: 100000, 1.5%/mes, 12x =="
out=$(echo "100000.00;0.015;12;AMERICANO" | $BIN); echo "$out"; parc=$(echo "$out" | tail -n +2)
check "AMER juros[1]=1500.00"      "$(echo "$parc" | head -1 | cut -d';' -f3)" "1500.00"
check "AMER juros[11]=1500.00"     "$(echo "$parc" | sed -n '11p' | cut -d';' -f3)" "1500.00"
check "AMER amort[1]=0.00"         "$(echo "$parc" | head -1 | cut -d';' -f4)" "0.00"
check "AMER saldo[1]=100000.00"    "$(echo "$parc" | head -1 | cut -d';' -f5)" "100000.00"
check "AMER parcela final=101500.00" "$(echo "$parc" | tail -1 | cut -d';' -f2)" "101500.00"
check "AMER amort final=100000.00" "$(echo "$parc" | tail -1 | cut -d';' -f4)" "100000.00"
check "AMER saldo final 0.00"      "$(echo "$parc" | tail -1 | cut -d';' -f5)" "0.00"

echo "== Taxa zero: 1000, 0%, 10x PRICE =="
out=$(echo "1000.00;0;10;PRICE" | $BIN); parc=$(echo "$out" | tail -n +2)
check "i=0 parcela[1]=100.00"    "$(echo "$parc" | head -1 | cut -d';' -f2)" "100.00"
check "i=0 juros[1]=0.00"        "$(echo "$parc" | head -1 | cut -d';' -f3)" "0.00"
check "i=0 saldo final 0.00"     "$(echo "$parc" | tail -1 | cut -d';' -f5)" "0.00"

echo "== Validacoes =="
check "erro sistema invalido" "$(echo "1000;0.01;12;XPTO" | $BIN)" "ERRO;sistema deve ser PRICE, SAC ou AMERICANO"
check "erro valor zero"       "$(echo "0;0.01;12;PRICE" | $BIN | cut -d';' -f1)" "ERRO"
check "erro prazo>360"        "$(echo "1000;0.01;400;PRICE" | $BIN | cut -d';' -f1)" "ERRO"

echo "==============================="
if [ "$fail" -eq 0 ]; then echo "AMORTIZACAO: TODOS OS TESTES PASSARAM"; else echo "AMORTIZACAO: HOUVE FALHAS"; fi
exit $fail
