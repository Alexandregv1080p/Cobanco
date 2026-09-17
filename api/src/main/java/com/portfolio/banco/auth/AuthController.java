package com.portfolio.banco.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
        return service.registrar(req.tipo(), req.nome(), req.documento(),
                req.telefone(), req.email(), req.senha());
    }

    @PostMapping("/login")
    public AuthService.AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return service.login(req.email(), req.senha());
    }

    @DocumentoConsistente
    public record RegistrarRequest(
            @NotBlank @Pattern(regexp = "FISICA|JURIDICA", message = "tipo deve ser FISICA ou JURIDICA") String tipo,
            @NotBlank @Size(max = 120) String nome,
            @NotBlank @Size(max = 25) String documento,   // CPF ou CNPJ (validado por @DocumentoConsistente)
            @NotBlank @Pattern(regexp = "\\+?[1-9]\\d{9,14}", message = "telefone invalido") String telefone,
            @NotBlank @Email @Size(max = 180) String email,
            @NotBlank @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$",
                    message = "senha deve ter ao menos 8 caracteres, com letras e numeros") String senha) {}

    public record LoginRequest(
            @NotBlank @Email @Size(max = 180) String email,
            @NotBlank @Size(max = 72) String senha) {}
}
