package com.portfolio.banco.cofrinho;

import com.portfolio.banco.auth.Autorizacao;
import com.portfolio.banco.cliente.Cliente;
import com.portfolio.banco.common.RegraNegocioException;
import com.portfolio.banco.conta.Conta;
import com.portfolio.banco.conta.ContaRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CofrinhoServiceTest {

    private final CofrinhoRepository repo = mock(CofrinhoRepository.class);
    private final ContaRepository contaRepo = mock(ContaRepository.class);
    private final Autorizacao autz = mock(Autorizacao.class);
    private final CofrinhoService service = new CofrinhoService(repo, contaRepo, autz);

    private Cofrinho cenario(String saldoConta, String saldoCofre) {
        Cliente cli = new Cliente(); cli.setId(1L);
        Conta conta = new Conta(); conta.setId(10L); conta.setCliente(cli);
        conta.setSaldo(new BigDecimal(saldoConta)); conta.setLimite(new BigDecimal("500.00"));
        Cofrinho cof = new Cofrinho(); cof.setId(5L); cof.setConta(conta);
        cof.setSaldo(new BigDecimal(saldoCofre));
        when(repo.findByIdForUpdate(5L)).thenReturn(Optional.of(cof));
        when(contaRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(conta));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        return cof;
    }

    @Test
    void guardar_debitaContaeCreditaCofrinho() {
        Cofrinho cof = cenario("200.00", "0.00");
        service.guardar(5L, new BigDecimal("150.00"));
        assertEquals(new BigDecimal("50.00"), cof.getConta().getSaldo());
        assertEquals(new BigDecimal("150.00"), cof.getSaldo());
    }

    @Test
    void guardar_naoUsaChequeEspecial() {
        cenario("100.00", "0.00");
        // saldo 100 < 150, mesmo com limite 500 deve recusar (cofrinho não usa cheque especial)
        assertThrows(RegraNegocioException.class, () -> service.guardar(5L, new BigDecimal("150.00")));
    }

    @Test
    void resgatar_devolveParaConta() {
        Cofrinho cof = cenario("50.00", "150.00");
        service.resgatar(5L, new BigDecimal("100.00"));
        assertEquals(new BigDecimal("150.00"), cof.getConta().getSaldo());
        assertEquals(new BigDecimal("50.00"), cof.getSaldo());
    }

    @Test
    void resgatar_maisDoQueGuardado_recusa() {
        cenario("0.00", "50.00");
        assertThrows(RegraNegocioException.class, () -> service.resgatar(5L, new BigDecimal("100.00")));
    }
}
