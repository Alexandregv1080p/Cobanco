package com.portfolio.banco.cobol;

import java.math.BigDecimal;
import java.util.List;

/** Simulação de investimento devolvida pelo COBOL: bruto, IR regressivo, líquido e a evolução. */
public record ResultadoInvestimento(
        BigDecimal valorFinalBruto,
        BigDecimal rendimentoBruto,
        BigDecimal aliquotaIR,
        BigDecimal ir,
        BigDecimal rendimentoLiquido,
        BigDecimal valorFinalLiquido,
        List<PontoInvestimento> evolucao) {
}
