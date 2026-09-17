package com.portfolio.banco.common;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Documentação da API em /swagger-ui.html, com autenticação Bearer (JWT). */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI api() {
        final String bearer = "bearer-jwt";
        return new OpenAPI()
                .info(new Info()
                        .title("Core Bancário API")
                        .version("1.0")
                        .description("API de orquestração do core bancário COBOL. "
                                + "Faça login em /auth/login, copie o token e use no botão Authorize."))
                .addSecurityItem(new SecurityRequirement().addList(bearer))
                .components(new Components().addSecuritySchemes(bearer,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
