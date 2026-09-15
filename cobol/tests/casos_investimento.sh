#!/usr/bin/env bash
# Bateria de testes do simulador de investimento (CDB/Poupanca + IR regressivo).
# Saida: linha 1 = RESUMO;... ; demais = evolucao mensal.
set -uo pipefail
BIN=investimento
fail=0

check() { if [ "$2" = "$3" ]; then echo "PASS: $1"; else echo "FAIL: $1  (esperado '$3', veio '$2')"; fail=1; fi; }
igual() { awk -v a="$1" -v b="$2" 'BEGIN{print (a+0==b+0)?"sim":"nao"}'; }

echo "== CDB 1000, 1%/mes, 12 meses (dias=360 -> IR 20%) =="
out=$(echo "CDB;1000.00;0.01;12" | $BIN); echo "$out"
res=$(echo "$out" | head -1); evo=$(echo "$out" | tail -n +2)
check "CDB resumo presente"    "$(echo "$res" | cut -d';' -f1)" "RESUMO"
check "CDB aliquota 0.200000"  "$(echo "$res" | cut -d';' -f4)" "0.200000"
check "CDB valorFinalBruto"    "$(echo "$res" | cut -d';' -f2)" "1126.84"
check "CDB rendimentoBruto"    "$(echo "$res" | cut -d';' -f3)" "126.84"
check "CDB IR (20% de 126.84)" "$(echo "$res" | cut -d';' -f5)" "25.37"
check "CDB rendimentoLiquido"  "$(echo "$res" | cut -d';' -f6)" "101.47"
check "CDB valorFinalLiquido"  "$(echo "$res" | cut -d';' -f7)" "1101.47"
check "CDB 12 pontos"          "$(echo "$evo" | wc -l | tr -d ' ')" "12"
# consistencia: rendLiq + IR == rendBruto
rb=$(echo "$res"|cut -d';' -f3); ir=$(echo "$res"|cut -d';' -f5); rl=$(echo "$res"|cut -d';' -f6)
check "CDB rendLiq+IR=rendBruto" "$(igual "$(awk -v a="$rl" -v b="$ir" 'BEGIN{printf "%.2f",a+b}')" "$rb")" "sim"

echo "== IR regressivo: faixas por prazo (CDB) =="
check "3 meses -> 22.5%"   "$(echo "CDB;1000;0.01;3"  | $BIN | head -1 | cut -d';' -f4)" "0.225000"
check "12 meses -> 20%"    "$(echo "CDB;1000;0.01;12" | $BIN | head -1 | cut -d';' -f4)" "0.200000"
check "24 meses -> 17.5%"  "$(echo "CDB;1000;0.01;24" | $BIN | head -1 | cut -d';' -f4)" "0.175000"
check "30 meses -> 15%"    "$(echo "CDB;1000;0.01;30" | $BIN | head -1 | cut -d';' -f4)" "0.150000"

echo "== POUPANCA isenta de IR (mesma taxa que CDB) =="
out=$(echo "POUPANCA;1000.00;0.01;12" | $BIN); res=$(echo "$out" | head -1)
check "POUP aliquota 0.000000"  "$(echo "$res" | cut -d';' -f4)" "0.000000"
check "POUP IR = 0.00"          "$(echo "$res" | cut -d';' -f5)" "0.00"
# poupanca: liquido == bruto
check "POUP rendLiq=rendBruto"  "$(igual "$(echo "$res"|cut -d';' -f3)" "$(echo "$res"|cut -d';' -f6)")" "sim"

echo "== Validacoes =="
check "tipo invalido" "$(echo "XPTO;1000;0.01;12" | $BIN)" "ERRO;tipo deve ser CDB ou POUPANCA"
check "valor zero"    "$(echo "CDB;0;0.01;12" | $BIN | cut -d';' -f1)" "ERRO"

echo "==============================="
if [ "$fail" -eq 0 ]; then echo "INVESTIMENTO: TODOS OS TESTES PASSARAM"; else echo "INVESTIMENTO: HOUVE FALHAS"; fi
exit $fail
