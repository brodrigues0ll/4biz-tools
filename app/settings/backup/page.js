"use client";

import { useState, useRef } from "react";

export default function BackupPage() {
  const [downloading,   setDownloading]   = useState(false);
  const [restoring,     setRestoring]     = useState(false);
  const [restoreStatus, setRestoreStatus] = useState(null);
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [pendingFile,   setPendingFile]   = useState(null);
  const fileRef = useRef(null);

  async function handleBackup() {
    setDownloading(true);
    try {
      const res  = await fetch("/api/backup");
      if (!res.ok) throw new Error("Erro ao gerar backup.");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setConfirmOpen(true);
    e.target.value = "";
  }

  async function handleRestore() {
    if (!pendingFile) return;
    setConfirmOpen(false);
    setRestoring(true);
    setRestoreStatus(null);
    try {
      const text = await pendingFile.text();
      const body = JSON.parse(text);
      const res  = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRestoreStatus({ ok: true, msg: `Restaurado: ${data.templates} template(s) e ${data.schedules} agendamento(s).` });
    } catch (err) {
      setRestoreStatus({ ok: false, msg: err.message });
    } finally {
      setRestoring(false);
      setPendingFile(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold text-white mb-1 text-sm">Exportar Backup</h2>
        <p className="text-xs text-gray-500 mb-4">Baixa um arquivo JSON com todos os templates e agendamentos cadastrados.</p>
        <button onClick={handleBackup} disabled={downloading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloading ? "Gerando…" : "Baixar Backup"}
        </button>
      </section>

      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold text-white mb-1 text-sm">Restaurar Backup</h2>
        <p className="text-xs text-gray-500 mb-1">
          Importa um arquivo de backup. <span className="text-red-400 font-medium">Todos os dados atuais serão substituídos.</span>
        </p>
        <p className="text-xs text-gray-600 mb-4">Somente arquivos gerados pelo exportador desta aplicação são suportados.</p>

        <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFileChange} className="hidden" />

        <button onClick={() => fileRef.current?.click()} disabled={restoring}
          className="px-5 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 text-gray-200 font-semibold rounded-lg transition-colors text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
          </svg>
          {restoring ? "Restaurando…" : "Selecionar arquivo"}
        </button>

        {restoreStatus && (
          <div className={`mt-4 px-4 py-3 rounded-lg text-xs font-medium ${
            restoreStatus.ok
              ? "bg-green-900/30 border border-green-700/50 text-green-300"
              : "bg-red-900/30 border border-red-700/50 text-red-300"
          }`}>
            {restoreStatus.ok ? "✓ " : "✗ "}{restoreStatus.msg}
          </div>
        )}
      </section>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="font-semibold text-white text-sm mb-2">Confirmar restauração</h3>
            <p className="text-xs text-gray-400 mb-1">Arquivo: <span className="text-gray-200 font-mono">{pendingFile?.name}</span></p>
            <p className="text-xs text-red-400 mb-6">Todos os templates e agendamentos existentes serão apagados e substituídos pelos dados do arquivo.</p>
            <div className="flex gap-3">
              <button onClick={handleRestore}
                className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors">
                Restaurar
              </button>
              <button onClick={() => { setConfirmOpen(false); setPendingFile(null); }}
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
