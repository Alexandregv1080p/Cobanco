package com.portfolio.banco.emprestimo;

import com.portfolio.banco.cobol.CobolGateway;
import com.portfolio.banco.cobol.Parcela;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/** Simulador de emprestimo: delega o calculo da tabela (Price/SAC) ao COBOL. Nao persiste. */
@RestController
@RequestMapping("/emprestimos")
public class EmprestimoController {

    private final CobolGateway cobol;

    public EmprestimoController(CobolGateway cobol) {
        this.cobol = cobol;
    }

    @PostMapping("/simular")
    public SimulacaoResponse simular(@Valid @RequestBody SimularRequest req) {
        List<Parcela> parcelas = cobol.amortizar(
                req.valor(), req.taxaMensal(), req.prazoMeses(), req.sistema());

        BigDecimal totalJuros = parcelas.stream()
                .map(Parcela::juros).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPago = parcelas.stream()
                .map(Parcela::parcela).reduce(BigDecimal.ZERO, BigDecimal::add);

        return new SimulacaoResponse(
                req.sistema().toUpperCase(), req.valor(), req.prazoMeses(),
                totalJuros, totalPago, parcelas);
    }

    // --- DTOs ---
    public record SimularRequest(
            @NotNull @DecimalMin(value = "0.01") BigDecimal valor,
            @NotNull @DecimalMin(value = "0.0") BigDecimal taxaMensal,
            @NotNull @Min(1) Integer prazoMeses,
            @NotBlank @Pattern(regexp = "(?i)PRICE|SAC", message = "use PRICE ou SAC") String sistema) {}

    public record SimulacaoResponse(
            String sistema, BigDecimal valor, int prazoMeses,
            BigDecimal totalJuros, BigDecimal totalPago, List<Parcela> parcelas) {}
}
