package com.portfolio.banco.investimento;

import com.portfolio.banco.cobol.CobolGateway;
import com.portfolio.banco.cobol.PontoInvestimento;
import com.portfolio.banco.cobol.ResultadoInvestimento;
import com.portfolio.banco.simulacao.SimulacaoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Simulador de investimento: delega ao COBOL a capitalizacao composta e o
 * IR regressivo (CDB tributado; Poupanca isenta). Nao persiste.
 */
@RestController
@RequestMapping("/investimentos")
public class InvestimentoController {

    private final CobolGateway cobol;
    private final SimulacaoService historico;

    public InvestimentoController(CobolGateway cobol, SimulacaoService historico) {
        this.cobol = cobol;
        this.historico = historico;
    }

    @PostMapping("/simular")
    public SimulacaoResponse simular(@Valid @RequestBody SimularRequest req) {
        ResultadoInvestimento r = cobol.simularInvestimento(
                req.tipo(), req.valor(), req.taxaMensal(), req.meses());

        historico.registrar("INVESTIMENTO", req.tipo().toUpperCase(), req.valor(),
                req.meses(), req.taxaMensal(), r.valorFinalLiquido(), r.aliquotaIR());

        return new SimulacaoResponse(
                req.tipo().toUpperCase(), req.valor(), req.meses(),
                r.valorFinalBruto(), r.rendimentoBruto(), r.aliquotaIR(),
                r.ir(), r.rendimentoLiquido(), r.valorFinalLiquido(), r.evolucao());
    }

    // --- DTOs ---
    public record SimularRequest(
            @NotBlank @Pattern(regexp = "(?i)CDB|POUPANCA", message = "use CDB ou POUPANCA") String tipo,
            @NotNull @DecimalMin("0.01") @DecimalMax("9999999999999.99")
            @Digits(integer = 13, fraction = 2) BigDecimal valor,
            @NotNull @DecimalMin("0.0") @DecimalMax("1.0")
            @Digits(integer = 1, fraction = 8) BigDecimal taxaMensal,
            @NotNull @Min(1) @Max(360) Integer meses) {}

    public record SimulacaoResponse(
            String tipo, BigDecimal valor, int meses,
            BigDecimal valorFinalBruto, BigDecimal rendimentoBruto, BigDecimal aliquotaIR,
            BigDecimal ir, BigDecimal rendimentoLiquido, BigDecimal valorFinalLiquido,
            List<PontoInvestimento> evolucao) {}
}
