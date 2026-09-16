package com.portfolio.banco.cliente;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ClienteController.class)
@AutoConfigureMockMvc(addFilters = false)   // testa o controller sem a cadeia de seguranca
class ClienteControllerTest {

    @Autowired
    MockMvc mvc;

    @MockBean
    ClienteRepository repo;

    @MockBean
    com.portfolio.banco.auth.JwtAuthFilter jwtAuthFilter;   // satisfaz o SecurityConfig no slice

    @MockBean
    com.portfolio.banco.auth.Autorizacao autz;   // exigirAdmin() vira no-op no slice

    @Test
    void criarClienteValido_retorna201() throws Exception {
        when(repo.save(any())).thenAnswer(inv -> {
            Cliente c = inv.getArgument(0);
            c.setId(1L);
            return c;
        });

        mvc.perform(post("/clientes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ana\",\"cpf\":\"111\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.nome").value("Ana"));
    }

    @Test
    void criarClienteSemNome_retorna400ComCampo() throws Exception {
        mvc.perform(post("/clientes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cpf\":\"111\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.nome").exists());
    }

    @Test
    void buscarInexistente_retorna404() throws Exception {
        when(repo.findById(99L)).thenReturn(Optional.empty());

        mvc.perform(get("/clientes/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void cpfDuplicado_retorna409() throws Exception {
        when(repo.save(any())).thenThrow(new DataIntegrityViolationException("dup"));

        mvc.perform(post("/clientes").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ana\",\"cpf\":\"111\"}"))
                .andExpect(status().isConflict());
    }
}
