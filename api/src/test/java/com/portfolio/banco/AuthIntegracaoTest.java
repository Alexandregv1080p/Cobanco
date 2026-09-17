package com.portfolio.banco;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Testa a camada de seguranca de verdade (filtros ligados): registro, login e proteção. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthIntegracaoTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    MockMvc mvc;

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void registro_login_eProtecaoDaApi() throws Exception {
        // registrar -> 200 + token
        String body = mvc.perform(post("/auth/registrar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"FISICA\",\"nome\":\"Ana\",\"documento\":\"" + cpf(1) + "\",\"telefone\":\"+5511999990000\",\"email\":\"ana@banco.com\",\"senha\":\"secreta1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.papel").value("CLIENTE"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        String token = json.readTree(body).get("token").asText();

        // endpoint protegido SEM token -> 401
        mvc.perform(get("/contas")).andExpect(status().isUnauthorized());

        // COM token -> 200
        mvc.perform(get("/contas").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // login com senha certa -> 200
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@banco.com\",\"senha\":\"secreta1\"}"))
                .andExpect(status().isOk());

        // login com senha errada -> 401
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ana@banco.com\",\"senha\":\"errada\"}"))
                .andExpect(status().isUnauthorized());

        // email duplicado -> 422 (regra de negocio)
        mvc.perform(post("/auth/registrar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"FISICA\",\"nome\":\"Outra\",\"documento\":\"" + cpf(2) + "\",\"telefone\":\"+5511999990001\",\"email\":\"ana@banco.com\",\"senha\":\"secreta1\"}"))
                .andExpect(status().isUnprocessableEntity());

        // documento invalido -> 400
        mvc.perform(post("/auth/registrar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"FISICA\",\"nome\":\"Zé\",\"documento\":\"111.111.111-11\",\"telefone\":\"+5511999990002\",\"email\":\"ze@banco.com\",\"senha\":\"secreta1\"}"))
                .andExpect(status().isBadRequest());

        // senha fraca -> 400
        mvc.perform(post("/auth/registrar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"FISICA\",\"nome\":\"Fraca\",\"documento\":\"" + cpf(9) + "\",\"telefone\":\"+5511999990003\",\"email\":\"fraca@banco.com\",\"senha\":\"12345\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ownership_clienteSoAcessaSuasContas() throws Exception {
        String[] a = registrar("Alice", cpf(3), "alice@banco.com");
        String tokenA = a[0], clienteA = a[1];

        // Alice cria uma conta (o clienteId enviado e forcado para o dela)
        String contaBody = mvc.perform(post("/contas").header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clienteId\":" + clienteA + ",\"numero\":\"OWN-A\",\"limite\":0}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long contaA = json.readTree(contaBody).get("id").asLong();

        String tokenB = registrar("Bob", cpf(4), "bob@banco.com")[0];

        // Bob NAO acessa a conta da Alice
        mvc.perform(get("/contas/" + contaA).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());
        mvc.perform(post("/contas/" + contaA + "/deposito").header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"valor\":10.00}"))
                .andExpect(status().isForbidden());
        // Bob lista contas -> nenhuma
        mvc.perform(get("/contas").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Alice acessa a propria conta
        mvc.perform(get("/contas/" + contaA).header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk());

        // CLIENTE nao ve o balancete (so admin)
        mvc.perform(get("/razao/balancete").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden());

        // admin (seed) ve o balancete
        String adminBody = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@banco.com\",\"senha\":\"admin123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String tokenAdmin = json.readTree(adminBody).get("token").asText();
        mvc.perform(get("/razao/balancete").header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isOk());
    }

    @Test
    void perfil_verEditarETrocarSenha() throws Exception {
        String token = registrar("Perfil User", cpf(5), "perfil@banco.com")[0];

        mvc.perform(get("/perfil").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("perfil@banco.com"))
                .andExpect(jsonPath("$.tipo").value("FISICA"));

        // atualiza nome/telefone -> devolve token novo
        String upd = mvc.perform(put("/perfil").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Perfil Novo\",\"email\":\"perfil@banco.com\",\"telefone\":\"+5511988887777\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token2 = json.readTree(upd).get("token").asText();
        mvc.perform(get("/perfil").header("Authorization", "Bearer " + token2))
                .andExpect(jsonPath("$.nome").value("Perfil Novo"))
                .andExpect(jsonPath("$.telefone").value("+5511988887777"));

        // senha atual errada -> 401; correta -> 200; login com a nova senha -> 200
        mvc.perform(put("/perfil/senha").header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"senhaAtual\":\"errada99\",\"novaSenha\":\"novaSenha1\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/perfil/senha").header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"senhaAtual\":\"secreta1\",\"novaSenha\":\"novaSenha1\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"perfil@banco.com\",\"senha\":\"novaSenha1\"}"))
                .andExpect(status().isOk());
    }

    /** Gera um CPF válido (com dígitos verificadores) a partir de uma semente. */
    private static String cpf(int seed) {
        int[] n = new int[11];
        String base = String.format("%09d", 100000000 + seed);
        for (int i = 0; i < 9; i++) n[i] = base.charAt(i) - '0';
        n[9] = cpfDig(n, 9, 10);
        n[10] = cpfDig(n, 10, 11);
        StringBuilder sb = new StringBuilder();
        for (int x : n) sb.append(x);
        return sb.toString();
    }

    private static int cpfDig(int[] n, int len, int peso) {
        int s = 0;
        for (int i = 0; i < len; i++) s += n[i] * (peso - i);
        int r = s % 11;
        return r < 2 ? 0 : 11 - r;
    }

    /** Registra e devolve [token, clienteId]. */
    private String[] registrar(String nome, String cpf, String email) throws Exception {
        String body = mvc.perform(post("/auth/registrar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipo\":\"FISICA\",\"nome\":\"" + nome + "\",\"documento\":\"" + cpf
                                + "\",\"telefone\":\"+550000000000\",\"email\":\"" + email + "\",\"senha\":\"secreta1\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        var n = json.readTree(body);
        return new String[]{n.get("token").asText(), n.get("clienteId").asText()};
    }
}
