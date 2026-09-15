-- Taxa de juros do cheque especial (rotativo), usada pelo batch de fechamento.
ALTER TABLE conta
    ADD COLUMN taxa_cheque_especial NUMERIC(6,4) NOT NULL DEFAULT 0.08;  -- 8% a.m.

-- Lancamentos de ABERTURA para contas que ja tinham saldo antes do razao
-- existir (V2), de modo que o razao bata com o saldo desde o inicio e a
-- reconciliacao do batch nao acuse falsa divergencia.
DO $$
DECLARE
    r RECORD;
    v_lote BIGINT;
BEGIN
    -- Só contas que ainda não têm lançamentos (as criadas antes do razão existir).
    -- Contas pós-V2 já refletem o saldo no razão; não semear de novo.
    FOR r IN SELECT id, saldo FROM conta
             WHERE saldo <> 0
               AND id NOT IN (SELECT conta_id FROM lancamento WHERE conta_id IS NOT NULL)
    LOOP
        v_lote := nextval('lancamento_lote_seq');
        IF r.saldo > 0 THEN
            INSERT INTO lancamento(lote, conta_id, natureza, valor, historico)
                VALUES (v_lote, r.id, 'C', r.saldo, 'Saldo inicial');
            INSERT INTO lancamento(lote, conta_interna, natureza, valor, historico)
                VALUES (v_lote, 'SALDO_INICIAL', 'D', r.saldo, 'Saldo inicial');
        ELSE
            INSERT INTO lancamento(lote, conta_id, natureza, valor, historico)
                VALUES (v_lote, r.id, 'D', -r.saldo, 'Saldo inicial');
            INSERT INTO lancamento(lote, conta_interna, natureza, valor, historico)
                VALUES (v_lote, 'SALDO_INICIAL', 'C', -r.saldo, 'Saldo inicial');
        END IF;
    END LOOP;
END $$;
