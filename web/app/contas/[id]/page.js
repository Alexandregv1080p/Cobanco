"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { api, brl } from "../../../lib/api";
import { useRequireAuth } from "../../../lib/auth";
import LineChart from "../../LineChart";
import CampoMoeda from "../../CampoMoeda";

// ─── Ícones SVG ───────────────────────────────────────────────────────────────
const IcoCartao = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);
const IcoPix = () => (
  <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
    <path d="M390.2 154.5c-22.5 0-43.6 8.7-59.5 24.6l-79.3 79.3c-5 5-11.7 5-16.8 0l-79.3-79.3c-15.9-15.9-37-24.6-59.5-24.6H80.8l113 113-113 113h15.8c22.5 0 43.6-8.7 59.5-24.6l79.3-79.3c4.6-4.6 12.2-4.6 16.8 0l79.3 79.3c15.9 15.9 37 24.6 59.5 24.6H406l-113-113 113-113h-15.8z"/>
  </svg>
);
const IcoBoleto = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="3" width="20" height="18" rx="2" />
    <line x1="6" y1="8" x2="6" y2="16" /><line x1="9" y1="8" x2="9" y2="16" />
    <line x1="12" y1="8" x2="12" y2="16" /><line x1="15" y1="8" x2="15" y2="16" />
    <line x1="18" y1="8" x2="18" y2="16" />
  </svg>
);
const IcoBanco = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M8 10v11M12 10v11M16 10v11M20 10v11" />
  </svg>
);
const IcoDinheiro = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// ─── Utilitários ──────────────────────────────────────────────────────────────
function mascaraCartao(v) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function mascaraValidade(v) {
  return v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");
}

// QR code determinístico — padrão fixo de 7x7 bits (sem Math.random no render)
const QR_BITS = [
  [1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1],
  [1,0,1,1,0,0,1],
  [1,0,0,1,0,0,1],
  [1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1],
];

function gerarCodigoPix() {
  const rand = Math.random().toString(36).substring(2, 14).toUpperCase();
  return `00020126580014BR.GOV.BCB.PIX0136${rand}5204000053039865802BR5925BANCO PORTFOLIO6009SAO PAULO62070503***6304ABCD`;
}
function gerarLinhaBoleto() {
  const n = () => Math.floor(Math.random() * 1e5).toString().padStart(5, "0");
  return `34191.${n()} ${n()}.${n()} ${n()}.${n()} 1 ${Date.now().toString().slice(-14)}`;
}

function labelMetodo(m) {
  return { cartao: "Cartão de crédito", pix: "PIX", boleto: "Boleto bancário",
           "pix-saque": "PIX", bancario: "Conta bancária", dinheiro: "Dinheiro (caixa)" }[m] || m;
}

// Rótulo do canal salvo no backend (PIX|BOLETO|CARTAO|TED|ESPECIE)
function canalLabel(m) {
  return { PIX: "Pix", BOLETO: "Boleto", CARTAO: "Cartão", TED: "TED", ESPECIE: "Espécie" }[m] || (m || "—");
}

// ─── Linha de resumo ──────────────────────────────────────────────────────────
function LinhaResumo({ label, valor, destaque }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"10px 0", borderBottom:"1px solid var(--border-soft)", fontSize:"0.88rem" }}>
      <span style={{ color:"var(--muted)" }}>{label}</span>
      <span style={{ color: destaque ? "#fff" : "var(--text)", fontWeight: destaque ? 700 : 400,
                     fontSize: destaque ? "1rem" : "inherit", fontVariantNumeric:"tabular-nums" }}>
        {valor}
      </span>
    </div>
  );
}

// ─── Modal de pagamento (multi-etapa) ─────────────────────────────────────────
function ModalPagamento({ aberto, onFechar, onConfirmar, titulo, valor, saldoAtual, saldoApos, tipo, carregando, aviso }) {
  const [etapa, setEtapa] = useState("metodo");
  const [metodo, setMetodo] = useState(null);
  const [cartao, setCartao] = useState({ numero:"", nome:"", validade:"", cvv:"" });
  const [erroCartao, setErroCartao] = useState({});
  const [chavePix, setChavePix] = useState("");
  const [erroChave, setErroChave] = useState("");
  const [dadosBanc, setDadosBanc] = useState({ banco:"", agencia:"", conta:"" });
  const [erroBanc, setErroBanc] = useState({});
  const [copiado, setCopiado] = useState(false);
  const pixCode = useRef("");
  const boletoCode = useRef("");

  const eDeposito = tipo === "deposito";

  // Reset completo ao abrir
  useEffect(() => {
    if (!aberto) return;
    setEtapa("metodo"); setMetodo(null);
    setCartao({ numero:"", nome:"", validade:"", cvv:"" }); setErroCartao({});
    setChavePix(""); setErroChave("");
    setDadosBanc({ banco:"", agencia:"", conta:"" }); setErroBanc({});
    setCopiado(false);
    pixCode.current = gerarCodigoPix();
    boletoCode.current = gerarLinhaBoleto();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => { if (e.key === "Escape" && !carregando) onFechar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, carregando, onFechar]);

  if (!aberto) return null;

  // Métodos disponíveis por operação
  const metodosDeposito = [
    { id:"cartao",  label:"Cartão de crédito", sub:"Débito imediato na fatura",      Ico:IcoCartao,  cor:"#6b93cf", bgIco:"rgba(107,147,207,0.15)" },
    { id:"pix",     label:"PIX",               sub:"Transferência instantânea",       Ico:IcoPix,     cor:"#32bcad", bgIco:"rgba(50,188,173,0.15)" },
    { id:"boleto",  label:"Boleto bancário",   sub:"Compensação em 1 dia útil",       Ico:IcoBoleto,  cor:"#e0a84b", bgIco:"rgba(224,168,75,0.15)" },
  ];
  const metodosSaque = [
    { id:"pix-saque", label:"PIX",               sub:"Crédito instantâneo",            Ico:IcoPix,     cor:"#32bcad", bgIco:"rgba(50,188,173,0.15)" },
    { id:"bancario",  label:"Conta bancária",    sub:"Crédito em 1 dia útil (TED)",    Ico:IcoBanco,   cor:"#6b93cf", bgIco:"rgba(107,147,207,0.15)" },
    { id:"dinheiro",  label:"Dinheiro (caixa)",  sub:"Retirada presencial na agência", Ico:IcoDinheiro,cor:"#e0a84b", bgIco:"rgba(224,168,75,0.15)" },
  ];
  const listaMet = eDeposito ? metodosDeposito : metodosSaque;

  // Etapas do stepper
  const ETAPAS = ["metodo", "dados", "confirmacao"];
  const idxEtapa = ETAPAS.indexOf(etapa);

  // Validações
  function validarCartao() {
    const e = {};
    if (cartao.numero.replace(/\s/g,"").length < 16) e.numero = "Número inválido.";
    if (!cartao.nome.trim())                          e.nome   = "Informe o nome impresso no cartão.";
    if (cartao.validade.length < 5)                  e.validade = "Use o formato MM/AA.";
    if (cartao.cvv.length < 3)                       e.cvv    = "CVV inválido.";
    setErroCartao(e);
    return !Object.keys(e).length;
  }
  function validarBancario() {
    const e = {};
    if (!dadosBanc.banco.trim())   e.banco   = "Informe o banco.";
    if (!dadosBanc.agencia.trim()) e.agencia = "Informe a agência.";
    if (!dadosBanc.conta.trim())   e.conta   = "Informe o número da conta.";
    setErroBanc(e);
    return !Object.keys(e).length;
  }

  function temDados(m) {
    return ["cartao","pix","boleto","pix-saque","bancario"].includes(m);
  }

  function avancar() {
    if (metodo === "cartao"    && !validarCartao())    return;
    if (metodo === "pix-saque" && !chavePix.trim())    { setErroChave("Informe a chave PIX."); return; }
    if (metodo === "bancario"  && !validarBancario())  return;
    setEtapa("confirmacao");
  }

  async function confirmar() {
    // mapeia o método da UI para o enum do backend + monta o detalhe
    const mapa = { cartao: "CARTAO", pix: "PIX", boleto: "BOLETO",
                   "pix-saque": "PIX", bancario: "TED", dinheiro: "ESPECIE" };
    const metodoBackend = mapa[metodo] || "ESPECIE";
    let detalhe = null;
    if (metodo === "pix-saque" && chavePix) detalhe = `Chave PIX: ${chavePix}`;
    else if (metodo === "cartao" && cartao.numero) detalhe = `Cartão final ${cartao.numero.replace(/\s/g, "").slice(-4)}`;
    else if (metodo === "bancario") detalhe = `${dadosBanc.banco} Ag ${dadosBanc.agencia}/Cc ${dadosBanc.conta}`;
    try {
      await onConfirmar(metodoBackend, detalhe);
      setEtapa("sucesso");
    } catch (_) {
      // erro já tratado pelo pai, modal não avança
    }
  }

  function copiar(texto) {
    navigator.clipboard?.writeText(texto).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  // Cor e texto do botão de confirmação final
  const btnConfirmClass = eDeposito ? "mpag-btn-deposito" : "mpag-btn-saque";
  const btnConfirmLabel = carregando ? "Processando…" : (eDeposito ? "Confirmar depósito" : "Confirmar saque");

  return (
    <div className="mpag-overlay" onClick={() => !carregando && onFechar()}>
      <div className="mpag-box" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="mpag-header">
          {etapa !== "metodo" && etapa !== "sucesso" && (
            <button className="mpag-voltar" onClick={() => setEtapa(etapa === "confirmacao" ? (temDados(metodo) ? "dados" : "metodo") : "metodo")}>
              ←
            </button>
          )}
          <span className="mpag-titulo">
            {etapa === "metodo"      && titulo}
            {etapa === "dados"       && { cartao:"Dados do cartão", pix:"Código PIX", boleto:"Boleto", "pix-saque":"Chave PIX", bancario:"Dados bancários", dinheiro:"Retirada em espécie" }[metodo]}
            {etapa === "confirmacao" && "Revisar e confirmar"}
            {etapa === "sucesso"     && (eDeposito ? "Depósito realizado!" : "Saque realizado!")}
          </span>
          <button className="mpag-fechar" onClick={() => !carregando && onFechar()} aria-label="Fechar">✕</button>
        </div>

        {/* ── Stepper ── */}
        {etapa !== "sucesso" && (
          <div className="mpag-stepper">
            {ETAPAS.map((s, i) => (
              <div key={s} className={["mpag-step", i === idxEtapa ? "mpag-step-ativo" : i < idxEtapa ? "mpag-step-feito" : ""].join(" ")}>
                <div className="mpag-step-c">{i < idxEtapa ? "✓" : i + 1}</div>
                <span>{["Método","Dados","Confirmar"][i]}</span>
                {i < 2 && <div className="mpag-step-linha" style={{ background: i < idxEtapa ? "var(--primary)" : "var(--border)" }} />}
              </div>
            ))}
          </div>
        )}

        <div className="mpag-corpo">

          {/* ════ ETAPA 1 — Escolha do método ════ */}
          {etapa === "metodo" && (
            <>
              <p className="mpag-desc">
                {eDeposito
                  ? <><strong style={{color:"var(--text)"}}>Depositando {brl(valor)}</strong> — escolha como deseja pagar.</>
                  : <><strong style={{color:"var(--text)"}}>Sacando {brl(valor)}</strong> — escolha como deseja receber.</>
                }
              </p>
              <div className="mpag-metodos">
                {listaMet.map(({ id, label, sub, Ico, cor, bgIco }) => (
                  <button
                    key={id}
                    className={"mpag-met-btn" + (metodo === id ? " mpag-met-sel" : "")}
                    style={metodo === id ? { borderColor: cor, boxShadow: `0 0 0 3px ${cor}22` } : {}}
                    onClick={() => setMetodo(id)}
                  >
                    <span className="mpag-met-ico" style={{ background: bgIco, color: cor }}>
                      <Ico />
                    </span>
                    <span className="mpag-met-info">
                      <span className="mpag-met-nome">{label}</span>
                      <span className="mpag-met-sub">{sub}</span>
                    </span>
                    <span className="mpag-met-radio" style={metodo === id ? { background: cor, borderColor: cor } : {}}>
                      {metodo === id && <span style={{ width:8, height:8, borderRadius:"50%", background:"#fff", display:"block" }} />}
                    </span>
                  </button>
                ))}
              </div>
              <button className="mpag-btn-pri" disabled={!metodo}
                onClick={() => setEtapa(temDados(metodo) ? "dados" : "confirmacao")}>
                Continuar →
              </button>
            </>
          )}

          {/* ════ ETAPA 2 — Dados do método ════ */}
          {etapa === "dados" && (
            <>
              {/* CARTÃO */}
              {metodo === "cartao" && (
                <div className="mpag-form">
                  <div className="mpag-cartao-vis">
                    <div className="mpag-cartao-chip">▮▮▮</div>
                    <div className="mpag-cartao-num">
                      {cartao.numero.padEnd(19, " ").replace(/(.{4})/g, "$1 ").trim() || "•••• •••• •••• ••••"}
                    </div>
                    <div className="mpag-cartao-rodape">
                      <div>
                        <div className="mpag-cartao-rl">Nome</div>
                        <div className="mpag-cartao-rv">{cartao.nome || "NOME NO CARTÃO"}</div>
                      </div>
                      <div>
                        <div className="mpag-cartao-rl">Validade</div>
                        <div className="mpag-cartao-rv">{cartao.validade || "MM/AA"}</div>
                      </div>
                    </div>
                  </div>
                  <label>Número do cartão</label>
                  <input maxLength={19} placeholder="0000 0000 0000 0000" value={cartao.numero}
                    onChange={(e) => setCartao({ ...cartao, numero: mascaraCartao(e.target.value) })} />
                  {erroCartao.numero && <span className="campo-erro">{erroCartao.numero}</span>}
                  <label>Nome impresso no cartão</label>
                  <input placeholder="NOME SOBRENOME" value={cartao.nome}
                    onChange={(e) => setCartao({ ...cartao, nome: e.target.value.toUpperCase() })} />
                  {erroCartao.nome && <span className="campo-erro">{erroCartao.nome}</span>}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div>
                      <label>Validade</label>
                      <input placeholder="MM/AA" maxLength={5} value={cartao.validade}
                        onChange={(e) => setCartao({ ...cartao, validade: mascaraValidade(e.target.value) })} />
                      {erroCartao.validade && <span className="campo-erro">{erroCartao.validade}</span>}
                    </div>
                    <div>
                      <label>CVV</label>
                      <input placeholder="123" maxLength={4} value={cartao.cvv} type="password"
                        onChange={(e) => setCartao({ ...cartao, cvv: e.target.value.replace(/\D/g,"").slice(0,4) })} />
                      {erroCartao.cvv && <span className="campo-erro">{erroCartao.cvv}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* PIX depósito */}
              {metodo === "pix" && (
                <div className="mpag-pix">
                  <div className="mpag-qr">
                    {QR_BITS.map((row, r) => (
                      <div key={r} className="mpag-qr-row">
                        {row.map((cel, c) => (
                          <div key={c} className="mpag-qr-cel" style={{ background: cel ? "#111" : "#fff" }} />
                        ))}
                      </div>
                    ))}
                  </div>
                  <p className="mpag-pix-hint">Escaneie com o app do seu banco</p>
                  <p className="mpag-pix-ou">— ou copie o código —</p>
                  <div className="mpag-codigo-box">
                    <code className="mpag-codigo">{pixCode.current.slice(0, 44)}…</code>
                    <button className="mpag-btn-copiar" onClick={() => copiar(pixCode.current)}>
                      {copiado ? "✓ Copiado" : "Copiar"}
                    </button>
                  </div>
                  <p className="mpag-pix-info">
                    Após pagar, clique em <strong>Continuar →</strong> para registrar o depósito.
                  </p>
                </div>
              )}

              {/* Boleto */}
              {metodo === "boleto" && (
                <div className="mpag-boleto">
                  <div className="mpag-boleto-barras">
                    {[3,1,2,3,1,2,1,3,1,2,3,1,3,2,1,2,3,1,2,1,3,2,1,3,1,2,3,1,2,1].map((w, i) => (
                      <div key={i} style={{ width: w * 2, background:"var(--text)", height: i % 4 === 0 ? 52 : 36, borderRadius:1 }} />
                    ))}
                  </div>
                  <div className="mpag-boleto-meta">
                    <span>Valor: <strong>{brl(valor)}</strong></span>
                    <span>Vence: <strong>{new Date(Date.now() + 86400000).toLocaleDateString("pt-BR")}</strong></span>
                  </div>
                  <div className="mpag-codigo-box">
                    <code className="mpag-codigo">{boletoCode.current}</code>
                    <button className="mpag-btn-copiar" onClick={() => copiar(boletoCode.current)}>
                      {copiado ? "✓ Copiado" : "Copiar"}
                    </button>
                  </div>
                  <p className="mpag-pix-info">
                    Pague em qualquer banco ou app. Após o pagamento, clique em <strong>Continuar →</strong>.
                  </p>
                </div>
              )}

              {/* PIX saque */}
              {metodo === "pix-saque" && (
                <div className="mpag-form">
                  <p className="mpag-desc">Informe a chave PIX para receber o valor.</p>
                  <label>Chave PIX</label>
                  <input placeholder="CPF, e-mail, telefone ou chave aleatória"
                    value={chavePix} onChange={(e) => { setChavePix(e.target.value); setErroChave(""); }} />
                  {erroChave && <span className="campo-erro">{erroChave}</span>}
                </div>
              )}

              {/* Conta bancária */}
              {metodo === "bancario" && (
                <div className="mpag-form">
                  <label>Banco</label>
                  <input placeholder="ex: Itaú, Bradesco, Nubank…" value={dadosBanc.banco}
                    onChange={(e) => setDadosBanc({ ...dadosBanc, banco: e.target.value })} />
                  {erroBanc.banco && <span className="campo-erro">{erroBanc.banco}</span>}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div>
                      <label>Agência</label>
                      <input placeholder="0000" value={dadosBanc.agencia}
                        onChange={(e) => setDadosBanc({ ...dadosBanc, agencia: e.target.value.replace(/\D/g,"") })} />
                      {erroBanc.agencia && <span className="campo-erro">{erroBanc.agencia}</span>}
                    </div>
                    <div>
                      <label>Conta</label>
                      <input placeholder="00000-0" value={dadosBanc.conta}
                        onChange={(e) => setDadosBanc({ ...dadosBanc, conta: e.target.value })} />
                      {erroBanc.conta && <span className="campo-erro">{erroBanc.conta}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Dinheiro */}
              {metodo === "dinheiro" && (
                <div className="mpag-aviso-info">
                  💵 Dirija-se a uma agência ou caixa eletrônico com documento de identidade para retirar o valor em espécie. O saldo será debitado imediatamente.
                </div>
              )}

              <button className="mpag-btn-pri" style={{ marginTop: 16 }} onClick={avancar}>
                Continuar →
              </button>
            </>
          )}

          {/* ════ ETAPA 3 — Confirmação ════ */}
          {etapa === "confirmacao" && (
            <>
              <div className={"mpag-conf-ico " + (eDeposito ? "mpag-conf-dep" : "mpag-conf-saq")}>
                {eDeposito ? "↓" : "↑"}
              </div>

              <div className="mpag-resumo">
                <LinhaResumo label="Operação"  valor={eDeposito ? "Depósito" : "Saque"} />
                <LinhaResumo label="Método"    valor={labelMetodo(metodo)} />
                {metodo === "cartao" && cartao.numero && (
                  <LinhaResumo label="Cartão" valor={`•••• •••• •••• ${cartao.numero.replace(/\s/g,"").slice(-4)}`} />
                )}
                {metodo === "pix-saque" && chavePix && (
                  <LinhaResumo label="Chave PIX" valor={chavePix} />
                )}
                {metodo === "bancario" && (
                  <LinhaResumo label="Banco / Conta" valor={`${dadosBanc.banco} — Ag ${dadosBanc.agencia} / Cc ${dadosBanc.conta}`} />
                )}
                <LinhaResumo label="Saldo atual" valor={brl(saldoAtual)} />
                <LinhaResumo label="Valor"       valor={brl(valor)} destaque />
                <div style={{ height:1, background:"var(--border)", margin:"4px 0" }} />
                <LinhaResumo label="Saldo resultante" valor={brl(saldoApos)} destaque />
              </div>

              {aviso && (
                <div className="mpag-aviso">{aviso}</div>
              )}

              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <button className="mpag-btn-sec" onClick={() => setEtapa(temDados(metodo) ? "dados" : "metodo")} disabled={carregando}>
                  Voltar
                </button>
                <button className={btnConfirmClass} onClick={confirmar} disabled={carregando}>
                  {btnConfirmLabel}
                </button>
              </div>
            </>
          )}

          {/* ════ ETAPA 4 — Sucesso ════ */}
          {etapa === "sucesso" && (
            <div className="mpag-sucesso">
              <div className="mpag-sucesso-ico">✓</div>
              <h3 className="mpag-sucesso-titulo">{eDeposito ? "Depósito realizado!" : "Saque realizado!"}</h3>
              <p className="mpag-sucesso-desc">
                {brl(valor)} {eDeposito ? "creditado" : "debitado"} com sucesso via <strong>{labelMetodo(metodo)}</strong>.
              </p>
              <div className="mpag-sucesso-saldo">
                Novo saldo:{" "}
                <span style={{ color: Number(saldoApos) < 0 ? "var(--neg)" : "var(--pos)", fontWeight:700 }}>
                  {brl(saldoApos)}
                </span>
              </div>
              <button className="mpag-btn-pri" style={{ marginTop: 24 }} onClick={onFechar}>
                Fechar
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Estilos do modal ── */}
      <style>{`
        .mpag-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(6px) saturate(120%);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: mpFadeIn 0.15s ease;
        }
        @keyframes mpFadeIn { from { opacity:0 } to { opacity:1 } }

        .mpag-box {
          background: linear-gradient(165deg, #1b2433, #141a23);
          border: 1px solid #27313f;
          border-radius: 22px;
          width: 100%; max-width: 460px;
          max-height: 92vh; overflow-y: auto;
          box-shadow: 0 32px 80px -12px rgba(0,0,0,0.9);
          animation: mpSlideUp 0.2s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes mpSlideUp { from { transform:translateY(24px);opacity:0 } to { transform:translateY(0);opacity:1 } }

        .mpag-header {
          display: flex; align-items: center; gap: 8px;
          padding: 20px 20px 0;
          position: sticky; top: 0; background: #1b2433; z-index: 2; border-radius: 22px 22px 0 0;
        }
        .mpag-titulo { flex:1; font-size:1.05rem; font-weight:700; color:#fff; }
        .mpag-voltar, .mpag-fechar {
          background: rgba(255,255,255,0.07); border: none; color: var(--muted);
          width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
          margin: 0; padding: 0; font-size: 0.95rem; box-shadow: none;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: background 0.15s, color 0.15s;
        }
        .mpag-voltar:hover, .mpag-fechar:hover { background: rgba(255,255,255,0.14); color: #fff; }

        /* Stepper */
        .mpag-stepper {
          display: flex; align-items: flex-start; justify-content: center;
          padding: 18px 24px 0; gap: 0;
        }
        .mpag-step {
          display: flex; flex-direction: column; align-items: center;
          gap: 5px; flex: 1; font-size: 0.7rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--faint); position: relative;
        }
        .mpag-step-linha {
          position: absolute; top: 13px; left: calc(50% + 14px);
          width: calc(100% - 28px); height: 1px; transition: background 0.3s;
        }
        .mpag-step-c {
          width: 26px; height: 26px; border-radius: 50%;
          border: 2px solid var(--border); background: var(--surface);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.78rem; font-weight: 700; z-index: 1;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
        }
        .mpag-step-ativo .mpag-step-c { border-color: var(--primary); color: var(--primary); background: rgba(63,111,176,0.15); }
        .mpag-step-ativo { color: var(--text); }
        .mpag-step-feito .mpag-step-c { border-color: var(--pos); background: rgba(75,171,128,0.15); color: var(--pos); }
        .mpag-step-feito { color: var(--pos); }

        .mpag-corpo { padding: 18px 22px 22px; }
        .mpag-desc { color: var(--muted); font-size: 0.9rem; margin: 0 0 16px; line-height: 1.5; }

        /* Grid de métodos */
        .mpag-metodos { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
        .mpag-met-btn {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; border-radius: 14px;
          background: rgba(255,255,255,0.03); border: 1.5px solid var(--border);
          cursor: pointer; text-align: left; width: 100%;
          margin: 0; box-shadow: none; color: var(--text);
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .mpag-met-btn:hover { background: rgba(255,255,255,0.06); }
        .mpag-met-ico {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .mpag-met-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .mpag-met-nome { font-weight: 600; font-size: 0.95rem; }
        .mpag-met-sub  { font-size: 0.78rem; color: var(--muted); }
        .mpag-met-radio {
          width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: border-color 0.15s, background 0.15s;
        }

        /* Botões */
        .mpag-btn-pri {
          width: 100%; padding: 13px; border-radius: 12px; border: none; margin: 0;
          background: linear-gradient(180deg, var(--primary-2), var(--primary));
          color: #fff; font-weight: 700; font-size: 0.97rem; cursor: pointer;
          box-shadow: 0 6px 20px -6px rgba(63,111,176,0.5);
          transition: filter 0.15s;
        }
        .mpag-btn-pri:hover { filter: brightness(1.08); }
        .mpag-btn-pri:disabled { background: #232c38; color: var(--faint); cursor: not-allowed; box-shadow: none; filter: none; }

        .mpag-btn-sec {
          flex: 1; padding: 12px; border-radius: 11px; border: 1px solid var(--border); margin: 0;
          background: rgba(255,255,255,0.05); color: var(--muted);
          font-weight: 600; font-size: 0.92rem; cursor: pointer; box-shadow: none;
          transition: background 0.15s, color 0.15s;
        }
        .mpag-btn-sec:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: var(--text); }

        .mpag-btn-deposito {
          flex: 2; padding: 12px; border-radius: 11px; border: none; margin: 0;
          background: linear-gradient(180deg, #5fc494, #3d9168); color: #fff;
          font-weight: 700; font-size: 0.92rem; cursor: pointer;
          box-shadow: 0 6px 16px -6px rgba(63,171,128,0.5); transition: filter 0.15s;
        }
        .mpag-btn-deposito:hover:not(:disabled) { filter: brightness(1.08); }
        .mpag-btn-deposito:disabled { background: #232c38; color: var(--faint); cursor: not-allowed; box-shadow: none; }

        .mpag-btn-saque {
          flex: 2; padding: 12px; border-radius: 11px; border: none; margin: 0;
          background: linear-gradient(180deg, #d9808c, #b55562); color: #fff;
          font-weight: 700; font-size: 0.92rem; cursor: pointer;
          box-shadow: 0 6px 16px -6px rgba(207,111,124,0.5); transition: filter 0.15s;
        }
        .mpag-btn-saque:hover:not(:disabled) { filter: brightness(1.08); }
        .mpag-btn-saque:disabled { background: #232c38; color: var(--faint); cursor: not-allowed; box-shadow: none; }

        /* Formulário */
        .mpag-form { display: flex; flex-direction: column; }

        /* Cartão visual */
        .mpag-cartao-vis {
          background: linear-gradient(135deg, #1e3a6e 0%, #2d5fa8 50%, #1a4a8a 100%);
          border-radius: 14px; padding: 18px 20px; margin-bottom: 16px;
          min-height: 110px; display: flex; flex-direction: column; justify-content: space-between;
          box-shadow: 0 10px 30px -8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1);
          position: relative; overflow: hidden;
        }
        .mpag-cartao-vis::before {
          content: ""; position: absolute; top: -30px; right: -30px;
          width: 120px; height: 120px; border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }
        .mpag-cartao-chip { font-size: 0.7rem; color: rgba(255,255,255,0.6); letter-spacing: 0.1em; }
        .mpag-cartao-num  { font-family: monospace; font-size: 1.1rem; letter-spacing: 0.2em; color: rgba(255,255,255,0.95); }
        .mpag-cartao-rodape { display: flex; justify-content: space-between; }
        .mpag-cartao-rl { font-size: 0.65rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.06em; }
        .mpag-cartao-rv { font-size: 0.82rem; color: rgba(255,255,255,0.9); font-weight: 600; margin-top: 2px; }

        /* PIX */
        .mpag-pix { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .mpag-qr  { background: #fff; padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 3px; }
        .mpag-qr-row { display: flex; gap: 3px; }
        .mpag-qr-cel { width: 16px; height: 16px; border-radius: 2px; }
        .mpag-pix-hint { color: var(--muted); font-size: 0.82rem; margin: 0; text-align: center; }
        .mpag-pix-ou   { color: var(--faint); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; margin: 0; }
        .mpag-pix-info { color: var(--muted); font-size: 0.82rem; text-align: center; margin: 0; }
        .mpag-pix-info strong { color: var(--text); }

        .mpag-codigo-box {
          width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-soft);
          border-radius: 10px; padding: 10px 12px; display: flex; align-items: center; gap: 10px;
        }
        .mpag-codigo { font-family: monospace; font-size: 0.7rem; color: var(--muted); flex: 1; word-break: break-all; }
        .mpag-btn-copiar {
          flex-shrink: 0; padding: 6px 12px; margin: 0; border-radius: 8px;
          background: rgba(50,188,173,0.15); color: #32bcad;
          border: 1px solid rgba(50,188,173,0.3); font-size: 0.8rem; font-weight: 600;
          cursor: pointer; box-shadow: none; white-space: nowrap; transition: background 0.15s;
        }
        .mpag-btn-copiar:hover { background: rgba(50,188,173,0.28); }

        /* Boleto */
        .mpag-boleto { display: flex; flex-direction: column; gap: 12px; }
        .mpag-boleto-barras {
          display: flex; align-items: flex-end; gap: 2px;
          background: rgba(0,0,0,0.25); border-radius: 8px; padding: 10px 14px; overflow: hidden;
        }
        .mpag-boleto-meta { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--muted); }
        .mpag-boleto-meta strong { color: var(--text); }

        /* Aviso info */
        .mpag-aviso-info {
          padding: 14px 16px; border-radius: 12px;
          background: rgba(63,111,176,0.1); border: 1px solid rgba(63,111,176,0.2);
          color: var(--primary-2); font-size: 0.9rem; line-height: 1.55;
        }

        /* Confirmação */
        .mpag-conf-ico {
          width: 54px; height: 54px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem; font-weight: 800; margin: 0 auto 16px;
        }
        .mpag-conf-dep { background: rgba(75,171,128,0.15); color: var(--pos); }
        .mpag-conf-saq { background: rgba(207,111,124,0.15); color: var(--neg); }

        .mpag-resumo {
          background: rgba(0,0,0,0.28); border: 1px solid var(--border-soft);
          border-radius: 12px; padding: 4px 14px;
        }
        .mpag-resumo > div:last-child { border-bottom: none !important; }

        .mpag-aviso {
          margin-top: 12px; padding: 10px 14px; border-radius: 10px;
          background: rgba(207,111,124,0.1); border: 1px solid rgba(207,111,124,0.25);
          color: #fca5b0; font-size: 0.85rem;
        }

        /* Sucesso */
        .mpag-sucesso { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 8px 0 4px; }
        .mpag-sucesso-ico {
          width: 68px; height: 68px; border-radius: 50%;
          background: rgba(75,171,128,0.15); border: 2px solid var(--pos);
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; color: var(--pos); margin-bottom: 18px;
          animation: mpPop 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes mpPop { from { transform:scale(0.4); opacity:0 } to { transform:scale(1); opacity:1 } }
        .mpag-sucesso-titulo { margin: 0 0 8px; font-size: 1.25rem; font-weight: 700; color: #fff; }
        .mpag-sucesso-desc   { margin: 0 0 10px; color: var(--muted); font-size: 0.9rem; }
        .mpag-sucesso-desc strong { color: var(--text); }
        .mpag-sucesso-saldo  { font-size: 0.9rem; color: var(--muted); }
      `}</style>
    </div>
  );
}

// ─── Modal de transferência (review → comprovante) ────────────────────────────
function ModalSimples({ aberto, onFechar, onConfirmar, carregando, titulo,
                        labelConfirmar = "Confirmar", children, sucesso }) {
  const [fase, setFase] = useState("review");
  useEffect(() => { if (aberto) setFase("review"); }, [aberto]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => { if (e.key === "Escape" && !carregando) onFechar(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, carregando, onFechar]);
  if (!aberto) return null;

  async function conf() {
    try { await onConfirmar(); setFase("sucesso"); } catch (_) { /* erro tratado pelo pai */ }
  }

  return (
    <div className="mpag-overlay" onClick={() => !carregando && onFechar()}>
      <div className="mpag-box" onClick={(e) => e.stopPropagation()}>
        <div className="mpag-header">
          <span className="mpag-titulo">{fase === "sucesso" ? "Comprovante" : titulo}</span>
          <button className="mpag-fechar" onClick={() => !carregando && onFechar()}>✕</button>
        </div>
        <div className="mpag-corpo">
          {fase === "review" ? (
            <>
              {children}
              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <button className="mpag-btn-sec" onClick={onFechar} disabled={carregando}>Cancelar</button>
                <button className="mpag-btn-deposito" onClick={conf} disabled={carregando}>
                  {carregando ? "Processando…" : labelConfirmar}
                </button>
              </div>
            </>
          ) : (
            <>
              {sucesso}
              <button className="mpag-btn-pri" style={{ marginTop:20 }} onClick={onFechar}>Fechar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function ContaDetalhePage() {
  useRequireAuth();
  const { id } = useParams();

  const [conta, setConta]     = useState(null);
  const [outras, setOutras]   = useState([]);
  const [extrato, setExtrato] = useState([]);
  const [razao, setRazao]     = useState([]);
  const [msg, setMsg]         = useState(null);

  const [dep, setDep]     = useState("");
  const [saq, setSaq]     = useState("");
  const [transf, setTransf] = useState({ destino:"", valor:"", metodo:"PIX", descricao:"" });

  const [modalDep,    setModalDep]    = useState(false);
  const [modalSaq,    setModalSaq]    = useState(false);
  const [modalTransf, setModalTransf] = useState(false);
  const [carregando,  setCarregando]  = useState(false);

  const [erroDep,    setErroDep]    = useState("");
  const [erroSaq,    setErroSaq]    = useState("");
  const [erroTransf, setErroTransf] = useState("");

  async function recarregar() {
    try {
      const [c, todas, ext, raz] = await Promise.all([
        api.conta(id), api.listarContas(), api.extrato(id), api.razao(id),
      ]);
      setConta(c);
      setOutras(todas.filter((x) => String(x.id) !== String(id)));
      setExtrato(ext);
      setRazao(raz);
    } catch (e) {
      setMsg({ tipo:"erro", texto: e.message });
    }
  }

  useEffect(() => { recarregar(); }, [id]);

  async function executar(fn, limpar) {
    setCarregando(true);
    setMsg(null);
    try {
      await fn();
      limpar();
      await recarregar();
      setMsg({ tipo:"ok", texto:"Operação realizada com sucesso." });
    } catch (e) {
      setMsg({ tipo:"erro", texto: e.message });
      throw e;
    } finally {
      setCarregando(false);
    }
  }

  function abrirDep() {
    const v = Number(dep);
    if (!dep || isNaN(v) || v <= 0) { setErroDep("Informe um valor maior que zero."); return; }
    setErroDep(""); setModalDep(true);
  }
  function abrirSaq() {
    const v = Number(saq);
    if (!saq || isNaN(v) || v <= 0) { setErroSaq("Informe um valor maior que zero."); return; }
    if (conta && Number(conta.saldo) + Number(conta.limite) < v) {
      setErroSaq("Valor excede o saldo disponível (incluindo limite)."); return;
    }
    setErroSaq(""); setModalSaq(true);
  }
  function abrirTransf() {
    const v = Number(transf.valor);
    if (!transf.destino)                         { setErroTransf("Selecione a conta destino."); return; }
    if (!transf.valor || isNaN(v) || v <= 0)     { setErroTransf("Informe um valor maior que zero."); return; }
    if (conta && Number(conta.saldo) + Number(conta.limite) < v) {
      setErroTransf("Valor excede o saldo disponível."); return;
    }
    setErroTransf(""); setModalTransf(true);
  }

  if (!conta) return <p className="muted">Carregando…</p>;

  const negativo        = Number(conta.saldo) < 0;
  const saldoDisponivel = Number(conta.saldo) + Number(conta.limite);
  const t   = conta.titular || {};
  const pj  = t.tipo === "JURIDICA";
  const pct = (v) => (Number(v) * 100).toLocaleString("pt-BR", { maximumFractionDigits:2 }) + "%";
  const ctDest = outras.find((o) => String(o.id) === String(transf.destino));

  return (
    <>
      <h1>Conta {conta.numero}</h1>

      {/* Info da conta */}
      <div className="card">
        <div className="muted">
          {t.nome} · {pj ? "Pessoa jurídica" : "Pessoa física"} · {pj ? "CNPJ" : "CPF"}: {t.documento || "—"}
        </div>
        <div className={"saldo" + (negativo ? " negativo" : "")}>{brl(conta.saldo)}</div>
        <div className="row" style={{ marginTop:12 }}>
          <div className="muted">Limite: <strong>{brl(conta.limite)}</strong></div>
          <div className="muted">Disponível: <strong>{brl(saldoDisponivel)}</strong></div>
          <div className="muted">Juros ch. especial: <strong>{pct(conta.taxaChequeEspecial)}/mês</strong></div>
          <div className="muted">Telefone: <strong>{t.telefone || "—"}</strong></div>
          <div className="muted">Aberta em: <strong>{conta.criadaEm ? new Date(conta.criadaEm).toLocaleDateString("pt-BR") : "—"}</strong></div>
        </div>
        {msg && <div className={msg.tipo}>{msg.texto}</div>}
      </div>

      {/* Gráfico */}
      {extrato.length >= 2 && (
        <div className="card">
          <h2>Evolução do saldo</h2>
          <LineChart pontos={[...extrato].reverse().map((t) => t.saldoApos)} />
        </div>
      )}

      {/* Depósito + Saque */}
      <div className="row">
        <div className="card pg-op-card">
          <div className="pg-op-ico pg-op-dep">↓</div>
          <h2>Depósito</h2>
          <p className="muted" style={{ fontSize:"0.88rem", margin:"0 0 8px" }}>
            Adicione fundos via cartão, PIX ou boleto.
          </p>
          <label>Valor a depositar</label>
          <CampoMoeda value={dep} onChange={(v) => { setDep(v); setErroDep(""); }}
            onKeyDown={(e) => e.key === "Enter" && abrirDep()} />
          {erroDep && <span className="campo-erro">{erroDep}</span>}
          <div className="pg-info-row">
            <span className="muted">Saldo atual</span>
            <span style={{ color: negativo ? "var(--neg)" : "var(--pos)", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{brl(conta.saldo)}</span>
          </div>
          {dep && Number(dep) > 0 && (
            <div className="pg-info-row" style={{ borderBottom:"none" }}>
              <span className="muted">Saldo após depósito</span>
              <span style={{ color:"var(--pos)", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{brl(Number(conta.saldo) + Number(dep))}</span>
            </div>
          )}
          <button className="pg-btn-dep" onClick={abrirDep}>Depositar</button>
        </div>

        <div className="card pg-op-card">
          <div className="pg-op-ico pg-op-saq">↑</div>
          <h2>Saque</h2>
          <p className="muted" style={{ fontSize:"0.88rem", margin:"0 0 8px" }}>
            Retire via PIX, conta bancária ou em espécie.
          </p>
          <label>Valor a sacar</label>
          <CampoMoeda value={saq} onChange={(v) => { setSaq(v); setErroSaq(""); }}
            onKeyDown={(e) => e.key === "Enter" && abrirSaq()} />
          {erroSaq && <span className="campo-erro">{erroSaq}</span>}
          <div className="pg-info-row">
            <span className="muted">Disponível para saque</span>
            <span style={{ color: saldoDisponivel < 0 ? "var(--neg)" : "var(--pos)", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{brl(saldoDisponivel)}</span>
          </div>
          {saq && Number(saq) > 0 && (
            <div className="pg-info-row" style={{ borderBottom:"none" }}>
              <span className="muted">Saldo após saque</span>
              <span style={{ color: Number(conta.saldo)-Number(saq) < 0 ? "var(--neg)" : "var(--pos)", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>
                {brl(Number(conta.saldo) - Number(saq))}
              </span>
            </div>
          )}
          <button className="pg-btn-saq" onClick={abrirSaq}>Sacar</button>
        </div>
      </div>

      {/* Transferência */}
      <div className="card pg-op-card">
        <div className="pg-op-ico" style={{ background:"rgba(63,111,176,0.15)", color:"var(--primary-2)" }}>⇄</div>
        <h2>Transferência</h2>
        <p className="muted" style={{ fontSize:"0.88rem", margin:"0 0 8px" }}>
          Envie para outra conta do banco via Pix (instantâneo) ou TED.
        </p>

        <label>Como transferir</label>
        <div className="seg" style={{ marginBottom:4 }}>
          <button type="button" className={transf.metodo === "PIX" ? "on" : ""}
            onClick={() => setTransf({ ...transf, metodo: "PIX" })}>
            <IcoPix /> Pix · instantâneo
          </button>
          <button type="button" className={transf.metodo === "TED" ? "on" : ""}
            onClick={() => setTransf({ ...transf, metodo: "TED" })}>
            <IcoBanco /> TED · 1 dia útil
          </button>
        </div>

        <div className="row">
          <div>
            <label>Conta destino</label>
            <select value={transf.destino}
              onChange={(e) => { setTransf({ ...transf, destino: e.target.value }); setErroTransf(""); }}>
              <option value="">selecione…</option>
              {outras.map((o) => (
                <option key={o.id} value={o.id}>{o.numero} — {o.clienteNome}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Valor</label>
            <CampoMoeda value={transf.valor} onChange={(v) => { setTransf({ ...transf, valor: v }); setErroTransf(""); }} />
          </div>
        </div>
        <label>Descrição <span className="muted">(opcional)</span></label>
        <input maxLength={120} placeholder="ex.: aluguel, divisão da conta…" value={transf.descricao}
          onChange={(e) => setTransf({ ...transf, descricao: e.target.value })} />

        {transf.valor && Number(transf.valor) > 0 && (
          <div className="pg-info-row" style={{ borderBottom:"none", marginTop:8 }}>
            <span className="muted">Saldo após transferência</span>
            <span style={{ color: Number(conta.saldo)-Number(transf.valor) < 0 ? "var(--neg)" : "var(--pos)", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>
              {brl(Number(conta.saldo) - Number(transf.valor))}
            </span>
          </div>
        )}
        {erroTransf && <span className="campo-erro">{erroTransf}</span>}
        <button disabled={!transf.destino || !transf.valor} onClick={abrirTransf} style={{ marginTop:16 }}>
          Revisar transferência
        </button>
      </div>

      {/* Extrato */}
      <div className="card">
        <h2>Extrato</h2>
        {extrato.length === 0 ? <p className="muted">Sem movimentações.</p> : (
          <table>
            <thead><tr><th>Data</th><th>Tipo</th><th>Canal</th><th>Valor</th><th>Saldo após</th></tr></thead>
            <tbody>
              {extrato.map((tx) => (
                <tr key={tx.id}>
                  <td>{new Date(tx.data).toLocaleString("pt-BR")}</td>
                  <td><span className="tag">{tx.tipo}</span></td>
                  <td title={tx.detalhe || ""}>
                    {tx.metodo ? canalLabel(tx.metodo) : "—"}
                    {tx.detalhe && <div className="muted" style={{ fontSize: "0.72rem" }}>{tx.detalhe}</div>}
                  </td>
                  <td>{brl(tx.valor)}</td>
                  <td>{brl(tx.saldoApos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Razão */}
      <div className="card">
        <h2>Razão contábil <span className="muted" style={{ fontSize:"0.6em" }}>(partidas dobradas)</span></h2>
        {razao.length === 0 ? <p className="muted">Sem lançamentos.</p> : (
          <table>
            <thead><tr><th>Data</th><th>Lote</th><th>D/C</th><th>Histórico</th><th>Valor</th></tr></thead>
            <tbody>
              {razao.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.data).toLocaleString("pt-BR")}</td>
                  <td>{l.lote}</td>
                  <td><span className="tag">{l.natureza === "D" ? "Débito" : "Crédito"}</span></td>
                  <td>{l.historico}</td>
                  <td>{brl(l.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ Modals ══ */}
      <ModalPagamento
        aberto={modalDep}
        onFechar={() => { if (!carregando) { setModalDep(false); setDep(""); } }}
        onConfirmar={(metodo, detalhe) => executar(
          () => api.deposito(id, Number(dep), metodo, detalhe),
          () => {}
        )}
        titulo="Depósito"
        valor={dep || 0}
        saldoAtual={conta.saldo}
        saldoApos={Number(conta.saldo) + Number(dep || 0)}
        tipo="deposito"
        carregando={carregando}
      />

      <ModalPagamento
        aberto={modalSaq}
        onFechar={() => { if (!carregando) { setModalSaq(false); setSaq(""); } }}
        onConfirmar={(metodo, detalhe) => executar(
          () => api.saque(id, Number(saq), metodo, detalhe),
          () => {}
        )}
        titulo="Saque"
        valor={saq || 0}
        saldoAtual={conta.saldo}
        saldoApos={Number(conta.saldo) - Number(saq || 0)}
        tipo="saque"
        carregando={carregando}
        aviso={Number(conta.saldo) - Number(saq || 0) < 0
          ? "⚠️ Esta operação utilizará o limite do cheque especial." : null}
      />

      <ModalSimples
        aberto={modalTransf}
        onFechar={() => { if (!carregando) { setModalTransf(false); setTransf({ destino:"", valor:"", metodo:"PIX", descricao:"" }); } }}
        onConfirmar={() => executar(
          () => api.transferencia(id, Number(transf.destino), Number(transf.valor), transf.metodo, transf.descricao || null),
          () => {}
        )}
        carregando={carregando}
        titulo="Confirmar transferência"
        labelConfirmar={"Transferir via " + (transf.metodo === "PIX" ? "Pix" : "TED")}
        sucesso={
          <div>
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <div className="mpag-sucesso-ico" style={{ margin:"0 auto 14px" }}>✓</div>
              <h3 style={{ margin:"0 0 4px", color:"#fff", fontSize:"1.2rem" }}>Transferência realizada!</h3>
              <p className="muted" style={{ margin:0 }}>
                {brl(transf.valor)} enviado via <strong style={{ color:"var(--text)" }}>{transf.metodo === "PIX" ? "Pix" : "TED"}</strong>
              </p>
            </div>
            <div className="mpag-resumo">
              <LinhaResumo label="De"    valor={conta.numero} />
              <LinhaResumo label="Para"  valor={ctDest ? `${ctDest.numero} — ${ctDest.clienteNome}` : "—"} />
              <LinhaResumo label="Canal" valor={transf.metodo === "PIX" ? "Pix" : "TED"} />
              {transf.descricao && <LinhaResumo label="Descrição" valor={transf.descricao} />}
              <LinhaResumo label="Valor" valor={brl(transf.valor)} destaque />
              <LinhaResumo label="Data"  valor={new Date().toLocaleString("pt-BR")} />
            </div>
          </div>
        }
      >
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:"rgba(63,111,176,0.15)",
                        color:"var(--primary-2)", display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"1.5rem", fontWeight:800, margin:"0 auto 12px" }}>⇄</div>
          <p style={{ color:"var(--muted)", fontSize:"0.9rem", margin:0 }}>Revise os dados antes de confirmar.</p>
        </div>
        <div className="mpag-resumo">
          <LinhaResumo label="Conta origem"  valor={conta.numero} />
          <LinhaResumo label="Conta destino" valor={ctDest ? `${ctDest.numero} — ${ctDest.clienteNome}` : "—"} />
          <LinhaResumo label="Canal"         valor={transf.metodo === "PIX" ? "Pix · instantâneo" : "TED · 1 dia útil"} />
          {transf.descricao && <LinhaResumo label="Descrição" valor={transf.descricao} />}
          <LinhaResumo label="Saldo atual"   valor={brl(conta.saldo)} />
          <LinhaResumo label="Valor"         valor={brl(transf.valor)} destaque />
          <div style={{ height:1, background:"var(--border)", margin:"4px 0" }} />
          <LinhaResumo label="Saldo após"    valor={brl(Number(conta.saldo) - Number(transf.valor))} destaque />
        </div>
        {Number(conta.saldo) - Number(transf.valor) < 0 && (
          <div className="mpag-aviso" style={{ marginTop:12 }}>⚠️ Esta operação utilizará o limite do cheque especial.</div>
        )}
      </ModalSimples>

      {/* Estilos da página */}
      <style>{`
        .pg-op-card { display: flex; flex-direction: column; }
        .pg-op-ico {
          width: 40px; height: 40px; border-radius: 12px; font-size: 1.2rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center; margin-bottom: 10px;
        }
        .pg-op-dep { background: rgba(75,171,128,0.15); color: var(--pos); }
        .pg-op-saq { background: rgba(207,111,124,0.15); color: var(--neg); }

        .pg-input-wrap { position: relative; }
        .pg-input-wrap input { padding-left: 36px; }
        .pg-input-pre {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: var(--faint); font-size: 0.9rem; pointer-events: none; z-index: 1;
        }

        .pg-info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 0; border-bottom: 1px solid var(--border-soft); font-size: 0.87rem;
        }

        .campo-erro { color: var(--neg); font-size: 0.82rem; margin-top: 4px; display: block; }

        .pg-btn-dep {
          width: 100%; margin-top: 16px; padding: 12px; border-radius: 11px; border: none;
          background: linear-gradient(180deg,#5fc494,#3d9168); color: #fff; font-weight: 700;
          font-size: 0.95rem; cursor: pointer; box-shadow: 0 6px 16px -6px rgba(63,171,128,0.5);
          transition: filter 0.15s;
        }
        .pg-btn-dep:hover { filter: brightness(1.08); }

        .pg-btn-saq {
          width: 100%; margin-top: 16px; padding: 12px; border-radius: 11px; border: none;
          background: linear-gradient(180deg,#d9808c,#b55562); color: #fff; font-weight: 700;
          font-size: 0.95rem; cursor: pointer; box-shadow: 0 6px 16px -6px rgba(207,111,124,0.5);
          transition: filter 0.15s;
        }
        .pg-btn-saq:hover { filter: brightness(1.08); }

        .mpag-resumo > div:last-child { border-bottom: none !important; }
      `}</style>
    </>
  );
}
