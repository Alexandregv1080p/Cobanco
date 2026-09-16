/*
 * Bridge C sobre o nucleo COBOL de transacoes (TRANSACAOCORE).
 * Expoe uma funcao simples de string->string para ser chamada da JVM
 * via JNA, escondendo o runtime GnuCOBOL (libcob) e o layout de campos
 * de tamanho fixo (PIC X(120)).
 */
#include <string.h>
#include <libcob.h>

/* GnuCOBOL exporta a PROGRAM-ID como simbolo (maiusculo). */
extern int TRANSACAOCORE(char *entrada, char *saida);

static int inicializado = 0;

/*
 * entrada: string C (terminada em \0), ex "DEPOSITO;50.00;100.00;0;0"
 * saida:   buffer >= 121 bytes; recebe a resposta terminada em \0.
 */
int transacao_ffi(const char *entrada, char *saida) {
    if (!inicializado) {
        cob_init(0, NULL);   /* inicializa o runtime COBOL uma vez */
        inicializado = 1;
    }

    char in[120];
    memset(in, ' ', sizeof(in));           /* PIC X(120): preenche com espacos */
    size_t n = strlen(entrada);
    if (n > sizeof(in)) n = sizeof(in);
    memcpy(in, entrada, n);

    memset(saida, ' ', 120);
    TRANSACAOCORE(in, saida);               /* escreve 120 bytes em saida */
    saida[120] = '\0';
    return 0;
}
