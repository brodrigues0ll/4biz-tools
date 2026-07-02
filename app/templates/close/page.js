"use client";

import { useState, useEffect } from "react";
import { idbLoad } from "@/lib/idb";
import { useSession } from "next-auth/react";
import {
  useDebounceSearch,
  EMPTY_ENCERRAMENTO,
  TemplateCard,
} from "../_shared";

// ── Modal de Encerramento ─────────────────────────────────────────────────────

function ModalEncerramento({ initial, session, authToken, onSave, onClose }) {
  const [form, setForm]           = useState(initial || EMPTY_ENCERRAMENTO);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

// ── Página ────────────────────────────────────────────────────────────────────

export default function CloseTemplatesPage() {
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
      setTemplates((Array.isArray(data) ? data : []).filter(t => t.tipo === "encerramento"));
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
        <ModalEncerramento
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
            <div className="text-gray-500 text-sm mb-4">Nenhum template de encerramento criado ainda.</div>
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
