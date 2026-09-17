package com.portfolio.banco.conta;

import com.portfolio.banco.auth.Autorizacao;
import com.portfolio.banco.cliente.Cliente;
import com.portfolio.banco.cliente.ClienteRepository;
import com.portfolio.banco.common.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/contas")
public class ContaController {

    private final ContaRepository contaRepo;
    private final ClienteRepository clienteRepo;
    private final Autorizacao autz;

    public ContaController(ContaRepository contaRepo, ClienteRepository clienteRepo, Autorizacao autz) {
        this.contaRepo = contaRepo;
        this.clienteRepo = clienteRepo;
        this.autz = autz;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ContaResponse criar(@Valid @RequestBody CriarContaRequest req) {
        // CLIENTE só cria conta pra si mesmo; admin pode escolher o cliente.
        Long clienteId = (!autz.semAutenticacao() && !autz.isAdmin())
                ? autz.clienteId()
                : req.clienteId();
        Cliente dono = clienteRepo.findById(clienteId)
                .orElseThrow(() -> new NotFoundException("cliente " + clienteId + " nao encontrado"));

        Conta c = new Conta();
        c.setCliente(dono);
        c.setNumero(req.numero());
        c.setLimite(req.limite() == null ? BigDecimal.ZERO : req.limite());
        c.setSaldo(BigDecimal.ZERO);
        return ContaResponse.de(contaRepo.save(c));
    }

    @GetMapping
    public List<ContaResponse> listar() {
        // CLIENTE vê só as próprias; admin (ou sem auth) vê todas.
        List<Conta> contas = (autz.semAutenticacao() || autz.isAdmin())
                ? contaRepo.findAll()
                : contaRepo.findByClienteId(autz.clienteId());
        return contas.stream().map(ContaResponse::de).toList();
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
        Conta c = contaRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("conta " + id + " nao encontrada"));
        autz.exigirDono(c.getCliente().getId());
        return c;
    }

    // --- DTOs ---
    public record CriarContaRequest(
            @NotNull @Positive Long clienteId,
            @NotBlank @Size(max = 20) @Pattern(regexp = "[A-Za-z0-9\\-]+",
                    message = "numero deve conter apenas letras, numeros e hifen") String numero,
            @PositiveOrZero @DecimalMax("9999999999999.99")
            @Digits(integer = 13, fraction = 2) BigDecimal limite) {}

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
