package com.portfolio.banco.conta;

import com.portfolio.banco.cliente.Cliente;
import com.portfolio.banco.cliente.ClienteRepository;
import com.portfolio.banco.common.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/contas")
public class ContaController {

    private final ContaRepository contaRepo;
    private final ClienteRepository clienteRepo;

    public ContaController(ContaRepository contaRepo, ClienteRepository clienteRepo) {
        this.contaRepo = contaRepo;
        this.clienteRepo = clienteRepo;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContaResponse criar(@Valid @RequestBody CriarContaRequest req) {
        Cliente dono = clienteRepo.findById(req.clienteId())
                .orElseThrow(() -> new NotFoundException("cliente " + req.clienteId() + " nao encontrado"));

        Conta c = new Conta();
        c.setCliente(dono);
        c.setNumero(req.numero());
        c.setLimite(req.limite() == null ? BigDecimal.ZERO : req.limite());
        c.setSaldo(BigDecimal.ZERO);
        return ContaResponse.de(contaRepo.save(c));
    }

    @GetMapping
    public List<ContaResponse> listar() {
        return contaRepo.findAll().stream().map(ContaResponse::de).toList();
    }

    @GetMapping("/{id}")
    public ContaResponse buscar(@PathVariable Long id) {
        return ContaResponse.de(achar(id));
    }

    @GetMapping("/{id}/saldo")
    public SaldoResponse saldo(@PathVariable Long id) {
        Conta c = achar(id);
        return new SaldoResponse(c.getNumero(), c.getSaldo());
    }

    private Conta achar(Long id) {
        return contaRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("conta " + id + " nao encontrada"));
    }

    // --- DTOs ---
    public record CriarContaRequest(
            @NotNull Long clienteId,
            @NotBlank String numero,
            @PositiveOrZero BigDecimal limite) {}

    public record ContaResponse(
            Long id, String numero, Long clienteId, String clienteNome,
            BigDecimal saldo, BigDecimal limite) {
        static ContaResponse de(Conta c) {
            return new ContaResponse(
                    c.getId(), c.getNumero(),
                    c.getCliente().getId(), c.getCliente().getNome(),
                    c.getSaldo(), c.getLimite());
        }
    }

    public record SaldoResponse(String numero, BigDecimal saldo) {}
}
