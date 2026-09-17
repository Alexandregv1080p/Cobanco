package com.portfolio.banco.cliente;

import com.portfolio.banco.auth.Autorizacao;
import com.portfolio.banco.common.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/clientes")
public class ClienteController {

    private final ClienteRepository repo;
    private final Autorizacao autz;

    public ClienteController(ClienteRepository repo, Autorizacao autz) {
        this.repo = repo;
        this.autz = autz;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteResponse criar(@Valid @RequestBody CriarClienteRequest req) {
        autz.exigirAdmin();   // gestão de clientes é do admin; usuários se cadastram por /auth/registrar
        Cliente c = new Cliente();
        c.setNome(req.nome());
        c.setCpf(req.cpf());
        return ClienteResponse.de(repo.save(c));
    }

    @GetMapping
    public List<ClienteResponse> listar() {
        autz.exigirAdmin();
        return repo.findAll().stream().map(ClienteResponse::de).toList();
    }

    @GetMapping("/{id}")
    public ClienteResponse buscar(@PathVariable Long id) {
        return ClienteResponse.de(achar(id));
    }

    private Cliente achar(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new NotFoundException("cliente " + id + " nao encontrado"));
    }

    // --- DTOs ---
    public record CriarClienteRequest(
            @NotBlank @jakarta.validation.constraints.Size(max = 120) String nome,
            @NotBlank @jakarta.validation.constraints.Size(max = 25) String cpf) {}

    public record ClienteResponse(Long id, String nome, String cpf, OffsetDateTime createdAt) {
        static ClienteResponse de(Cliente c) {
            return new ClienteResponse(c.getId(), c.getNome(), c.getCpf(), c.getCreatedAt());
        }
    }
}
