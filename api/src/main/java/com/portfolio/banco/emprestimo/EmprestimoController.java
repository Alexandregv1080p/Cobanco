package com.portfolio.banco.emprestimo;

import com.portfolio.banco.cobol.CobolGateway;
import com.portfolio.banco.cobol.Parcela;
import com.portfolio.banco.cobol.ResultadoSimulacao;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Simulador de emprestimo: delega ao COBOL o calculo da tabela (Price/SAC/
 * Americano) e dos custos regulatorios (IOF e CET). Nao persiste.
 */
@RestController
@RequestMapping("/emprestimos")
public class EmprestimoController {

    private final CobolGateway cobol;

    public EmprestimoController(CobolGateway cobol) {
        this.cobol = cobol;
    }

    @PostMapping("/simular")
    public SimulacaoResponse simular(@Valid @RequestBody SimularRequest req) {
        ResultadoSimulacao r = cobol.amortizar(
                req.valor(), req.taxaMensal(), req.prazoMeses(), req.sistema());

        return new SimulacaoResponse(
                req.sistema().toUpperCase(), req.valor(), req.prazoMeses(),
                r.totalJuros(), r.totalIOF(), r.cetMensal(), r.cetAnual(),
                r.totalPago(), r.parcelas());
    }

    // --- DTOs ---
    public record SimularRequest(
            @NotNull @DecimalMin("0.01") @DecimalMax("9999999999999.99")
            @Digits(integer = 13, fraction = 2) BigDecimal valor,
            @NotNull @DecimalMin("0.0") @DecimalMax("1.0")
            @Digits(integer = 1, fraction = 8) BigDecimal taxaMensal,
            @NotNull @Min(1) @Max(360) Integer prazoMeses,
            @NotBlank @Pattern(regexp = "(?i)PRICE|SAC|AMERICANO",
                    message = "use PRICE, SAC ou AMERICANO") String sistema) {}

    public record SimulacaoResponse(
            String sistema, BigDecimal valor, int prazoMeses,
            BigDecimal totalJuros, BigDecimal totalIOF,
            BigDecimal cetMensal, BigDecimal cetAnual,
            BigDecimal totalPago, List<Parcela> parcelas) {}
}
