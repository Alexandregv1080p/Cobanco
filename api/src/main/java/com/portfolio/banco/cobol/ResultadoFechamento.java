package com.portfolio.banco.cobol;

import java.math.BigDecimal;
import java.util.List;

/** Retorno do batch de fechamento: linhas por conta + totais do trailer. */
public record ResultadoFechamento(
        int contasProcessadas,
        BigDecimal totalJuros,
        int divergencias,
        List<LinhaFechamento> linhas) {
}
