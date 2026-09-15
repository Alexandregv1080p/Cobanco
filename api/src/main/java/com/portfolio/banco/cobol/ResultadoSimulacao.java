package com.portfolio.banco.cobol;

import java.math.BigDecimal;
import java.util.List;

/** Simulação completa devolvida pelo COBOL: totais, custos regulatórios e a tabela. */
public record ResultadoSimulacao(
        BigDecimal totalJuros,
        BigDecimal totalIOF,
        BigDecimal cetMensal,
        BigDecimal cetAnual,
        BigDecimal totalPago,
        List<Parcela> parcelas) {
}
