package com.portfolio.banco.transacao;

import com.portfolio.banco.auth.Autorizacao;
import com.portfolio.banco.cobol.CobolGateway;
import com.portfolio.banco.cobol.ResultadoTransferencia;
import com.portfolio.banco.common.NotFoundException;
import com.portfolio.banco.common.RegraNegocioException;
import com.portfolio.banco.conta.Conta;
import com.portfolio.banco.conta.ContaRepository;
import com.portfolio.banco.razao.RazaoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Orquestra cada transacao: trava a(s) conta(s), delega o calculo/validacao
 * ao COBOL, persiste o novo saldo e grava o extrato. Tudo numa transacao.
 */
@Service
public class TransacaoService {

    private final ContaRepository contaRepo;
    private final TransacaoRepository txRepo;
    private final CobolGateway cobol;
    private final RazaoService razao;
    private final Autorizacao autz;

    public TransacaoService(ContaRepository contaRepo, TransacaoRepository txRepo,
                            CobolGateway cobol, RazaoService razao, Autorizacao autz) {
        this.contaRepo = contaRepo;
        this.txRepo = txRepo;
        this.cobol = cobol;
        this.razao = razao;
        this.autz = autz;
    }

    @Transactional
    public BigDecimal deposito(Long contaId, BigDecimal valor, String metodo, String detalhe) {
        Conta c = travar(contaId);
        autz.exigirDono(c.getCliente().getId());
        BigDecimal novo = cobol.deposito(c.getSaldo(), valor);
        c.setSaldo(novo);
        registrar(contaId, null, "DEPOSITO", valor, novo, metodo(metodo, "ESPECIE"), detalhe);
        razao.deposito(contaId, valor);
        return novo;
    }

    @Transactional
    public BigDecimal saque(Long contaId, BigDecimal valor, String metodo, String detalhe) {
        Conta c = travar(contaId);
        autz.exigirDono(c.getCliente().getId());
        // COBOL valida saldo/limite; se insuficiente, lanca RegraNegocioException.
        BigDecimal novo = cobol.saque(c.getSaldo(), valor, c.getLimite());
        c.setSaldo(novo);
        registrar(contaId, null, "SAQUE", valor, novo, metodo(metodo, "ESPECIE"), detalhe);
        razao.saque(contaId, valor);
        return novo;
    }

    private String metodo(String informado, String padrao) {
        return (informado == null || informado.isBlank()) ? padrao : informado;
    }

    @Transactional
    public ResultadoTransferencia transferencia(Long origemId, Long destinoId, BigDecimal valor) {
        if (origemId.equals(destinoId)) {
            throw new RegraNegocioException("conta de origem e destino devem ser diferentes");
        }
        // Trava as duas contas em ordem de id para evitar deadlock.
        Conta origem, destino;
        if (origemId.compareTo(destinoId) < 0) {
            origem = travar(origemId);
            destino = travar(destinoId);
        } else {
            destino = travar(destinoId);
            origem = travar(origemId);
        }
        autz.exigirDono(origem.getCliente().getId());   // só o dono da origem transfere

        ResultadoTransferencia r = cobol.transferencia(
                origem.getSaldo(), destino.getSaldo(), valor, origem.getLimite());

        origem.setSaldo(r.novoSaldoOrigem());
        destino.setSaldo(r.novoSaldoDestino());
        // Uma linha de extrato em cada conta.
        registrar(origemId, destinoId, "TRANSFERENCIA", valor, r.novoSaldoOrigem(), null, null);
        registrar(destinoId, origemId, "TRANSFERENCIA", valor, r.novoSaldoDestino(), null, null);
        razao.transferencia(origemId, destinoId, valor);
        return r;
    }

    @Transactional(readOnly = true)
    public List<Transacao> extrato(Long contaId) {
        Conta c = contaRepo.findById(contaId)
                .orElseThrow(() -> new NotFoundException("conta " + contaId + " nao encontrada"));
        autz.exigirDono(c.getCliente().getId());
        return txRepo.findByContaIdOrderByCreatedAtDesc(contaId);
    }

    private Conta travar(Long id) {
        return contaRepo.findByIdForUpdate(id)
                .orElseThrow(() -> new NotFoundException("conta " + id + " nao encontrada"));
    }

    private void registrar(Long contaId, Long destinoId, String tipo, BigDecimal valor,
                           BigDecimal saldoApos, String metodo, String detalhe) {
        Transacao t = new Transacao();
        t.setContaId(contaId);
        t.setContaDestinoId(destinoId);
        t.setTipo(tipo);
        t.setValor(valor);
        t.setSaldoApos(saldoApos);
        t.setMetodo(metodo);
        t.setDetalhe(detalhe);
        txRepo.save(t);
    }
}
