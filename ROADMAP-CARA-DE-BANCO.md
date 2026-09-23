# Roadmap — "Cara de Banco"

Objetivo: tirar o ar de **dashboard SaaS genérico** e deixar o Cobanco com cara de
**app bancário** de verdade (Nubank/Itaú/PicPay), sem exigir COBOL novo nem migração.

Ranqueado por **impacto × esforço**. Marque conforme for entregando.

---

## Prioridade (a tríade recomendada)

Estes três, juntos, mudam a percepção sem tocar no núcleo COBOL.

### [ ] 1. Cartão virtual  ⭐ começar por aqui
- **O que:** arte de cartão (frente) na conta/home — número mascarado (`•••• •••• •••• 1234`),
  bandeira, titular, validade; botões **"mostrar dados"** e **"congelar cartão"** (toggle visual).
- **Por que:** ícone visual nº1 de banco/fintech; nenhum SaaS tem cartão.
- **Esforço:** baixo (puramente visual/front).
- **Backend:** não precisa. Derivar número fake determinístico do id da conta.
- **Notas:** componente `CartaoVirtual.js`; gradiente + chip SVG; "congelar" só muda estilo/estado.

### [ ] 2. Comprovante com protocolo
- **O que:** após Pix/TED/transferência, recibo formal com **nº de protocolo/autenticação**,
  data-hora, pagador → recebedor, valor, tipo; botões **"baixar"** e **"compartilhar"**.
- **Por que:** todo banco emite comprovante; é o print que as pessoas guardam.
- **Esforço:** médio.
- **Backend:** reusa a transação; protocolo pode ser gerado (id + timestamp) no front ou vir da API.
- **Notas:** evoluir a tela de sucesso do `ModalPagamento`/`ModalFechamento`; "baixar" via
  `html-to-image`/print, ou um layout de recibo em CSS pronto pra screenshot.

### [ ] 3. Extrato em timeline por dia
- **O que:** trocar a tabela por um **feed agrupado por data**, com ícone por tipo
  (Pix ↑/↓, saque, depósito, juros), descrição e **saldo do dia**.
- **Por que:** mata direto a "cara de tabela SaaS"; é o extrato que Nubank/Itaú usam.
- **Esforço:** médio.
- **Backend:** já existe (`/contas/{id}/extrato`); só reagrupar no front.
- **Notas:** agrupar por `data` (dia), ordenar desc, cabeçalho "Hoje / Ontem / 20 set".

---

## Próximos (maior salto, mais trabalho)

### [ ] 4. Home de cliente (separada do painel admin)
- **O que:** home do correntista — saudação, saldo com olho, **ações rápidas circulares**
  (Pix, Transferir, Pagar, Extrato), "meu cartão", últimas 5 transações.
- **Por que:** é a mudança que mais tira o ar de dashboard — vira "app de banco".
- **Esforço:** alto (reorganiza layout; admin mantém o painel analítico atual).
- **Backend:** reusa tudo; só nova composição de UI por papel (CLIENTE vs ADMIN).

### [ ] 5. Hub Pix
- **O que:** cadastrar **chaves** (CPF/e-mail/telefone/aleatória), **Pix Copia-e-Cola**
  e **QR Code** para receber.
- **Por que:** Pix é a assinatura do banco brasileiro; impossível confundir com SaaS.
- **Esforço:** médio-alto.
- **Backend:** tabela de chaves Pix (nova) ou versão simulada no front.
- **Notas:** QR via lib `qrcode`; "copia e cola" = string BR Code fake.

### [ ] 6. Central de notificações (sino)
- **O que:** sino no topo com badge — "Você recebeu um Pix de R$…", "Fechamento concluído",
  "Juros cobrados".
- **Por que:** sino com contador é padrão de app bancário.
- **Esforço:** médio.
- **Backend:** derivar do extrato/eventos existentes, ou tabela de notificações.

### [ ] 7. Produto bancário: cofrinhos OU fatura de cartão
- **O que:** **cofrinhos/caixinhas** (guardar dinheiro com meta) ou **fatura** com barra de
  limite usado.
- **Por que:** produtos bancários reais, não features de dashboard.
- **Esforço:** alto.
- **Backend:** novo (tabela + regras; cálculo de rendimento pode ir pro COBOL).

---

## Princípios ao construir

- Manter a **identidade teal** e o tema escuro atuais.
- Reaproveitar componentes existentes (`CampoMoeda`, `ModalFechamento`, `LineChart`).
- Nada de dado sensível real; tudo **simulado** e marcado como demonstração.
- Cada item que rodar: verificar no navegador antes de commitar.
- Commits sem co-autoria (padrão do projeto).

## Ordem sugerida de ataque
`1 → 2 → 3` (a tríade) e reavaliar. Depois `4` (home) como maior salto.
