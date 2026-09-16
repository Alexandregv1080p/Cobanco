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
                        .content("{\"nome\":\"Ana\",\"cpf\":\"auth-cpf-1\",\"email\":\"ana@banco.com\",\"senha\":\"secreta1\"}"))
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
                        .content("{\"nome\":\"Outra\",\"cpf\":\"auth-cpf-2\",\"email\":\"ana@banco.com\",\"senha\":\"secreta1\"}"))
                .andExpect(status().isUnprocessableEntity());
    }
}
