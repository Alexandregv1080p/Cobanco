package com.portfolio.banco.cobol;

import com.sun.jna.Library;
import com.sun.jna.Native;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * Fronteira FFI: chama o núcleo COBOL de transações (TRANSACAOCORE) in-process,
 * via a lib compartilhada libtransacaoffi.so (bridge C + COBOL), em vez de
 * subir um subprocesso por transação.
 *
 * A lib é carregada preguiçosamente (só quando cobol.mode=ffi), então o modo
 * subprocesso não depende do .so estar presente.
 *
 * ponytail: lock global nas chamadas — o runtime GnuCOBOL não é reentrante;
 * trocar por um pool de instâncias se a vazão exigir paralelismo real.
 */
@Component
public class FfiCobol {

    /** Assinatura da função C exposta pela lib. */
    public interface Bridge extends Library {
        int transacao_ffi(String entrada, byte[] saida);
    }

    private volatile Bridge lib;
    private final Object lock = new Object();

    private Bridge lib() {
        if (lib == null) {
            synchronized (lock) {
                if (lib == null) {
                    lib = Native.load("transacaoffi", Bridge.class);
                }
            }
        }
        return lib;
    }

    /** Entrada e saída no mesmo protocolo do subprocesso ("OP;...", "OK;..."/"ERRO;..."). */
    public String executar(String entrada) {
        byte[] saida = new byte[121];   // PIC X(120) + '\0'
        synchronized (lock) {
            lib().transacao_ffi(entrada, saida);
        }
        return new String(saida, 0, 120, StandardCharsets.US_ASCII).trim();
    }
}
