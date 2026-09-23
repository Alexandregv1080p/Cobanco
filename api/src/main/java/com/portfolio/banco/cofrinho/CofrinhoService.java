package com.portfolio.banco.cofrinho;

import com.portfolio.banco.auth.Autorizacao;
import com.portfolio.banco.common.NotFoundException;
import com.portfolio.banco.common.RegraNegocioException;
import com.portfolio.banco.conta.Conta;
import com.portfolio.banco.conta.ContaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Cofrinhos: movem dinheiro entre a conta e a caixinha. É uma reclassificação
 * interna do saldo do cliente (não passa pelo razão de partidas dobradas).
 * ponytail: sem lançamento contábil, pois não altera o passivo total do banco;
 * se um dia virar produto com rendimento creditado, aí sim posta no razão.
 */
@Service
public class CofrinhoService {

    private final CofrinhoRepository repo;
    private final ContaRepository contaRepo;
    private final Autorizacao autz;

    public CofrinhoService(CofrinhoRepository repo, ContaRepository contaRepo, Autorizacao autz) {
        this.repo = repo;
        this.contaRepo = contaRepo;
        this.autz = autz;
    }

    @Transactional(readOnly = true)
    public List<Cofrinho> listar(Long contaId) {
        Conta c = contaRepo.findById(contaId)
                .orElseThrow(() -> new NotFoundException("conta " + contaId + " nao encontrada"));
        autz.exigirDono(c.getCliente().getId());
        return repo.findByContaIdOrderByIdAsc(contaId);
    }

    @Transactional
    public Cofrinho criar(Long contaId, String nome, BigDecimal meta) {
        Conta c = contaRepo.findById(contaId)
                .orElseThrow(() -> new NotFoundException("conta " + contaId + " nao encontrada"));
        autz.exigirDono(c.getCliente().getId());
        Cofrinho cof = new Cofrinho();
        cof.setConta(c);
        cof.setNome(nome.trim());
        cof.setMeta(meta == null ? BigDecimal.ZERO : meta);
        return repo.save(cof);
    }

    @Transactional
    public Cofrinho guardar(Long cofrinhoId, BigDecimal valor) {
        Cofrinho cof = travar(cofrinhoId);
        Conta conta = travarConta(cof);
        exigir(valor);
        // cofrinho NÃO usa cheque especial: guarda só o que há de saldo positivo
        if (conta.getSaldo().compareTo(valor) < 0) {
            throw new RegraNegocioException("saldo insuficiente para guardar (cofrinho nao usa cheque especial)");
        }
        conta.setSaldo(conta.getSaldo().subtract(valor));
        cof.setSaldo(cof.getSaldo().add(valor));
        contaRepo.save(conta);
        return repo.save(cof);
    }

    @Transactional
    public Cofrinho resgatar(Long cofrinhoId, BigDecimal valor) {
        Cofrinho cof = travar(cofrinhoId);
        Conta conta = travarConta(cof);
        exigir(valor);
        if (cof.getSaldo().compareTo(valor) < 0) {
            throw new RegraNegocioException("o cofrinho nao tem esse valor guardado");
        }
        cof.setSaldo(cof.getSaldo().subtract(valor));
        conta.setSaldo(conta.getSaldo().add(valor));
        contaRepo.save(conta);
        return repo.save(cof);
    }

    // ---- infra ----
    private Cofrinho travar(Long id) {
        Cofrinho cof = repo.findByIdForUpdate(id)
                .orElseThrow(() -> new NotFoundException("cofrinho " + id + " nao encontrado"));
        autz.exigirDono(cof.getConta().getCliente().getId());
        return cof;
    }

    private Conta travarConta(Cofrinho cof) {
        // lock sempre na ordem cofrinho -> conta (anti-deadlock)
        return contaRepo.findByIdForUpdate(cof.getConta().getId())
                .orElseThrow(() -> new NotFoundException("conta da caixinha nao encontrada"));
    }

    private void exigir(BigDecimal valor) {
        if (valor == null || valor.signum() <= 0) {
            throw new RegraNegocioException("valor deve ser positivo");
        }
    }
}
