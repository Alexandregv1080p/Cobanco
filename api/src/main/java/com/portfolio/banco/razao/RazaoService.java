package com.portfolio.banco.razao;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Posta os lançamentos de partidas dobradas de cada operação. Roda SEMPRE
 * dentro da transação de quem chama (MANDATORY), garantindo que saldo,
 * extrato e razão sejam gravados atomicamente.
 *
 * Convenção: conta de cliente é passivo do banco (crédito aumenta o saldo);
 * CAIXA é ativo (débito aumenta o caixa).
 */
@Service
public class RazaoService {

    static final String CAIXA = "CAIXA";
    static final String RECEITA_JUROS = "RECEITA_JUROS";

    private final LancamentoRepository repo;

    public RazaoService(LancamentoRepository repo) {
        this.repo = repo;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void deposito(Long contaId, BigDecimal valor) {
        long lote = repo.proximoLote();
        lancar(lote, null, CAIXA, "D", valor, "Deposito conta " + contaId);
        lancar(lote, contaId, null, "C", valor, "Deposito");
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void saque(Long contaId, BigDecimal valor) {
        long lote = repo.proximoLote();
        lancar(lote, contaId, null, "D", valor, "Saque");
        lancar(lote, null, CAIXA, "C", valor, "Saque conta " + contaId);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void transferencia(Long origemId, Long destinoId, BigDecimal valor) {
        long lote = repo.proximoLote();
        lancar(lote, origemId, null, "D", valor, "Transferencia p/ conta " + destinoId);
        lancar(lote, destinoId, null, "C", valor, "Transferencia de conta " + origemId);
    }

    /** Cobrança de juros de cheque especial (batch): débito no cliente, crédito na receita. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void juros(Long contaId, BigDecimal valor) {
        long lote = repo.proximoLote();
        lancar(lote, contaId, null, "D", valor, "Juros cheque especial");
        lancar(lote, null, RECEITA_JUROS, "C", valor, "Juros conta " + contaId);
    }

    private void lancar(long lote, Long contaId, String interna,
                        String natureza, BigDecimal valor, String historico) {
        Lancamento l = new Lancamento();
        l.setLote(lote);
        l.setContaId(contaId);
        l.setContaInterna(interna);
        l.setNatureza(natureza);
        l.setValor(valor);
        l.setHistorico(historico);
        repo.save(l);
    }
}
