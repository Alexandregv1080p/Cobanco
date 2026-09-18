package com.portfolio.banco.transacao;

import com.portfolio.banco.cobol.ResultadoTransferencia;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/contas/{id}")
public class TransacaoController {

    private final TransacaoService service;

    public TransacaoController(TransacaoService service) {
        this.service = service;
    }

    @PostMapping("/deposito")
    public SaldoResponse deposito(@PathVariable Long id, @Valid @RequestBody DepositoRequest req) {
        return new SaldoResponse(service.deposito(id, req.valor(), req.metodo(), req.detalhe()));
    }

    @PostMapping("/saque")
    public SaldoResponse saque(@PathVariable Long id, @Valid @RequestBody SaqueRequest req) {
        return new SaldoResponse(service.saque(id, req.valor(), req.metodo(), req.detalhe()));
    }

    @PostMapping("/transferencia")
    public TransferenciaResponse transferencia(@PathVariable Long id,
                                               @Valid @RequestBody TransferenciaRequest req) {
        ResultadoTransferencia r = service.transferencia(id, req.contaDestinoId(), req.valor(),
                req.metodo(), req.detalhe());
        return new TransferenciaResponse(r.novoSaldoOrigem(), r.novoSaldoDestino());
    }

    @GetMapping("/extrato")
    public List<ExtratoItem> extrato(@PathVariable Long id) {
        return service.extrato(id).stream().map(ExtratoItem::de).toList();
    }

    // --- DTOs ---
    public record DepositoRequest(
            @NotNull @DecimalMin("0.01") @DecimalMax("9999999999999.99")
            @Digits(integer = 13, fraction = 2) BigDecimal valor,
            @Pattern(regexp = "PIX|BOLETO|CARTAO|ESPECIE", message = "metodo invalido") String metodo,
            @Size(max = 120) String detalhe) {}

    public record SaqueRequest(
            @NotNull @DecimalMin("0.01") @DecimalMax("9999999999999.99")
            @Digits(integer = 13, fraction = 2) BigDecimal valor,
            @Pattern(regexp = "PIX|TED|ESPECIE", message = "metodo invalido") String metodo,
            @Size(max = 120) String detalhe) {}

    public record TransferenciaRequest(
            @NotNull @Positive Long contaDestinoId,
            @NotNull @DecimalMin("0.01") @DecimalMax("9999999999999.99")
            @Digits(integer = 13, fraction = 2) BigDecimal valor,
            @Pattern(regexp = "PIX|TED|INTERNA", message = "metodo invalido") String metodo,
            @Size(max = 120) String detalhe) {}

    public record SaldoResponse(BigDecimal saldo) {}

    public record TransferenciaResponse(BigDecimal saldoOrigem, BigDecimal saldoDestino) {}

    public record ExtratoItem(
            Long id, String tipo, BigDecimal valor, BigDecimal saldoApos,
            Long contaDestinoId, String metodo, String detalhe, OffsetDateTime data) {
        static ExtratoItem de(Transacao t) {
            return new ExtratoItem(t.getId(), t.getTipo(), t.getValor(),
                    t.getSaldoApos(), t.getContaDestinoId(), t.getMetodo(), t.getDetalhe(), t.getCreatedAt());
        }
    }
}
