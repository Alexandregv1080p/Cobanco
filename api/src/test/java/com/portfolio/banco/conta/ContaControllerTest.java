package com.portfolio.banco.conta;

import com.portfolio.banco.cliente.Cliente;
import com.portfolio.banco.cliente.ClienteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ContaController.class)
class ContaControllerTest {

    @Autowired
    MockMvc mvc;

    @MockBean
    ContaRepository contaRepo;

    @MockBean
    ClienteRepository clienteRepo;

    private Cliente cliente(long id) {
        Cliente c = new Cliente();
        c.setId(id);
        c.setNome("Ana");
        c.setCpf("111");
        return c;
    }

    @Test
    void criarContaValida_retorna201ComDono() throws Exception {
        when(clienteRepo.findById(1L)).thenReturn(Optional.of(cliente(1L)));
        when(contaRepo.save(any())).thenAnswer(inv -> {
            Conta c = inv.getArgument(0);
            c.setId(10L);
            return c;
        });

        mvc.perform(post("/contas").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clienteId\":1,\"numero\":\"0001-1\",\"limite\":500.00}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.numero").value("0001-1"))
                .andExpect(jsonPath("$.clienteNome").value("Ana"))
                .andExpect(jsonPath("$.saldo").value(0));
    }

    @Test
    void criarContaClienteInexistente_retorna404() throws Exception {
        when(clienteRepo.findById(99L)).thenReturn(Optional.empty());

        mvc.perform(post("/contas").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clienteId\":99,\"numero\":\"0001-1\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void criarContaSemNumero_retorna400() throws Exception {
        mvc.perform(post("/contas").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"clienteId\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.numero").exists());
    }

    @Test
    void consultarSaldo_retorna200() throws Exception {
        Conta c = new Conta();
        c.setId(10L);
        c.setNumero("0001-1");
        c.setSaldo(new BigDecimal("250.00"));
        c.setCliente(cliente(1L));
        when(contaRepo.findById(10L)).thenReturn(Optional.of(c));

        mvc.perform(get("/contas/10/saldo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.numero").value("0001-1"))
                .andExpect(jsonPath("$.saldo").value(250.00));
    }
}
