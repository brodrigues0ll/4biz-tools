"use client";

import { useState, useEffect } from "react";
import { idbLoad } from "@/lib/idb";
import { useSession } from "next-auth/react";
import {
  useDebounceSearch,
  useSolicitanteSearch,
  useGroupSearch,
  EMPTY_ABERTURA,
  TemplateCard,
} from "../_shared";

// ── Modal de Abertura ─────────────────────────────────────────────────────────

function ModalAbertura({ initial, session, authToken, onSave, onClose }) {
  const [form, setForm]         = useState(initial || EMPTY_ABERTURA);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [myEmployeeId, setMyEmployeeId] = useState(null);

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
  const act  = useDebounceSearch(session, authToken, "search-activity", { idEmployee: actEmployeeId });
  const unid = useDebounceSearch(session, authToken, "search-unidade");
  const grp  = useGroupSearch(session, authToken);
  const know = useDebounceSearch(session, authToken, "search-knowledge");

  useEffect(() => {
    if (initial?.solicitante) sol.setQuery(initial.solicitante.nome);
    if (initial?.atividade)   act.setQuery((initial.atividade.nomeComHierarquia || "").split(" > ").pop());
    if (initial?.unidade)     unid.setQuery(initial.unidade.nome);
    if (initial?.grupo)       grp.setQuery(initial.grupo.nome);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

          {/* Grupo / Fila */}
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

// ── Página ────────────────────────────────────────────────────────────────────

export default function OpenTemplatesPage() {
  const { data: sessionData } = useSession();
  const canEdit = sessionData?.isAdmin || sessionData?.permissions?.templateEncerramento?.editar;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [session, setSession]     = useState("");
  const [authToken, setAuthToken] = useState("");
  const [modal, setModal]         = useState(null);
  const [idbReady, setIdbReady]   = useState(false);

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
      setTemplates((Array.isArray(data) ? data : []).filter(t => t.tipo === "abertura"));
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {modal !== null && (
        <ModalAbertura
          initial={modal.template || null}
          session={session}
          authToken={authToken}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-4">
          {idbReady && !authToken && (
            <a href="/settings/authentication" className="text-xs text-yellow-500 hover:text-yellow-400">
              ⚠ Autenticação não configurada
            </a>
          )}
          {canEdit && (
            <button onClick={() => setModal({})}
              className="ml-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Novo Template
            </button>
          )}
        </div>

        {loading && <div className="text-center py-16 text-gray-600 text-sm">Carregando…</div>}

        {!loading && templates.length === 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
            <div className="text-gray-500 text-sm mb-4">Nenhum template de abertura criado ainda.</div>
            {canEdit && (
              <button onClick={() => setModal({})}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors">
                Criar primeiro template
              </button>
            )}
          </div>
        )}

        {!loading && templates.length > 0 && (
          <div className="space-y-3">
            {templates.map(t => (
              <TemplateCard
                key={t._id}
                t={t}
                canEdit={canEdit}
                onEdit={t => setModal({ template: t })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
