"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, brl } from "../../../lib/api";
import { useRequireAuth } from "../../../lib/auth";

export default function ContaDetalhePage() {
  useRequireAuth();
  const { id } = useParams();
  const [conta, setConta] = useState(null);
  const [outras, setOutras] = useState([]);
  const [extrato, setExtrato] = useState([]);
  const [razao, setRazao] = useState([]);
  const [msg, setMsg] = useState(null); // {tipo:'ok'|'erro', texto}

  const [dep, setDep] = useState("");
  const [saq, setSaq] = useState("");
  const [transf, setTransf] = useState({ destino: "", valor: "" });

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
      setMsg({ tipo: "erro", texto: e.message });
    }
  }

  useEffect(() => {
    recarregar();
  }, [id]);

  async function agir(fn, limpar) {
    setMsg(null);
    try {
      await fn();
      limpar();
      await recarregar();
      setMsg({ tipo: "ok", texto: "Operação realizada." });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e.message });
    }
  }

  if (!conta) return <p className="muted">Carregando…</p>;

  const negativo = Number(conta.saldo) < 0;
  const t = conta.titular || {};
  const pj = t.tipo === "JURIDICA";
  const pct = (v) => (Number(v) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";

  return (
    <>
      <h1>Conta {conta.numero}</h1>
      <div className="card">
        <div className="muted">
          {t.nome} · {pj ? "Pessoa jurídica" : "Pessoa física"} · {pj ? "CNPJ" : "CPF"}: {t.documento || "—"}
        </div>
        <div className={"saldo" + (negativo ? " negativo" : "")}>{brl(conta.saldo)}</div>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="muted">Limite: <strong>{brl(conta.limite)}</strong></div>
          <div className="muted">Juros cheque especial: <strong>{pct(conta.taxaChequeEspecial)}/mês</strong></div>
          <div className="muted">Telefone: <strong>{t.telefone || "—"}</strong></div>
          <div className="muted">Aberta em: <strong>{conta.criadaEm ? new Date(conta.criadaEm).toLocaleDateString("pt-BR") : "—"}</strong></div>
        </div>
        {msg && <div className={msg.tipo}>{msg.texto}</div>}
      </div>

      <div className="row">
        <div className="card">
          <h2>Depósito</h2>
          <input type="number" step="0.01" min="0.01" value={dep} onChange={(e) => setDep(e.target.value)} placeholder="valor" />
          <button onClick={() => agir(() => api.deposito(id, Number(dep)), () => setDep(""))} disabled={!dep}>
            Depositar
          </button>
        </div>

        <div className="card">
          <h2>Saque</h2>
          <input type="number" step="0.01" min="0.01" value={saq} onChange={(e) => setSaq(e.target.value)} placeholder="valor" />
          <button onClick={() => agir(() => api.saque(id, Number(saq)), () => setSaq(""))} disabled={!saq}>
            Sacar
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Transferência</h2>
        <div className="row">
          <div>
            <label>Conta destino</label>
            <select value={transf.destino} onChange={(e) => setTransf({ ...transf, destino: e.target.value })}>
              <option value="">selecione…</option>
              {outras.map((o) => (
                <option key={o.id} value={o.id}>{o.numero} — {o.clienteNome}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Valor</label>
            <input type="number" step="0.01" min="0.01" value={transf.valor}
                   onChange={(e) => setTransf({ ...transf, valor: e.target.value })} placeholder="valor" />
          </div>
        </div>
        <button
          disabled={!transf.destino || !transf.valor}
          onClick={() =>
            agir(
              () => api.transferencia(id, Number(transf.destino), Number(transf.valor)),
              () => setTransf({ destino: "", valor: "" })
            )
          }
        >
          Transferir
        </button>
      </div>

      <div className="card">
        <h2>Extrato</h2>
        {extrato.length === 0 ? (
          <p className="muted">Sem movimentações.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Data</th><th>Tipo</th><th>Valor</th><th>Saldo após</th></tr>
            </thead>
            <tbody>
              {extrato.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.data).toLocaleString("pt-BR")}</td>
                  <td><span className="tag">{t.tipo}</span></td>
                  <td>{brl(t.valor)}</td>
                  <td>{brl(t.saldoApos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Razão contábil <span className="muted" style={{ fontSize: "0.6em" }}>(partidas dobradas)</span></h2>
        {razao.length === 0 ? (
          <p className="muted">Sem lançamentos.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Data</th><th>Lote</th><th>D/C</th><th>Histórico</th><th>Valor</th></tr>
            </thead>
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
    </>
  );
}
