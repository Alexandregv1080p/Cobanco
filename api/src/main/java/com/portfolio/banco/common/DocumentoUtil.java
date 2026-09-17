package com.portfolio.banco.common;

/** Validação de CPF e CNPJ pelos dígitos verificadores (algoritmo oficial). */
public final class DocumentoUtil {

    private DocumentoUtil() {}

    public static boolean cpfValido(String s) {
        if (s == null) return false;
        String d = s.replaceAll("\\D", "");
        if (d.length() != 11 || d.chars().distinct().count() == 1) return false;
        int[] n = d.chars().map(c -> c - '0').toArray();
        return n[9] == digito(n, 9, 10) && n[10] == digito(n, 10, 11);
    }

    /** Dígito do CPF: soma ponderada decrescente a partir de 'peso'. */
    private static int digito(int[] n, int len, int peso) {
        int soma = 0;
        for (int i = 0; i < len; i++) soma += n[i] * (peso - i);
        int r = soma % 11;
        return r < 2 ? 0 : 11 - r;
    }

    public static boolean cnpjValido(String s) {
        if (s == null) return false;
        String d = s.replaceAll("\\D", "");
        if (d.length() != 14 || d.chars().distinct().count() == 1) return false;
        int[] n = d.chars().map(c -> c - '0').toArray();
        int[] p1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int[] p2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        return n[12] == digitoCnpj(n, p1, 12) && n[13] == digitoCnpj(n, p2, 13);
    }

    private static int digitoCnpj(int[] n, int[] pesos, int len) {
        int soma = 0;
        for (int i = 0; i < len; i++) soma += n[i] * pesos[i];
        int r = soma % 11;
        return r < 2 ? 0 : 11 - r;
    }
}
