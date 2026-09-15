package com.portfolio.banco.razao;

import com.portfolio.banco.common.NotFoundException;
import com.portfolio.banco.conta.ContaRepository;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
public class RazaoController {

    private final LancamentoRepository repo;
    private final ContaRepository contaRepo;

    public RazaoController(LancamentoRepository repo, ContaRepository contaRepo) {
        this.repo = repo;
        this.contaRepo = contaRepo;
    }

    /** Livro razão de uma conta de cliente (só os lançamentos dela). */
    @GetMapping("/contas/{id}/razao")
    public List<LancamentoItem> razaoDaConta(@PathVariable Long id) {
        if (!contaRepo.existsById(id)) {
            throw new NotFoundException("conta " + id + " nao encontrada");
        }
        return repo.findByContaIdOrderByCreatedAtDescIdDesc(id).stream()
                .map(LancamentoItem::de).toList();
    }

    /**
     * Balancete: prova que os livros fecham (total débitos = total créditos)
     * e mostra o saldo do CAIXA (caixa líquido do banco).
     */
    @GetMapping("/razao/balancete")
    public Balancete balancete() {
        BigDecimal debitos = repo.totalPorNatureza("D");
        BigDecimal creditos = repo.totalPorNatureza("C");
        return new Balancete(
                debitos, creditos,
                debitos.compareTo(creditos) == 0,
                repo.saldoContaInterna(RazaoService.CAIXA));
    }

    // --- DTOs ---
    public record LancamentoItem(
            Long id, Long lote, String natureza, BigDecimal valor,
            String historico, OffsetDateTime data) {
        static LancamentoItem de(Lancamento l) {
            return new LancamentoItem(l.getId(), l.getLote(), l.getNatureza(),
                    l.getValor(), l.getHistorico(), l.getCreatedAt());
        }
    }

    public record Balancete(
            BigDecimal totalDebitos, BigDecimal totalCreditos,
            boolean equilibrado, BigDecimal saldoCaixa) {}
}
