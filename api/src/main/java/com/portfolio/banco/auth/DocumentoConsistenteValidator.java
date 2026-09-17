package com.portfolio.banco.auth;

import com.portfolio.banco.common.DocumentoUtil;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class DocumentoConsistenteValidator
        implements ConstraintValidator<DocumentoConsistente, AuthController.RegistrarRequest> {

    @Override
    public boolean isValid(AuthController.RegistrarRequest req, ConstraintValidatorContext ctx) {
        if (req == null || req.tipo() == null || req.documento() == null) {
            return true;   // deixa @NotBlank/@Pattern reportarem os nulos
        }
        boolean ok = "JURIDICA".equals(req.tipo())
                ? DocumentoUtil.cnpjValido(req.documento())
                : DocumentoUtil.cpfValido(req.documento());
        if (!ok) {
            ctx.disableDefaultConstraintViolation();
            ctx.buildConstraintViolationWithTemplate(
                            "JURIDICA".equals(req.tipo()) ? "CNPJ invalido" : "CPF invalido")
                    .addPropertyNode("documento")
                    .addConstraintViolation();
        }
        return ok;
    }
}
