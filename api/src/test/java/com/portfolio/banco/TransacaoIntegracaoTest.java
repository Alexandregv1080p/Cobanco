package com.portfolio.banco;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.junit.jupiter.api.condition.EnabledIf;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste de integracao do caminho real: HTTP -> API -> COBOL (subprocesso) -> Postgres.
 * Sobe um Postgres via Testcontainers e compila os modulos COBOL num diretorio
 * temporario. So roda onde ha Docker + GnuCOBOL (cobc); caso contrario, e pulado.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@EnabledIf("cobcDisponivel")
class TransacaoIntegracaoTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    MockMvc mvc;

    private final ObjectMapper json = new ObjectMapper();

    @DynamicPropertySource
    static void cobolBinDir(DynamicPropertyRegistry registry) throws Exception {
        Path dir = compilarCobol();
        registry.add("cobol.bin-dir", dir::toString);
    }

    @Test
    void fluxoDeposito_saque_saldoEExtrato() throws Exception {
        long clienteId = criarCliente("Teste", "int-1");
        long contaId = criarConta(clienteId, "INT-1", "100.00"); // limite 100

        // Deposito 1000.00 -> COBOL soma
        mvc.perform(post("/contas/" + contaId + "/deposito")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"valor\":1000.00}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saldo").value(1000.00));

        // Saque 300.00 -> 700.00
        mvc.perform(post("/contas/" + contaId + "/saque")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"valor\":300.00}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saldo").value(700.00));

        // Saque 900.00 > saldo(700) + limite(100) -> 422 (regra nasce no COBOL)
        mvc.perform(post("/contas/" + contaId + "/saque")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"valor\":900.00}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("saldo insuficiente"));

        // Saldo persistido segue 700.00; extrato tem 2 lancamentos
        mvc.perform(get("/contas/" + contaId + "/saldo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saldo").value(700.00));
        mvc.perform(get("/contas/" + contaId + "/extrato"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void simularEmprestimo_price_fechaSaldoEmZero() throws Exception {
        mvc.perform(post("/emprestimos/simular").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"valor\":100000.00,\"taxaMensal\":0.015,\"prazoMeses\":12,\"sistema\":\"PRICE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parcelas.length()").value(12))
                .andExpect(jsonPath("$.parcelas[0].juros").value(1500.00))
                .andExpect(jsonPath("$.parcelas[11].saldoDevedor").value(0.00))
                // custos regulatorios calculados no COBOL
                .andExpect(jsonPath("$.totalIOF").isNumber())
                .andExpect(jsonPath("$.cetMensal").isNumber())
                .andExpect(jsonPath("$.cetAnual").isNumber());
    }

    @Test
    void simularInvestimento_cdb_aplicaIRRegressivo() throws Exception {
        // CDB 1000, 1%/mes, 12 meses -> dias 360 -> IR 20%
        mvc.perform(post("/investimentos/simular").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"CDB\",\"valor\":1000.00,\"taxaMensal\":0.01,\"meses\":12}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aliquotaIR").value(0.2))
                .andExpect(jsonPath("$.ir").value(25.37))
                .andExpect(jsonPath("$.valorFinalLiquido").value(1101.47))
                .andExpect(jsonPath("$.evolucao.length()").value(12));
    }

    @Test
    void razao_partidasDobradas_equilibrado() throws Exception {
        long clienteId = criarCliente("Razao", "raz-1");
        long contaId = criarConta(clienteId, "RAZ-1", "0.00");

        mvc.perform(post("/contas/" + contaId + "/deposito")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"valor\":500.00}"))
                .andExpect(status().isOk());

        // Razão da conta: 1 lançamento (o crédito); a perna de débito fica no CAIXA.
        mvc.perform(get("/contas/" + contaId + "/razao"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].natureza").value("C"))
                .andExpect(jsonPath("$[0].valor").value(500.00));

        // Balancete sempre fecha: total débitos = total créditos.
        mvc.perform(get("/razao/balancete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equilibrado").value(true));
    }

    @Test
    void simularInvestimento_poupanca_isentaDeIR() throws Exception {
        mvc.perform(post("/investimentos/simular").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"POUPANCA\",\"valor\":1000.00,\"taxaMensal\":0.01,\"meses\":12}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aliquotaIR").value(0.0))
                .andExpect(jsonPath("$.ir").value(0.00));
    }

    // --- helpers ---

    private long criarCliente(String nome, String cpf) throws Exception {
        String body = mvc.perform(post("/clientes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"" + nome + "\",\"cpf\":\"" + cpf + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return id(body);
    }

    private long criarConta(long clienteId, String numero, String limite) throws Exception {
        String body = mvc.perform(post("/contas").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clienteId\":" + clienteId + ",\"numero\":\"" + numero + "\",\"limite\":" + limite + "}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return id(body);
    }

    private long id(String jsonBody) throws Exception {
        JsonNode node = json.readTree(jsonBody);
        return node.get("id").asLong();
    }

    private static Path compilarCobol() throws Exception {
        Path out = Files.createTempDirectory("cobol-bin");
        compilar("../cobol/src/amortizacao.cob", out.resolve("amortizacao"));
        compilar("../cobol/src/transacoes.cob", out.resolve("transacoes"));
        compilar("../cobol/src/investimento.cob", out.resolve("investimento"));
        return out;
    }

    private static void compilar(String src, Path dest) throws Exception {
        Process p = new ProcessBuilder("cobc", "-x", "-free", "-o", dest.toString(), src)
                .inheritIO().start();
        if (!p.waitFor(60, TimeUnit.SECONDS) || p.exitValue() != 0) {
            throw new IllegalStateException("falha ao compilar " + src);
        }
    }

    /** Usado por @EnabledIf: pula a classe inteira onde nao ha GnuCOBOL. */
    static boolean cobcDisponivel() {
        try {
            Process p = new ProcessBuilder("cobc", "--version").start();
            return p.waitFor(10, TimeUnit.SECONDS) && p.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }
}
