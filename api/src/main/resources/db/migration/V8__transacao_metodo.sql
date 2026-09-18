-- Canal da movimentacao (Pix, Boleto, Cartao, Especie) e um detalhe livre
-- (ex.: chave Pix). Operacoes simuladas: sem processamento de pagamento real.
ALTER TABLE transacao ADD COLUMN metodo  VARCHAR(20);
ALTER TABLE transacao ADD COLUMN detalhe VARCHAR(120);
