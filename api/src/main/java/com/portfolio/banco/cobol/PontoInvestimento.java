package com.portfolio.banco.cobol;

import java.math.BigDecimal;

/** Um mês da evolução do investimento (saldo bruto acumulado e rendimento acumulado). */
public record PontoInvestimento(
        int mes,
        BigDecimal saldoBruto,
        BigDecimal rendimentoAcumulado) {
}
