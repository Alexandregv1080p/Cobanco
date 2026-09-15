package com.portfolio.banco.cobol;

import java.math.BigDecimal;

/** Uma linha da tabela de amortizacao, como devolvida pelo COBOL. */
public record Parcela(
        int numero,
        BigDecimal parcela,
        BigDecimal juros,
        BigDecimal amortizacao,
        BigDecimal saldoDevedor) {
}
