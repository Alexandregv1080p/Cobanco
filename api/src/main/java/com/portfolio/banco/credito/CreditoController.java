package com.portfolio.banco.credito;

import com.portfolio.banco.cobol.CobolGateway;
import com.portfolio.banco.cobol.ResultadoCredito;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

/**
 * Análise de crédito: delega ao núcleo COBOL (CREDITO.COB) o cálculo do
 * score, da decisão (APROVADO/REVISAR/NEGADO) e do limite sugerido.
 * Motor de regras — não persiste.
 */
@RestController
@RequestMapping("/credito")
public class CreditoController {

    private final CobolGateway cobol;

    public CreditoController(CobolGateway cobol) {
        this.cobol = cobol;
    }

    @PostMapping("/analisar")
    public ResultadoCredito analisar(@Valid @RequestBody AnaliseRequest req) {
        return cobol.analisarCredito(req.renda(), req.valor(), req.prazoMeses(), req.saldoMedio());
    }

    public record AnaliseRequest(
            @NotNull @DecimalMin("0.01") @DecimalMax("9999999999999.99")
            @Digits(integer = 13, fraction = 2) BigDecimal renda,
            @NotNull @DecimalMin("0.01") @DecimalMax("9999999999999.99")
            @Digits(integer = 13, fraction = 2) BigDecimal valor,
            @NotNull @Min(1) @Max(360) Integer prazoMeses,
            @NotNull @DecimalMin("0.0") @DecimalMax("9999999999999.99")
            @Digits(integer = 13, fraction = 2) BigDecimal saldoMedio) {}
}
