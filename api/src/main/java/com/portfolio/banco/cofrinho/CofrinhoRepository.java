package com.portfolio.banco.cofrinho;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CofrinhoRepository extends JpaRepository<Cofrinho, Long> {
    List<Cofrinho> findByContaIdOrderByIdAsc(Long contaId);

    /** Trava a linha do cofrinho (SELECT ... FOR UPDATE) no caminho do dinheiro. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Cofrinho c where c.id = :id")
    Optional<Cofrinho> findByIdForUpdate(@Param("id") Long id);
}
