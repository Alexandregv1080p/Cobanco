package com.portfolio.banco.simulacao;

import com.portfolio.banco.auth.Autorizacao;
import com.portfolio.banco.usuario.Usuario;
import com.portfolio.banco.usuario.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class SimulacaoServiceTest {

    private final SimulacaoRepository repo = mock(SimulacaoRepository.class);
    private final UsuarioRepository usuarioRepo = mock(UsuarioRepository.class);
    private final Autorizacao autz = mock(Autorizacao.class);
    private final SimulacaoService service = new SimulacaoService(repo, usuarioRepo, autz);

    private Usuario usuario(long id) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setEmail("u@x.com");
        return u;
    }

    @Test
    void registra_quandoHaUsuario() {
        when(autz.emailAtual()).thenReturn("u@x.com");
        when(usuarioRepo.findByEmail("u@x.com")).thenReturn(Optional.of(usuario(7L)));

        service.registrar("EMPRESTIMO", "PRICE", new BigDecimal("1000.00"), 12,
                new BigDecimal("0.01"), new BigDecimal("1100.00"), new BigDecimal("0.012"));

        ArgumentCaptor<Simulacao> cap = ArgumentCaptor.forClass(Simulacao.class);
        verify(repo).save(cap.capture());
        assertEquals(7L, cap.getValue().getUsuarioId());
        assertEquals("EMPRESTIMO", cap.getValue().getCategoria());
    }

    @Test
    void naoRegistra_semUsuario() {
        when(autz.emailAtual()).thenReturn(null);
        when(usuarioRepo.findByEmail(null)).thenReturn(Optional.empty());

        service.registrar("EMPRESTIMO", "PRICE", BigDecimal.ONE, 1,
                BigDecimal.ZERO, BigDecimal.ONE, null);

        verify(repo, never()).save(any());
    }

    @Test
    void lista_doUsuario() {
        when(autz.emailAtual()).thenReturn("u@x.com");
        when(usuarioRepo.findByEmail("u@x.com")).thenReturn(Optional.of(usuario(7L)));
        when(repo.findTop30ByUsuarioIdOrderByCreatedAtDesc(7L)).thenReturn(List.of(new Simulacao()));

        assertEquals(1, service.listar().size());
    }
}
