"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { idbLoad } from "@/lib/idb";

// ── Hooks de busca ────────────────────────────────────────────────────────────

function useDebounceSearch(session, authToken, action, extraParams = {}) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const timer = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (!q || q.length < 2) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      if (!authToken) return;
      setLoading(true);
      try {
        const res  = await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, authToken, action, query: q, ...extraParams }),
        });
        const json = await res.json();
        setItems(json.items || json.data || []);
        setOpen(true);
      } catch { /* silencia */ }
      finally { setLoading(false); }
    }, 300);
  }, [session, authToken, action, JSON.stringify(extraParams)]);

  return { items, loading, open, setOpen, query, setQuery, search };
}

function useSolicitanteSearch(session, authToken) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const timer = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (!q || q.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      if (!authToken) return;
      setLoading(true);
      try {
        const res  = await fetch("/api/solicitante-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, authToken, query: q }),
        });
        const json = await res.json();
        setResults(json.data || []);
        setOpen(true);
      } catch { /* silencia */ }
      finally { setLoading(false); }
    }, 300);
  }, [session, authToken]);

  return { results, loading, open, setOpen, query, setQuery, search };
}

function useGroupSearch(session, authToken) {
  const [allGroups, setAllGroups] = useState([]);
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState("");

  useEffect(() => {
    if (!authToken) return;
    setLoading(true);
    fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, authToken, action: "search-group" }),
    })
      .then(r => r.json())
      .then(d => setAllGroups(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, authToken]);

  const search = useCallback((q) => {
    setQuery(q);
    if (!q) { setItems([]); setOpen(false); return; }
    const lower = q.toLowerCase();
    const filtered = allGroups.filter(g => g.nome.toLowerCase().includes(lower)).slice(0, 20);
    setItems(filtered);
    setOpen(filtered.length > 0);
  }, [allGroups]);

  return { items, loading, open, setOpen, query, setQuery, search };
}

// ── Estados vazios ────────────────────────────────────────────────────────────

const EMPTY_ENCERRAMENTO = {
  nome: "", tipo: "encerramento", solucao: "", descricaoCausa: "",
  causa: null, categoriaSolucao: null, conhecimento: null, icRelacionado: null,
};

const EMPTY_ABERTURA = {
  nome: "", tipo: "abertura", descricao: "",
  solicitante: null, atividade: null, unidade: null, grupo: null, conhecimentos: [],
};

// ── Modal de Encerramento ─────────────────────────────────────────────────────

function ModalEncerramento({ initial, session, authToken, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_ENCERRAMENTO);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [causas, setCausas]       = useState([]);
  const [categorias, setCategorias] = useState([]);

  const know = useDebounceSearch(session, authToken, "search-knowledge");
  const ic   = useDebounceSearch(session, authToken, "search-ic");

  useEffect(() => {
    if (!authToken) return;
    fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, authToken, action: "causes", idServico: 219 }),
    }).then(r => r.json()).then(d => setCausas(d.items || [])).catch(() => {});

    fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, authToken, action: "solution-categories" }),
    }).then(r => r.json()).then(d => setCategorias(d.items || [])).catch(() => {});
  }, [session, authToken]);

  useEffect(() => {
    if (initial?.conhecimento) know.setQuery(initial.conhecimento.titulo);
    if (initial?.icRelacionado) ic.setQuery(initial.icRelacionado.identificacao);
  }, []);

  function patch(obj) { setForm(prev => ({ ...prev, ...obj })); }

  async function handleSave() {
    if (!form.nome.trim()) { setError("Informe o nome do template."); return; }
    setError(""); setSaving(true);
    try { await onSave({ ...form, tipo: "encerramento" }); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  const noAuth = !authToken;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">
            {initial?._id ? "Editar Template de Encerramento" : "Novo Template de Encerramento"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nome do template</label>
            <input type="text" value={form.nome} onChange={e => patch({ nome: e.target.value })}
              placeholder="Ex: LAPS — Padrão"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Classificação (Causa)</label>
            <select
              value={form.causa?.id ?? ""}
              onChange={e => {
                const c = causas.find(x => String(x.id) === e.target.value);
                patch({ causa: c || null });
              }}
              disabled={noAuth || !causas.length}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40">
              <option value="">— Selecione —</option>
              {causas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Categoria de Solução</label>
            <select
              value={form.categoriaSolucao?.id ?? ""}
              onChange={e => {
                const c = categorias.find(x => String(x.id) === e.target.value);
                patch({ categoriaSolucao: c || null });
              }}
              disabled={noAuth || !categorias.length}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40">
              <option value="">— Selecione —</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Base de Conhecimento</label>
            <div className="relative">
              <input type="text" value={know.query}
                onChange={e => know.search(e.target.value)}
                onFocus={() => know.items.length > 0 && know.setOpen(true)}
                placeholder={noAuth ? "Configure a autenticação" : "Buscar artigo…"}
                disabled={noAuth}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40" />
              {know.loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">…</span>}
              {know.open && know.items.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {know.items.map(k => (
                    <button key={k.id} type="button"
                      onMouseDown={() => { patch({ conhecimento: { id: k.id, titulo: k.titulo } }); know.setQuery(k.titulo); know.setOpen(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0 text-xs text-gray-200">
                      {k.titulo}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.conhecimento && (
              <div className="mt-1.5 flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-1.5">
                <span className="flex-1 text-xs text-blue-200 truncate">{form.conhecimento.titulo}</span>
                <button type="button" onClick={() => { patch({ conhecimento: null }); know.setQuery(""); }}
                  className="text-blue-500 hover:text-blue-300 text-xs shrink-0">limpar</button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">IC Relacionado</label>
            <div className="relative">
              <input type="text" value={ic.query}
                onChange={e => ic.search(e.target.value)}
                onFocus={() => ic.items.length > 0 && ic.setOpen(true)}
                placeholder={noAuth ? "Configure a autenticação" : "Buscar por identificação…"}
                disabled={noAuth}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40" />
              {ic.loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">…</span>}
              {ic.open && ic.items.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {ic.items.map(item => (
                    <button key={item.idItemConfiguracao} type="button"
                      onMouseDown={() => { patch({ icRelacionado: item }); ic.setQuery(item.identificacao); ic.setOpen(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                      <div className="text-xs text-white">{item.identificacao}</div>
                      {item.nomeGrupoItemConfiguracao && (
                        <div className="text-xs text-gray-400">{item.nomeGrupoItemConfiguracao}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.icRelacionado && (
              <div className="mt-1.5 flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-1.5">
                <span className="flex-1 text-xs text-blue-200 truncate">{form.icRelacionado.identificacao}</span>
                <button type="button" onClick={() => { patch({ icRelacionado: null }); ic.setQuery(""); }}
                  className="text-blue-500 hover:text-blue-300 text-xs shrink-0">limpar</button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Texto da Solução</label>
            <textarea value={form.solucao} onChange={e => patch({ solucao: e.target.value })}
              rows={4} placeholder="Descreva a solução aplicada…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-blue-500 resize-y font-mono" />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Descrição da Causa</label>
            <textarea value={form.descricaoCausa} onChange={e => patch({ descricaoCausa: e.target.value })}
              rows={3} placeholder="Descreva a causa do problema…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-blue-500 resize-y font-mono" />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold rounded-lg transition-colors">
            {saving ? "Salvando…" : "Salvar Template"}
          </button>
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg border border-gray-700">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Abertura ─────────────────────────────────────────────────────────

function ModalAbertura({ initial, session, authToken, onSave, onClose }) {
  const [form, setForm]         = useState(initial || EMPTY_ABERTURA);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [myEmployeeId, setMyEmployeeId] = useState(null);

  // Decodifica o JWT para obter o idEmpregado do usuário logado
  useEffect(() => {
    if (!authToken) return;
    fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, authToken, action: "my-employee-id" }),
    }).then(r => r.json()).then(d => setMyEmployeeId(d.idEmployee || null)).catch(() => {});
  }, [authToken]);

  const actEmployeeId = form.solicitante?.idEmpregado ?? myEmployeeId;

  const sol  = useSolicitanteSearch(session, authToken);
  const act  = useDebounceSearch(session, authToken, "search-activity",
    { idEmployee: actEmployeeId });
  const unid = useDebounceSearch(session, authToken, "search-unidade");
  const grp  = useGroupSearch(session, authToken);
  const know = useDebounceSearch(session, authToken, "search-knowledge");

  useEffect(() => {
    if (initial?.solicitante) sol.setQuery(initial.solicitante.nome);
    if (initial?.atividade)   act.setQuery((initial.atividade.nomeComHierarquia || "").split(" > ").pop());
    if (initial?.unidade)     unid.setQuery(initial.unidade.nome);
    if (initial?.grupo)       grp.setQuery(initial.grupo.nome);
  }, []);

  function patch(obj) { setForm(prev => ({ ...prev, ...obj })); }

  function selectSolicitante(person) {
    patch({ solicitante: { idEmpregado: person.idEmpregado, nome: person.nome, email: person.email } });
    sol.setQuery(person.nome);
    sol.setOpen(false);
  }

  function selectAtividade(item) {
    patch({ atividade: { idAtividade: item.idAtividade, idServico: item.idServico, nomeComHierarquia: item.nomeComHierarquia } });
    act.setQuery((item.nomeComHierarquia || "").split(" > ").pop());
    act.setOpen(false);
  }

  function selectUnidade(unit) {
    patch({ unidade: { id: unit.id, nome: unit.nome, sigla: unit.sigla } });
    unid.setQuery(unit.nome);
    unid.setOpen(false);
  }

  function selectGrupo(g) {
    patch({ grupo: { id: g.id, nome: g.nome } });
    grp.setQuery(g.nome);
    grp.setOpen(false);
  }

  function addKnowledge(k) {
    if (form.conhecimentos?.some(x => x.id === k.id)) return;
    patch({ conhecimentos: [...(form.conhecimentos || []), { id: k.id, titulo: k.titulo }] });
    know.setQuery("");
    know.setOpen(false);
  }

  function removeKnowledge(id) {
    patch({ conhecimentos: (form.conhecimentos || []).filter(k => k.id !== id) });
  }

  async function handleSave() {
    if (!form.nome.trim()) { setError("Informe o nome do template."); return; }
    setError(""); setSaving(true);
    try { await onSave({ ...form, tipo: "abertura" }); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  const noAuth = !authToken;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-xl my-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">
            {initial?._id ? "Editar Template de Abertura" : "Novo Template de Abertura"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500">Campos opcionais — apenas os preenchidos serão aplicados na abertura.</p>

          {/* Nome */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nome do template</label>
            <input type="text" value={form.nome} onChange={e => patch({ nome: e.target.value })}
              placeholder="Ex: LAPS — Padrão"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500" />
          </div>

          {/* Solicitante */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Solicitante</label>
            <div className="relative">
              <input type="text" value={sol.query}
                onChange={e => sol.search(e.target.value)}
                onFocus={() => sol.results.length > 0 && sol.setOpen(true)}
                placeholder={noAuth ? "Configure a autenticação" : "Buscar solicitante…"}
                disabled={noAuth}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40" />
              {sol.loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">…</span>}
              {sol.open && sol.results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {sol.results.map(p => (
                    <button key={p.idEmpregado} type="button"
                      onMouseDown={() => selectSolicitante(p)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                      <div className="text-xs text-white">{p.nome}</div>
                      <div className="text-xs text-gray-400">{p.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.solicitante && (
              <div className="mt-1.5 flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-1.5">
                <span className="flex-1 text-xs text-blue-200 truncate">{form.solicitante.nome}</span>
                <button type="button" onClick={() => { patch({ solicitante: null }); sol.setQuery(""); }}
                  className="text-blue-500 hover:text-blue-300 text-xs shrink-0">limpar</button>
              </div>
            )}
          </div>

          {/* Atividade */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Atividade</label>
            <div className="relative">
              <input type="text" value={act.query}
                onChange={e => act.search(e.target.value)}
                onFocus={() => act.items.length > 0 && act.setOpen(true)}
                placeholder={noAuth ? "Configure a autenticação" : "Buscar atividade…"}
                disabled={noAuth}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40" />
              {act.loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">…</span>}
              {act.open && act.items.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {act.items.map((item, i) => {
                    const parts = (item.nomeComHierarquia || item.nome || "").split(" > ");
                    return (
                      <button key={i} type="button"
                        onMouseDown={() => selectAtividade(item)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                        <div className="text-xs text-white">{parts[parts.length - 1]}</div>
                        <div className="text-xs text-gray-400">{parts.slice(0, -1).join(" › ")}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {form.atividade && (
              <div className="mt-1.5 flex items-center gap-2 bg-purple-950/50 border border-purple-800/50 rounded-lg px-3 py-1.5">
                <span className="flex-1 text-xs text-purple-200 truncate">{(form.atividade.nomeComHierarquia || "").split(" > ").pop()}</span>
                <button type="button" onClick={() => { patch({ atividade: null }); act.setQuery(""); }}
                  className="text-purple-500 hover:text-purple-300 text-xs shrink-0">limpar</button>
              </div>
            )}
          </div>

          {/* Unidade */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Unidade</label>
            <div className="relative">
              <input type="text" value={unid.query}
                onChange={e => unid.search(e.target.value)}
                onFocus={() => unid.items.length > 0 && unid.setOpen(true)}
                placeholder={noAuth ? "Configure a autenticação" : "Buscar unidade…"}
                disabled={noAuth}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40" />
              {unid.loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">…</span>}
              {unid.open && unid.items.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {unid.items.map((unit, i) => (
                    <button key={i} type="button"
                      onMouseDown={() => selectUnidade(unit)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                      <div className="text-xs text-white">{unit.nome}</div>
                      <div className="text-xs text-gray-400">{unit.sigla}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.unidade && (
              <div className="mt-1.5 flex items-center gap-2 bg-teal-950/50 border border-teal-800/50 rounded-lg px-3 py-1.5">
                <span className="flex-1 text-xs text-teal-200 truncate">{form.unidade.nome}</span>
                <button type="button" onClick={() => { patch({ unidade: null }); unid.setQuery(""); }}
                  className="text-teal-500 hover:text-teal-300 text-xs shrink-0">limpar</button>
              </div>
            )}
          </div>

          {/* Grupo */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Fila de Atendimento</label>
            <div className="relative">
              <input type="text" value={grp.query}
                onChange={e => grp.search(e.target.value)}
                onFocus={() => grp.items.length > 0 && grp.setOpen(true)}
                placeholder={noAuth ? "Configure a autenticação" : grp.loading ? "Carregando filas…" : "Filtrar fila…"}
                disabled={noAuth}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40" />
              {grp.loading && !grp.items.length && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">…</span>}
              {grp.open && grp.items.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {grp.items.map(g => (
                    <button key={g.id} type="button"
                      onMouseDown={() => selectGrupo(g)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0 text-xs text-gray-200">
                      {g.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.grupo && (
              <div className="mt-1.5 flex items-center gap-2 bg-orange-950/50 border border-orange-800/50 rounded-lg px-3 py-1.5">
                <span className="flex-1 text-xs text-orange-200 truncate">{form.grupo.nome}</span>
                <button type="button" onClick={() => { patch({ grupo: null }); grp.setQuery(""); }}
                  className="text-orange-500 hover:text-orange-300 text-xs shrink-0">limpar</button>
              </div>
            )}
          </div>

          {/* Base de Conhecimento (múltipla) */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Base de Conhecimento</label>
            <div className="relative">
              <input type="text" value={know.query}
                onChange={e => know.search(e.target.value)}
                onFocus={() => know.items.length > 0 && know.setOpen(true)}
                placeholder={noAuth ? "Configure a autenticação" : "Buscar artigo…"}
                disabled={noAuth}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40" />
              {know.loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">…</span>}
              {know.open && know.items.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {know.items.map(k => (
                    <button key={k.id} type="button"
                      onMouseDown={() => addKnowledge(k)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0 text-xs text-gray-200">
                      {k.titulo}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {(form.conhecimentos || []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.conhecimentos.map(k => (
                  <span key={k.id} className="flex items-center gap-1.5 bg-yellow-950/50 border border-yellow-800/50 rounded-full px-3 py-1">
                    <span className="text-xs text-yellow-200">{k.titulo}</span>
                    <button type="button" onClick={() => removeKnowledge(k.id)}
                      className="text-yellow-600 hover:text-yellow-400 text-xs leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Texto do Chamado */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Texto do Chamado</label>
            <textarea value={form.descricao} onChange={e => patch({ descricao: e.target.value })}
              rows={5} placeholder={"Descrição do chamado…\nUse {{patrimonio}} para o número."}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-blue-500 resize-y font-mono" />
          </div>

          {error && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-800">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold rounded-lg transition-colors">
            {saving ? "Salvando…" : "Salvar Template"}
          </button>
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg border border-gray-700">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CloseTemplatePage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [session, setSession]     = useState("");
  const [authToken, setAuthToken] = useState("");
  const [modal, setModal]         = useState(null); // null | { tipo, template? }
  const [idbReady, setIdbReady]   = useState(false);
  const [activeTab, setActiveTab] = useState("encerramento");

  useEffect(() => {
    idbLoad("auth").then(a => {
      setSession(a?.session || "");
      setAuthToken(a?.authToken || "");
      setIdbReady(true);
    });
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res  = await fetch("/api/close-templates");
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch { /* silencia */ }
    finally { setLoading(false); }
  }

  async function handleSave(form) {
    const isEdit = !!modal?.template?._id;
    const url    = isEdit ? `/api/close-templates/${modal.template._id}` : "/api/close-templates";
    const method = isEdit ? "PATCH" : "POST";
    const res    = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    if (isEdit) {
      setTemplates(prev => prev.map(t => t._id === data._id ? data : t));
    } else {
      setTemplates(prev => [data, ...prev]);
    }
    setModal(null);
  }

  async function handleDelete(id) {
    if (!confirm("Excluir este template?")) return;
    const res = await fetch(`/api/close-templates/${id}`, { method: "DELETE" });
    if (res.ok) setTemplates(prev => prev.filter(t => t._id !== id));
  }

  const filtered = templates.filter(t => t.tipo === activeTab);

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {modal !== null && modal.tipo === "encerramento" && (
        <ModalEncerramento
          initial={modal.template || null}
          session={session}
          authToken={authToken}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {modal !== null && modal.tipo === "abertura" && (
        <ModalAbertura
          initial={modal.template || null}
          session={session}
          authToken={authToken}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Cabeçalho */}
      <div className="border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center gap-3">
        <h1 className="font-semibold text-white text-sm sm:text-base">Templates</h1>
        {idbReady && !session && !authToken && (
          <a href="/settings" className="text-xs text-yellow-500 hover:text-yellow-400">⚠ Autenticação não configurada</a>
        )}
        <button onClick={() => setModal({ tipo: activeTab })}
          className="ml-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo Template
        </button>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-800 px-4 sm:px-6 flex gap-1">
        {[
          { id: "encerramento", label: "Encerramento" },
          { id: "abertura",     label: "Abertura" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">

        {loading && <div className="text-center py-16 text-gray-600 text-sm">Carregando…</div>}

        {!loading && filtered.length === 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
            <div className="text-gray-500 text-sm mb-4">Nenhum template de {activeTab} criado ainda.</div>
            <button onClick={() => setModal({ tipo: activeTab })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
              Criar primeiro template
            </button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(t => (
              <div key={t._id} className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white mb-2">{t.nome}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {/* Encerramento badges */}
                      {t.causa?.nome && (
                        <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded">Causa: {t.causa.nome}</span>
                      )}
                      {t.categoriaSolucao?.nome && (
                        <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded">Cat.: {t.categoriaSolucao.nome}</span>
                      )}
                      {t.conhecimento?.titulo && (
                        <span className="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-800/40">{t.conhecimento.titulo}</span>
                      )}
                      {t.icRelacionado?.identificacao && (
                        <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded">IC: {t.icRelacionado.identificacao}</span>
                      )}
                      {/* Abertura badges */}
                      {t.solicitante?.nome && (
                        <span className="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-800/40">{t.solicitante.nome}</span>
                      )}
                      {t.atividade?.nomeComHierarquia && (
                        <span className="bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded border border-purple-800/40">
                          {t.atividade.nomeComHierarquia.split(" > ").pop()}
                        </span>
                      )}
                      {t.unidade?.nome && (
                        <span className="bg-teal-900/30 text-teal-400 px-2 py-0.5 rounded border border-teal-800/40">{t.unidade.nome}</span>
                      )}
                      {t.grupo?.nome && (
                        <span className="bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded border border-orange-800/40">Fila: {t.grupo.nome}</span>
                      )}
                      {(t.conhecimentos || []).map(k => (
                        <span key={k.id} className="bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded border border-yellow-800/40">{k.titulo}</span>
                      ))}
                    </div>
                    {(t.solucao || t.descricaoCausa || t.descricao) && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                        {t.solucao || t.descricaoCausa || t.descricao}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setModal({ tipo: t.tipo, template: t })}
                      className="p-1.5 text-gray-600 hover:text-blue-400 rounded-lg hover:bg-blue-900/20 transition-colors" title="Editar">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(t._id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-colors" title="Excluir">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
