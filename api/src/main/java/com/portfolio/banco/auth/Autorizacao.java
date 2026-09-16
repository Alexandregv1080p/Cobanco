package com.portfolio.banco.auth;

import com.portfolio.banco.common.AcessoNegadoException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Objects;

/**
 * Regras de autorização por dono. Lê o usuário autenticado do SecurityContext
 * (o JwtAuthFilter guarda o clienteId em details).
 *
 * Sem autenticação no contexto (chamada interna/agendada, ou teste com a
 * cadeia de filtros desligada) as verificações liberam — em produção os
 * endpoints protegidos só chegam aqui já autenticados.
 */
@Component
public class Autorizacao {

    private Authentication auth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    public boolean semAutenticacao() {
        Authentication a = auth();
        return a == null || !a.isAuthenticated() || a instanceof AnonymousAuthenticationToken;
    }

    public boolean isAdmin() {
        Authentication a = auth();
        return a != null && a.getAuthorities().stream()
                .anyMatch(g -> g.getAuthority().equals("ROLE_ADMIN"));
    }

    public Long clienteId() {
        Authentication a = auth();
        return (a != null && a.getDetails() instanceof Long l) ? l : null;
    }

    /** Garante que o usuário é dono da conta (ou é admin). */
    public void exigirDono(Long clienteDaConta) {
        if (semAutenticacao() || isAdmin()) return;
        if (!Objects.equals(clienteId(), clienteDaConta)) {
            throw new AcessoNegadoException("acesso negado a esta conta");
        }
    }

    /** Garante que o usuário é admin. */
    public void exigirAdmin() {
        if (semAutenticacao() || isAdmin()) return;
        throw new AcessoNegadoException("acesso restrito a administradores");
    }
}
