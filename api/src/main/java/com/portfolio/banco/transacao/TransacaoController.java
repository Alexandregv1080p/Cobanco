package com.portfolio.banco.transacao;

import com.portfolio.banco.cobol.ResultadoTransferencia;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
    public SaldoResponse deposito(@PathVariable Long id, @Valid @RequestBody ValorRequest req) {
        return new SaldoResponse(service.deposito(id, req.valor()));
    }

    @PostMapping("/saque")
    public SaldoResponse saque(@PathVariable Long id, @Valid @RequestBody ValorRequest req) {
        return new SaldoResponse(service.saque(id, req.valor()));
    }

    @PostMapping("/transferencia")
    public TransferenciaResponse transferencia(@PathVariable Long id,
                                               @Valid @RequestBody TransferenciaRequest req) {
        ResultadoTransferencia r = service.transferencia(id, req.contaDestinoId(), req.valor());
        return new TransferenciaResponse(r.novoSaldoOrigem(), r.novoSaldoDestino());
    }

    @GetMapping("/extrato")
    public List<ExtratoItem> extrato(@PathVariable Long id) {
        return service.extrato(id).stream().map(ExtratoItem::de).toList();
    }

    // --- DTOs ---
    public record ValorRequest(@NotNull @DecimalMin(value = "0.01") BigDecimal valor) {}

    public record TransferenciaRequest(
            @NotNull Long contaDestinoId,
            @NotNull @DecimalMin(value = "0.01") BigDecimal valor) {}

    public record SaldoResponse(BigDecimal saldo) {}

    public record TransferenciaResponse(BigDecimal saldoOrigem, BigDecimal saldoDestino) {}

    public record ExtratoItem(
            Long id, String tipo, BigDecimal valor, BigDecimal saldoApos,
            Long contaDestinoId, OffsetDateTime data) {
        static ExtratoItem de(Transacao t) {
            return new ExtratoItem(t.getId(), t.getTipo(), t.getValor(),
                    t.getSaldoApos(), t.getContaDestinoId(), t.getCreatedAt());
        }
    }
}
