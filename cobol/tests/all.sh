#!/usr/bin/env bash
# Roda todas as baterias do nucleo COBOL. Exit != 0 se qualquer uma falhar.
set -uo pipefail
rc=0
bash "$(dirname "$0")/casos_amortizacao.sh" || rc=1
echo
bash "$(dirname "$0")/casos_transacoes.sh"  || rc=1
exit $rc
