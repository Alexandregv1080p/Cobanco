-- A coluna do documento (cpf) precisa caber CNPJ formatado (18 chars).
ALTER TABLE cliente ALTER COLUMN cpf TYPE VARCHAR(25);
