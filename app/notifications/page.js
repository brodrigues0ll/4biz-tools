"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const TIPO_CONFIG = {
  sem_tecnico:    { label: "Sem Técnico",        color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800/40" },
  erro_execucao:  { label: "Erro de Execução",   color: "text-red-400",    bg: "bg-red-900/20 border-red-800/40" },
  erro_delegacao: { label: "Erro de Delegação",  color: "text-orange-400", bg: "bg-orange-900/20 border-orange-800/40" },
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems]   = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/notifications");
      const data = await res.json();
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch { /* silencia */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function marcarTodosLidos() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marcarTodosLidos: true }),
    });
    load();
  }

  async function marcarLido(id) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.map((n) => n._id === id ? { ...n, lido: true } : n));
    setUnread((prev) => Math.max(0, prev - 1));
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Cabeçalho */}
      <div className="border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-semibold text-white text-sm sm:text-base">Notificações do Scheduler</h1>
        {unread > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">{unread}</span>
        )}
        {unread > 0 && (
          <button
            onClick={marcarTodosLidos}
            className="ml-auto text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
          >
            Marcar todos como lidos
          </button>
        )}
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">

        {loading && (
          <div className="flex items-center justify-center py-16">
            <p className="text-gray-600 text-sm">Carregando…</p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">Nenhuma notificação</p>
            <p className="text-gray-600 text-xs mt-1">Erros de execução aparecerão aqui.</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((n) => {
              const cfg = TIPO_CONFIG[n.tipo] || { label: n.tipo, color: "text-gray-400", bg: "bg-gray-800 border-gray-700" };
              return (
                <li
                  key={n._id}
                  className={`rounded-xl border p-4 transition-opacity ${cfg.bg} ${n.lido ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        {!n.lido && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        )}
                        <span className="text-xs text-gray-600 ml-auto shrink-0">{formatDate(n.criadoEm)}</span>
                      </div>
                      {n.scheduleName && (
                        <p className="text-xs font-medium text-gray-300 mb-0.5">{n.scheduleName}</p>
                      )}
                      <p className="text-xs text-gray-400">{n.mensagem}</p>
                    </div>
                    {!n.lido && (
                      <button
                        onClick={() => marcarLido(n._id)}
                        className="shrink-0 text-xs text-gray-600 hover:text-gray-400 transition-colors mt-0.5"
                        title="Marcar como lido"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      </div>
    </div>
  );
}
