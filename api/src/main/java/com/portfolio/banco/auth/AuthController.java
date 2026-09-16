package com.portfolio.banco.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/registrar")
    public AuthService.AuthResponse registrar(@Valid @RequestBody RegistrarRequest req) {
        return service.registrar(req.nome(), req.cpf(), req.email(), req.senha());
    }

    @PostMapping("/login")
    public AuthService.AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return service.login(req.email(), req.senha());
    }

    public record RegistrarRequest(
            @NotBlank String nome,
            @NotBlank String cpf,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 6, message = "senha deve ter ao menos 6 caracteres") String senha) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String senha) {}
}
