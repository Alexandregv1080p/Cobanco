package com.portfolio.banco.razao;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface LancamentoRepository extends JpaRepository<Lancamento, Long> {

    List<Lancamento> findByContaIdOrderByCreatedAtDescIdDesc(Long contaId);

    /** Próximo número de lote (agrupa um par balanceado). */
    @Query(value = "SELECT nextval('lancamento_lote_seq')", nativeQuery = true)
    long proximoLote();

    @Query("select coalesce(sum(l.valor), 0) from Lancamento l where l.natureza = :nat")
    BigDecimal totalPorNatureza(@Param("nat") String natureza);

    /** Saldo de uma conta interna (débitos - créditos): p/ CAIXA = ativo. */
    @Query("""
            select coalesce(sum(case when l.natureza = 'D' then l.valor else -l.valor end), 0)
            from Lancamento l where l.contaInterna = :interna
            """)
    BigDecimal saldoContaInterna(@Param("interna") String interna);
}
