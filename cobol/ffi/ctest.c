/* Teste rapido do bridge sem a JVM: chama transacao_ffi e imprime. */
#include <stdio.h>
int transacao_ffi(const char *entrada, char *saida);
int main(void) {
    char out[121];
    transacao_ffi("DEPOSITO;50.00;100.00;0;0", out);
    printf("dep: [%s]\n", out);
    transacao_ffi("SAQUE;150.00;100.00;0;100.00", out);
    printf("saque CE: [%s]\n", out);
    transacao_ffi("TRANSFERENCIA;80.00;200.00;50.00;0", out);
    printf("transf: [%s]\n", out);
    transacao_ffi("SAQUE;999.00;100.00;0;0", out);
    printf("insuf: [%s]\n", out);
    return 0;
}
