FROM ubuntu:24.04

RUN apt-get update \
 && apt-get install -y --no-install-recommends gnucobol bash \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY src/ ./src/
COPY tests/ ./tests/

# Compila os modulos COBOL como executaveis na PATH.
RUN cobc -x -free -o /usr/local/bin/amortizacao src/amortizacao.cob \
 && cobc -x -free -o /usr/local/bin/transacoes  src/transacoes.cob

# Por padrao roda todas as baterias de teste; a API sobrescreve o CMD depois.
CMD ["bash", "tests/all.sh"]
