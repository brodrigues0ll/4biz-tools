"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export function useDebounceSearch(session, authToken, action, extraParams = {}) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, authToken, action, JSON.stringify(extraParams)]);

  return { items, loading, open, setOpen, query, setQuery, search };
}

export function useSolicitanteSearch(session, authToken) {
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

export function useGroupSearch(session, authToken) {
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

export const EMPTY_ENCERRAMENTO = {
  nome: "", tipo: "encerramento", solucao: "", descricaoCausa: "",
  causa: null, categoriaSolucao: null, conhecimento: null, icRelacionado: null,
};

export const EMPTY_ABERTURA = {
  nome: "", tipo: "abertura", descricao: "",
  solicitante: null, atividade: null, unidade: null, grupo: null, conhecimentos: [],
};

export function TemplateCard({ t, canEdit, onEdit, onDelete }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-2">{t.nome}</p>
          <div className="flex flex-wrap gap-2 text-xs">
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
          {canEdit && (
            <button onClick={() => onEdit(t)}
              className="p-1.5 text-gray-600 hover:text-blue-400 rounded-lg hover:bg-blue-900/20 transition-colors" title="Editar">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
              </svg>
            </button>
          )}
          {canEdit && (
            <button onClick={() => onDelete(t._id)}
              className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-colors" title="Excluir">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
