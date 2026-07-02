"use client";

import { useState, useRef } from "react";

export const PERM_LABELS = [
  { section: "abertura",             key: "acessar",             label: "Abrir Chamados — acessar a página" },
  { section: "abertura",             key: "verAvancado",         label: "Abrir Chamados — ver aba Avançado" },
  { section: "abertura",             key: "criacaoEmLote",       label: "Abrir Chamados — criação em lote (lista de patrimônios)" },
  { section: "encerramento",         key: "acessar",             label: "Encerrar Chamados — acessar a página" },
  { section: "templateEncerramento", key: "acessar",             label: "Templates — acessar a página" },
  { section: "templateEncerramento", key: "editar",              label: "Templates — criar / editar / excluir" },
  { section: "agendamentos",         key: "acessar",             label: "Agendamentos — acessar a página" },
  { section: "agendamentos",         key: "editar",              label: "Agendamentos — criar / editar / excluir" },
  { section: "agendamentos",         key: "verTodos",            label: "Agendamentos — ver agendamentos de todos os usuários" },
  { section: "configuracoes",        key: "backupRestauracao",   label: "Configurações — aba Backup e Restauração" },
  { section: "configuracoes",        key: "gerenciarPermissoes", label: "Configurações — aba Permissões (gerenciar grupos)" },
];

export function emptyPermissoes() {
  return {
    abertura:             { acessar: false, verAvancado: false, criacaoEmLote: false },
    encerramento:         { acessar: false },
    templateEncerramento: { acessar: false, editar: false },
    agendamentos:         { acessar: false, editar: false, verTodos: false },
    configuracoes:        { acessar: true, backupRestauracao: false, gerenciarPermissoes: false },
  };
}

export function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? "bg-blue-600" : "bg-gray-700"
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
        checked ? "translate-x-4.5" : "translate-x-0.5"
      }`} />
    </button>
  );
}

export function GroupModal({ group, onClose, onSave, session }) {
  const [nome,       setNome]       = useState(group?.nome ?? "");
  const [emails,     setEmails]     = useState(group?.emails ?? []);
  const [permissoes, setPermissoes] = useState(group?.permissoes ?? emptyPermissoes());
  const [emailInput, setEmailInput] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  const [suggestions, setSuggestions] = useState([]);
  const [searching,   setSearching]   = useState(false);
  const debounceRef = useRef(null);

  async function searchEmail(q) {
    if (q.length < 2) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res  = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: session?.session, authToken: session?.authToken, action: "search-technician", query: q }),
      });
      const data = await res.json();
      setSuggestions((data.items || []).filter((p) => p.email).slice(0, 8));
    } catch { setSuggestions([]); }
    finally { setSearching(false); }
  }

  function handleEmailInput(v) {
    setEmailInput(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchEmail(v), 300);
  }

  function addEmail(email) {
    const e = email.trim().toLowerCase();
    if (e && !emails.includes(e)) setEmails((prev) => [...prev, e]);
    setEmailInput("");
    setSuggestions([]);
  }

  function removeEmail(e) {
    setEmails((prev) => prev.filter((x) => x !== e));
  }

  function setPerm(section, key, value) {
    setPermissoes((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) { setError("Nome obrigatório."); return; }
    setSaving(true);
    setError("");
    try {
      const url    = group?._id ? `/api/permission-groups/${group._id}` : "/api/permission-groups";
      const method = group?._id ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, emails, permissoes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");
      onSave(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-8 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white text-sm">{group?._id ? "Editar grupo" : "Novo grupo"}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nome do grupo</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Técnicos, Supervisores…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Usuários (e-mail)</label>
            <div className="relative">
              <input
                value={emailInput}
                onChange={(e) => handleEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addEmail(emailInput); }
                }}
                placeholder="Digite o nome ou e-mail e pressione Enter"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
                  {suggestions.map((p) => (
                    <li key={p.email}>
                      <button
                        type="button"
                        onClick={() => addEmail(p.email)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700"
                      >
                        <span className="text-gray-100">{p.nome}</span>
                        <span className="text-gray-500 ml-2">{p.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {emails.map((e) => (
                  <span key={e} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-full px-2.5 py-1 text-xs text-gray-300">
                    {e}
                    <button type="button" onClick={() => removeEmail(e)} className="text-gray-500 hover:text-red-400 leading-none">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-3">Permissões</p>
            <div className="space-y-2">
              {PERM_LABELS.map(({ section, key, label }) => (
                <label key={`${section}.${key}`} className="flex items-center justify-between gap-3 bg-gray-800/60 rounded-lg px-3 py-2.5">
                  <span className="text-xs text-gray-300">{label}</span>
                  <Toggle
                    checked={permissoes[section]?.[key] ?? false}
                    onChange={(v) => setPerm(section, key, v)}
                  />
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-colors">
              {saving ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
