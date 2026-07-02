"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { GroupModal } from "../_shared";

export default function PermissionsPage() {
  const { data: session }  = useSession();
  const [groups,       setGroups]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/permission-groups");
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch { setGroups([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/permission-groups/${deleteTarget._id}`, { method: "DELETE" });
    setDeleteTarget(null);
    setDeleting(false);
    fetchGroups();
  }

  function handleSaved() {
    setEditTarget(null);
    fetchGroups();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Grupos definem quais páginas e funcionalidades cada usuário pode acessar.
          Usuários sem grupo não têm acesso a nenhuma página além de Configurações.
        </p>
        <button
          onClick={() => setEditTarget("__new__")}
          className="shrink-0 ml-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          + Novo grupo
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500 text-center py-8">Carregando…</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-10 text-gray-600 text-xs">
          Nenhum grupo criado ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g._id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{g.nome}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {g.emails?.length > 0
                    ? g.emails.join(", ")
                    : <span className="italic">Nenhum usuário</span>}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setEditTarget(g)}
                  className="text-xs text-gray-400 hover:text-blue-400 px-2.5 py-1 rounded border border-gray-700 hover:border-blue-600 transition-colors">
                  Editar
                </button>
                <button onClick={() => setDeleteTarget(g)}
                  className="text-xs text-gray-400 hover:text-red-400 px-2.5 py-1 rounded border border-gray-700 hover:border-red-700 transition-colors">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editTarget && (
        <GroupModal
          group={editTarget === "__new__" ? null : editTarget}
          session={session}
          onClose={() => setEditTarget(null)}
          onSave={handleSaved}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="font-semibold text-white text-sm mb-2">Excluir grupo</h3>
            <p className="text-xs text-gray-400 mb-6">
              O grupo <span className="text-white font-medium">{deleteTarget.nome}</span> será excluído permanentemente.
              Os usuários perderão as permissões associadas.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                {deleting ? "Excluindo…" : "Excluir"}
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg border border-gray-700">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
