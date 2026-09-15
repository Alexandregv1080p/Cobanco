package com.portfolio.banco.conta;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ContaRepository extends JpaRepository<Conta, Long> {
    Optional<Conta> findByNumero(String numero);
    boolean existsByNumero(String numero);

    /** Trava a linha da conta (SELECT ... FOR UPDATE) no caminho do dinheiro. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Conta c where c.id = :id")
    Optional<Conta> findByIdForUpdate(@Param("id") Long id);
}
