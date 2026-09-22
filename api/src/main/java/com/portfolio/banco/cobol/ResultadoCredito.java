package com.portfolio.banco.cobol;

import java.math.BigDecimal;
import java.util.List;

/** Resultado da análise de crédito calculada pelo núcleo COBOL (CREDITO.COB). */
public record ResultadoCredito(
        int score,
        String decisao,          // APROVADO | REVISAR | NEGADO
        String faixa,            // A | B | C | D
        BigDecimal taxaSugerida, // fração a.m.
        BigDecimal limiteSugerido,
        BigDecimal comprometimento, // parcela estimada / renda
        BigDecimal parcelaEstimada,
        BigDecimal capacidade,      // teto de crédito pela renda
        List<FatorScore> fatores) {
}
