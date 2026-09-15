package com.portfolio.banco.cobol;

import java.math.BigDecimal;

public record ResultadoTransferencia(
        BigDecimal novoSaldoOrigem,
        BigDecimal novoSaldoDestino) {
}
