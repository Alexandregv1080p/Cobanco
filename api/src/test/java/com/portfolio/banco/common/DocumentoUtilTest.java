package com.portfolio.banco.common;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DocumentoUtilTest {

    @Test
    void cpf() {
        assertTrue(DocumentoUtil.cpfValido("111.444.777-35"));
        assertTrue(DocumentoUtil.cpfValido("11144477735"));
        assertFalse(DocumentoUtil.cpfValido("111.444.777-00")); // dígito errado
        assertFalse(DocumentoUtil.cpfValido("111.111.111-11")); // todos iguais
        assertFalse(DocumentoUtil.cpfValido("123"));            // tamanho
        assertFalse(DocumentoUtil.cpfValido(null));
    }

    @Test
    void cnpj() {
        assertTrue(DocumentoUtil.cnpjValido("11.222.333/0001-81"));
        assertTrue(DocumentoUtil.cnpjValido("11222333000181"));
        assertFalse(DocumentoUtil.cnpjValido("11.222.333/0001-00")); // dígito errado
        assertFalse(DocumentoUtil.cnpjValido("00.000.000/0000-00")); // todos iguais
        assertFalse(DocumentoUtil.cnpjValido("111.444.777-35"));     // é CPF
    }
}
