package com.portfolio.banco.cofrinho;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/** Cofrinhos (caixinhas) de uma conta. */
@RestController
public class CofrinhoController {

    private final CofrinhoService service;

    public CofrinhoController(CofrinhoService service) {
        this.service = service;
    }

    @GetMapping("/contas/{contaId}/cofrinhos")
    public List<CofrinhoResponse> listar(@PathVariable Long contaId) {
        return service.listar(contaId).stream().map(CofrinhoResponse::de).toList();
    }

    @PostMapping("/contas/{contaId}/cofrinhos")
    public CofrinhoResponse criar(@PathVariable Long contaId, @Valid @RequestBody CriarRequest req) {
        return CofrinhoResponse.de(service.criar(contaId, req.nome(), req.meta()));
    }

    @PostMapping("/cofrinhos/{id}/guardar")
    public CofrinhoResponse guardar(@PathVariable Long id, @Valid @RequestBody MovimentoRequest req) {
        return CofrinhoResponse.de(service.guardar(id, req.valor()));
    }

    @PostMapping("/cofrinhos/{id}/resgatar")
    public CofrinhoResponse resgatar(@PathVariable Long id, @Valid @RequestBody MovimentoRequest req) {
        return CofrinhoResponse.de(service.resgatar(id, req.valor()));
    }

    // --- DTOs ---
    public record CriarRequest(
            @NotBlank @Size(max = 60) String nome,
            @NotNull @DecimalMin("0.0") @DecimalMax("9999999999999.99")
            @Digits(integer = 13, fraction = 2) BigDecimal meta) {}

    public record MovimentoRequest(
            @NotNull @DecimalMin("0.01") @DecimalMax("9999999999999.99")
            @Digits(integer = 13, fraction = 2) BigDecimal valor) {}

    public record CofrinhoResponse(Long id, Long contaId, String nome, BigDecimal meta,
                                   BigDecimal saldo, BigDecimal saldoConta) {
        static CofrinhoResponse de(Cofrinho c) {
            return new CofrinhoResponse(c.getId(), c.getConta().getId(), c.getNome(),
                    c.getMeta(), c.getSaldo(), c.getConta().getSaldo());
        }
    }
}
