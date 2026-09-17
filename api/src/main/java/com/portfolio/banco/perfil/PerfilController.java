package com.portfolio.banco.perfil;

import com.portfolio.banco.auth.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/perfil")
public class PerfilController {

    private static final String SENHA_FORTE = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$";

    private final PerfilService service;

    public PerfilController(PerfilService service) {
        this.service = service;
    }

    @GetMapping
    public PerfilService.PerfilResponse meu() {
        return service.meuPerfil();
    }

    @PutMapping
    public AuthService.AuthResponse atualizar(@Valid @RequestBody AtualizarRequest req) {
        return service.atualizar(req.nome(), req.email(), req.telefone());
    }

    @PutMapping("/senha")
    public void trocarSenha(@Valid @RequestBody TrocarSenhaRequest req) {
        service.trocarSenha(req.senhaAtual(), req.novaSenha());
    }

    public record AtualizarRequest(
            @NotBlank @Size(max = 120) String nome,
            @NotBlank @Email @Size(max = 180) String email,
            @NotBlank @Pattern(regexp = "\\+?[1-9]\\d{9,14}", message = "telefone invalido") String telefone) {}

    public record TrocarSenhaRequest(
            @NotBlank String senhaAtual,
            @NotBlank @Pattern(regexp = SENHA_FORTE,
                    message = "senha deve ter ao menos 8 caracteres, com letras e numeros") String novaSenha) {}
}
