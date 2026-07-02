"use client";

import { useState, useRef, useEffect } from "react";
import { idbLoad, idbSave } from "@/lib/idb";

const DEFAULT_SOLUCAO =
  "O dispositivo encontra-se adequado às diretrizes de Segurança da Informação, com o gerenciamento automatizado e seguro da senha do administrador local, contribuindo para a mitigação de riscos e aumento do nível de proteção do ambiente.";

const DEFAULT_CAUSA =
  "Implementação do LAPS no dispositivo.\nInformamos que a solução LAPS (Local Administrator Password Solution) foi implementada com sucesso no dispositivo solicitado, em conformidade com as políticas de Segurança da Informação.\nAtividades realizadas:\n\t•\tExclusão dos perfis de administradores locais existentes, garantindo a padronização do ambiente;\n\t•\tManutenção apenas da conta padrão Administrador, conforme diretrizes da política;\n\t•\tInclusão do equipamento no grupo de gerenciamento do LAPS, possibilitando o controle centralizado e seguro de senhas;\n\t•\tAtualização da planilha de controle LAPS, conforme procedimento interno estabelecido.";

function plainToHtml(text) {
  return "<div>" + text.trim().replace(/\n/g, "<br>") + "</div>";
}

function KnowledgeSearch({ session, authToken, value, onChange }) {
  const [query, setQuery] = useState(value?.titulo || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    if (q !== value?.titulo) onChange(null);
    clearTimeout(timerRef.current);
    if (q.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, authToken, action: "search-knowledge", query: q.trim() }),
        });
        const data = await res.json();
        setSuggestions(data.items || []);
        setOpen(true);
      } catch { /* silencia */ }
      finally { setLoading(false); }
    }, 400);
  }

  function select(item) {
    setQuery(item.titulo);
    onChange(item);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="Digite para buscar…"
        className={`w-full bg-gray-800 border rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 ${
          value ? "border-green-600" : "border-gray-700"
        }`}
      />
      {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">…</span>}
      {value && !loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-xs">✓</span>}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.id}
              onMouseDown={(e) => { e.preventDefault(); select(s); }}
              className="px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 cursor-pointer">
              {s.titulo}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ClosePage() {
  const [session, setSession] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [ticketIdsText, setTicketIdsText] = useState("");
  const [solucao, setSolucao] = useState("");
  const [causa, setCausa] = useState("");
  const [idCausaIncidente, setIdCausaIncidente] = useState("");
  const [idCategoriaSolucao, setIdCategoriaSolucao] = useState("");
  const [knowledge, setKnowledge] = useState(null);
  const [descricaoTemplate, setDescricaoTemplate] = useState("");
  const [causaOpts, setCausaOpts] = useState([]);
  const [catOpts, setCatOpts] = useState([]);
  const [optsLoading, setOptsLoading] = useState(false);
  const [optsError, setOptsError] = useState("");

  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [idbReady, setIdbReady] = useState(false);

  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [tplList, setTplList] = useState([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [icFixo, setIcFixo] = useState(null);

  const abortRef = useRef(null);
  const saveTimerRef = useRef(null);
  const optsLoadedForRef = useRef("");

  useEffect(() => {
    const key = session + "|" + authToken;
    if (!authToken || optsLoadedForRef.current === key) return;
    optsLoadedForRef.current = key;
    loadOptions();
  }, [session, authToken]);

  useEffect(() => {
    Promise.all([idbLoad("auth"), idbLoad("state"), idbLoad("close-state")]).then(([auth, main, close]) => {
      if (auth?.session) setSession(auth.session);
      if (auth?.authToken) setAuthToken(auth.authToken);
      if (main?.templateStr) {
        try {
          const t = JSON.parse(main.templateStr);
          if (t?.descricao) setDescricaoTemplate(t.descricao);
        } catch { /* silencia */ }
      }
      if (close?.ticketIdsText) setTicketIdsText(close.ticketIdsText);
      if (close?.solucao != null) setSolucao(close.solucao);
      if (close?.causa != null) setCausa(close.causa);
      if (close?.idCausaIncidente) setIdCausaIncidente(close.idCausaIncidente);
      if (close?.idCategoriaSolucao) setIdCategoriaSolucao(close.idCategoriaSolucao);
      if (close?.knowledge) setKnowledge(close.knowledge);
      setIdbReady(true);
    });
  }, []);

  useEffect(() => {
    if (!idbReady) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      idbSave({ ticketIdsText, solucao, causa, idCausaIncidente, idCategoriaSolucao, knowledge }, "close-state");
    }, 800);
  }, [ticketIdsText, solucao, causa, idCausaIncidente, idCategoriaSolucao, knowledge, idbReady]);

  const ticketIds = ticketIdsText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+$/.test(l))
    .map(Number);

  async function loadOptions() {
    if (!authToken) return;
    setOptsLoading(true);
    setOptsError("");
    try {
      const [resCausas, resCats] = await Promise.all([
        fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, authToken, action: "causes", idServico: 219 }),
        }),
        fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, authToken, action: "solution-categories" }),
        }),
      ]);
      const causas = await resCausas.json();
      const cats = await resCats.json();
      if (!resCausas.ok) throw new Error(causas.error || `HTTP ${resCausas.status}`);
      if (!resCats.ok) throw new Error(cats.error || `HTTP ${resCats.status}`);
      setCausaOpts(causas.items || []);
      setCatOpts(cats.items || []);
    } catch (err) {
      setOptsError(err.message);
    } finally {
      setOptsLoading(false);
    }
  }

  async function handleClose() {
    if (!authToken) return alert("Preencha os dados de autenticação.");
    if (ticketIds.length === 0) return alert("Adicione ao menos um número de chamado.");
    if (!idCausaIncidente) return alert("Selecione a Causa.");
    if (!idCategoriaSolucao) return alert("Selecione a Categoria de Solução.");
    if (!knowledge) return alert("Selecione uma Base de Conhecimento.");

    setResults([]);
    setDone(false);
    setRunning(true);
    setResults(ticketIds.map((id) => ({ ticketId: id, status: "pending" })));

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch("/api/close-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session,
          authToken,
          ticketIds,
          solucaoResposta: plainToHtml(solucao),
          detalhamentoCausa: plainToHtml(causa),
          idCausaIncidente: Number(idCausaIncidente),
          idCategoriaSolucao: Number(idCategoriaSolucao),
          knowledges: [{ idBaseConhecimento: knowledge.id, titulo: knowledge.titulo }],
          descricaoTemplate,
          icFixo: icFixo ?? null,
        }),
        signal: controller.signal,
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done: sd } = await reader.read();
        if (sd) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.done) { setDone(true); break; }
          setResults((prev) => {
            const next = [...prev];
            next[evt.index] = {
              ticketId: evt.ticketId,
              status: evt.success ? "success" : "error",
              patrimonio: evt.patrimonio,
              icFound: evt.icFound,
              error: evt.error,
            };
            return next;
          });
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") alert("Erro de conexão: " + err.message);
    } finally {
      setRunning(false);
    }
  }

  function handleAbort() { abortRef.current?.abort(); setRunning(false); }

  async function openTemplateModal() {
    setTplModalOpen(true);
    setTplLoading(true);
    try {
      const res = await fetch("/api/close-templates?tipo=encerramento");
      const data = await res.json();
      setTplList(Array.isArray(data) ? data : []);
    } catch { setTplList([]); }
    finally { setTplLoading(false); }
  }

  function applyTemplate(t) {
    if (t.causa?.id) setIdCausaIncidente(String(t.causa.id));
    if (t.categoriaSolucao?.id) setIdCategoriaSolucao(String(t.categoriaSolucao.id));
    if (t.conhecimento?.id) setKnowledge({ id: t.conhecimento.id, titulo: t.conhecimento.titulo });
    if (t.solucao) setSolucao(t.solucao);
    if (t.descricaoCausa) setCausa(t.descricaoCausa);
    setIcFixo(t.icRelacionado?.idItemConfiguracao ? t.icRelacionado : null);
    setTplModalOpen(false);
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount   = results.filter((r) => r.status === "error").length;
  const pendingCount = results.filter((r) => r.status === "pending").length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Cabeçalho */}
      <div className="border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center gap-3">
        <h1 className="font-semibold text-white text-sm sm:text-base">Encerrar Chamados</h1>
        <div className="ml-auto flex items-center gap-3">
          {idbReady && !session && !authToken && (
            <a href="/settings" className="text-xs text-yellow-500 hover:text-yellow-400">⚠ Autenticação não configurada</a>
          )}
          {idbReady && <span className="text-xs text-gray-600">● salvo automaticamente</span>}
          <button onClick={openTemplateModal}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Importar Template
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-4 sm:space-y-5">

        {/* Causa + Categoria + Base de Conhecimento */}
        <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold text-white text-sm">Classificação do Encerramento</h2>
            {optsLoading && <span className="text-xs text-gray-500">Carregando…</span>}
          </div>
          {optsError && <p className="text-xs text-red-400 mb-3">Erro: {optsError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs text-gray-400 mb-1 block">Causa</span>
              <select value={idCausaIncidente} onChange={(e) => setIdCausaIncidente(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                disabled={causaOpts.length === 0}>
                <option value="">— selecione —</option>
                {causaOpts.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-400 mb-1 block">Categoria de Solução</span>
              <select value={idCategoriaSolucao} onChange={(e) => setIdCategoriaSolucao(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                disabled={catOpts.length === 0}>
                <option value="">— selecione —</option>
                {catOpts.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <div>
              <span className="text-xs text-gray-400 mb-1 block">Base de Conhecimento</span>
              <KnowledgeSearch session={session} authToken={authToken} value={knowledge} onChange={setKnowledge} />
              {knowledge && <p className="text-xs text-green-500 mt-1 truncate">{knowledge.titulo}</p>}
            </div>
          </div>
          {icFixo && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-950/40 border border-blue-800/50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
              <span className="text-xs text-blue-300 flex-1">
                <span className="text-blue-500 mr-1">IC do template:</span>
                {icFixo.identificacao} — {icFixo.nomeItemConfiguracao}
              </span>
              <button onClick={() => setIcFixo(null)} className="text-gray-500 hover:text-gray-300 text-sm leading-none" title="Remover IC fixo">×</button>
            </div>
          )}
        </section>

        {/* Textos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h2 className="font-semibold text-white mb-3 text-sm">Texto da Solução</h2>
            <textarea value={solucao} onChange={(e) => setSolucao(e.target.value)}
              rows={8} spellCheck={false}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-blue-500 resize-y font-mono" />
          </section>
          <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h2 className="font-semibold text-white mb-3 text-sm">Descrição da Causa</h2>
            <textarea value={causa} onChange={(e) => setCausa(e.target.value)}
              rows={8} spellCheck={false}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-blue-500 resize-y font-mono" />
          </section>
        </div>

        {/* Chamados + resultados */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <h2 className="font-semibold text-white mb-1 text-sm">Números dos Chamados</h2>
            <p className="text-xs text-gray-500 mb-3">Um por linha.</p>
            <textarea value={ticketIdsText} onChange={(e) => setTicketIdsText(e.target.value)}
              placeholder={"35222\n35223\n35224"} rows={10}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 focus:outline-none focus:border-blue-500 resize-y" />
            {ticketIds.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{ticketIds.length} chamado{ticketIds.length !== 1 ? "s" : ""}</p>
            )}
          </section>

          <section className="sm:col-span-2 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handleClose} disabled={running}
                className="px-6 py-2.5 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors text-sm">
                {running ? "Encerrando chamados…" : `Encerrar ${ticketIds.length || ""} chamado${ticketIds.length !== 1 ? "s" : ""}`}
              </button>
              {running && (
                <button onClick={handleAbort}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg text-sm">
                  Cancelar
                </button>
              )}
            </div>

            {results.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: "Total",      val: results.length, color: "white" },
                  { label: "Encerrados", val: successCount,   color: "green-400" },
                  { label: "Erros",      val: errorCount,     color: "red-400" },
                  ...(pendingCount > 0 ? [{ label: "Aguardando", val: pendingCount, color: "yellow-400" }] : []),
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-center min-w-20">
                    <div className={`text-2xl font-bold text-${color}`}>{val}</div>
                    <div className="text-xs text-gray-400">{label}</div>
                  </div>
                ))}
                {done && <div className="flex items-center px-3 text-green-400 text-sm font-medium">✓ Concluído</div>}
              </div>
            )}

            {results.length > 0 && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
                <table className="w-full text-sm min-w-120">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-4 py-3 text-gray-400 font-medium w-8">#</th>
                      <th className="px-4 py-3 text-gray-400 font-medium">Chamado</th>
                      <th className="px-4 py-3 text-gray-400 font-medium">Patrimônio</th>
                      <th className="px-4 py-3 text-gray-400 font-medium">IC</th>
                      <th className="px-4 py-3 text-gray-400 font-medium">Status</th>
                      <th className="px-4 py-3 text-gray-400 font-medium">Detalhe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-b border-gray-800/50 last:border-0">
                        <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-gray-200">#{r.ticketId}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-300">{r.patrimonio || <span className="text-gray-600">—</span>}</td>
                        <td className="px-4 py-3 text-xs">
                          {r.status === "pending" ? <span className="text-gray-600">—</span>
                           : r.icFound ? <span className="text-green-400">✓</span>
                           : r.patrimonio ? <span className="text-yellow-500">não encontrado</span>
                           : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.status === "pending" && <span className="text-yellow-400 text-xs">⏳ aguardando</span>}
                          {r.status === "success" && <span className="text-green-400 text-xs">✓ encerrado</span>}
                          {r.status === "error"   && <span className="text-red-400 text-xs">✗ erro</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{r.error || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {results.length === 0 && !running && (
              <div className="bg-gray-900 rounded-xl p-10 border border-gray-800 text-center text-gray-600 text-sm">
                Nenhum chamado encerrado ainda.
              </div>
            )}
          </section>
        </div>

      </div>

      {/* Modal de templates */}
      {tplModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setTplModalOpen(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white text-sm">Selecionar Template de Encerramento</h2>
              <button onClick={() => setTplModalOpen(false)} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {tplLoading && <p className="text-center text-gray-500 text-sm py-8">Carregando…</p>}
              {!tplLoading && tplList.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">Nenhum template cadastrado.</p>
              )}
              {!tplLoading && tplList.map((t) => (
                <button key={t._id} onClick={() => applyTemplate(t)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors mb-1 border border-transparent hover:border-gray-700">
                  <div className="text-sm font-medium text-gray-100">{t.nome}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {[t.causa?.nome, t.categoriaSolucao?.nome].filter(Boolean).join(" · ")}
                  </div>
                </button>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-800 flex justify-end">
              <button onClick={() => setTplModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
