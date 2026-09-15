package com.portfolio.banco.cobol;

import java.math.BigDecimal;

/** Resultado do fechamento para uma conta, calculado pelo batch COBOL. */
public record LinhaFechamento(
        long contaId,
        BigDecimal juros,
        BigDecimal novoSaldo,
        String reconciliacao) {   // RECON_OK | RECON_DIVERGENTE
}
