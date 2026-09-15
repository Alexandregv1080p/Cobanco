#!/usr/bin/env bash
# Bateria do batch de fechamento diario (juros de cheque especial + reconciliacao).
set -uo pipefail
BIN=fechamento
fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS: $1"; else echo "FAIL: $1  (esperado '$3', veio '$2')"; fail=1; fi; }

# 3 contas:
#  1: saldo -100, taxa 8%   -> juros 8.00,  novo -108.00, recon OK
#  2: saldo  500 (positivo) -> juros 0.00,  novo  500.00, recon OK
#  3: saldo  -50, taxa 10%  -> juros 5.00,  novo  -55.00, recon DIVERGENTE (razao -40)
out=$(printf '1;-100.00;0.08;-100.00\n2;500.00;0.08;500.00\n3;-50.00;0.10;-40.00\n' | $BIN)
echo "$out"

check "conta1 juros"      "$(echo "$out" | sed -n '1p' | cut -d';' -f2)" "8.00"
check "conta1 novo saldo" "$(echo "$out" | sed -n '1p' | cut -d';' -f3)" "-108.00"
check "conta1 recon"      "$(echo "$out" | sed -n '1p' | cut -d';' -f4)" "RECON_OK"
check "conta2 sem juros"  "$(echo "$out" | sed -n '2p' | cut -d';' -f2)" "0.00"
check "conta2 novo saldo" "$(echo "$out" | sed -n '2p' | cut -d';' -f3)" "500.00"
check "conta3 juros 10%"  "$(echo "$out" | sed -n '3p' | cut -d';' -f2)" "5.00"
check "conta3 divergente" "$(echo "$out" | sed -n '3p' | cut -d';' -f4)" "RECON_DIVERGENTE"

trailer=$(echo "$out" | tail -1)
check "trailer marca"       "$(echo "$trailer" | cut -d';' -f1)" "TOTAL"
check "trailer qtd contas"  "$(echo "$trailer" | cut -d';' -f2)" "3"
check "trailer total juros" "$(echo "$trailer" | cut -d';' -f3)" "13.00"
check "trailer divergencias" "$(echo "$trailer" | cut -d';' -f4)" "1"

echo "==============================="
if [ "$fail" -eq 0 ]; then echo "FECHAMENTO: TODOS OS TESTES PASSARAM"; else echo "FECHAMENTO: HOUVE FALHAS"; fi
exit $fail
