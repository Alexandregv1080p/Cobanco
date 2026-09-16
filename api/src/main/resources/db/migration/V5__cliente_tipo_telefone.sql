-- Cliente pessoa física ou jurídica, com telefone.
-- A coluna 'cpf' passa a guardar o documento (CPF ou CNPJ).
ALTER TABLE cliente ADD COLUMN tipo     VARCHAR(10) NOT NULL DEFAULT 'FISICA';
ALTER TABLE cliente ADD COLUMN telefone VARCHAR(30);
ALTER TABLE cliente ADD CONSTRAINT chk_tipo_cliente CHECK (tipo IN ('FISICA', 'JURIDICA'));
