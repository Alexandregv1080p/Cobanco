# Contexto de build = raiz do repo (precisa de ./api e ./cobol).
# Imagem final embarca o jar da API + os binarios COBOL que ela orquestra.

# --- stage 1: build do jar ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY api/pom.xml .
RUN mvn -q -e dependency:go-offline
COPY api/src ./src
RUN mvn -q clean package -DskipTests

# --- stage 2: runtime (mesma base compila e roda o COBOL -> ABI casado) ---
FROM ubuntu:24.04
RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-21-jre-headless gnucobol \
 && rm -rf /var/lib/apt/lists/*

# Compila o nucleo COBOL para a PATH.
COPY cobol/src /opt/cobol/src
RUN cobc -x -free -o /usr/local/bin/amortizacao /opt/cobol/src/amortizacao.cob \
 && cobc -x -free -o /usr/local/bin/transacoes  /opt/cobol/src/transacoes.cob \
 && cobc -x -free -o /usr/local/bin/investimento /opt/cobol/src/investimento.cob

COPY --from=build /build/target/*.jar /app/app.jar
WORKDIR /app
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
