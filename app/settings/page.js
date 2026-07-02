"use client";

import { useState, useEffect, useRef } from "react";
import { idbLoad, idbSave } from "@/lib/idb";

// ── Aba de Autenticação ───────────────────────────────────────────────────────

function AuthTab() {
  const [session, setSession]       = useState("");
  const [authToken, setAuthToken]   = useState("");
  const [showSession, setShowSession] = useState(false);
  const [showToken, setShowToken]   = useState(false);
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    idbLoad("auth").then((auth) => {
      if (auth?.session)    setSession(auth.session);
      if (auth?.authToken)  setAuthToken(auth.authToken);
    });
  }, []);

  async function handleSave() {
    await idbSave({ session, authToken }, "auth");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleClear() {
    setSession("");
    setAuthToken("");
    await idbSave({ session: "", authToken: "" }, "auth");
    setSaved(false);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold text-white mb-1 text-sm">Autenticação 4Biz</h2>
        <p className="text-xs text-gray-500 mb-4">
          Cookies obtidos do navegador após fazer login no 4Biz. Ficam salvos localmente neste dispositivo.
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-gray-400 mb-1 block">SESSION</span>
            <div className="relative">
              <input
                type={showSession ? "text" : "password"}
                value={session}
                onChange={(e) => setSession(e.target.value)}
                placeholder="Cole o valor do cookie SESSION"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-16 text-xs font-mono text-gray-100 focus:outline-none focus:border-blue-500"
              />
              <button type="button" onClick={() => setShowSession((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300">
                {showSession ? "ocultar" : "mostrar"}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-gray-400 mb-1 block">HYPER-AUTH-TOKEN</span>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Cole o valor do cookie HYPER-AUTH-TOKEN"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-16 text-xs font-mono text-gray-100 focus:outline-none focus:border-blue-500"
              />
              <button type="button" onClick={() => setShowToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300">
                {showToken ? "ocultar" : "mostrar"}
              </button>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSave} disabled={!session || !authToken}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors text-sm">
            Salvar
          </button>
          <button onClick={handleClear}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm border border-gray-700">
            Limpar
          </button>
          {saved && <span className="text-xs text-green-400">✓ Salvo</span>}
        </div>
      </section>

      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold text-white mb-2 text-sm">Como obter os cookies</h2>
        <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside">
          <li>Faça login no 4Biz pelo navegador</li>
          <li>Abra as ferramentas de desenvolvedor (F12)</li>
          <li>Vá em <span className="text-gray-200">Application → Cookies</span></li>
          <li>Copie os valores de <span className="font-mono text-gray-200">SESSION</span> e <span className="font-mono text-gray-200">HYPER-AUTH-TOKEN</span></li>
        </ol>
      </section>
    </div>
  );
}

// ── Aba de Backup e Restauração ───────────────────────────────────────────────

function BackupTab() {
  const [downloading, setDownloading]   = useState(false);
  const [restoring, setRestoring]       = useState(false);
  const [restoreStatus, setRestoreStatus] = useState(null); // null | { ok, msg }
  const [confirmOpen, setConfirmOpen]   = useState(false);
  const [pendingFile, setPendingFile]   = useState(null);
  const fileRef = useRef(null);

  async function handleBackup() {
    setDownloading(true);
    try {
      const res = await fetch("/api/backup");
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

      {/* Backup */}
      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold text-white mb-1 text-sm">Exportar Backup</h2>
        <p className="text-xs text-gray-500 mb-4">
          Baixa um arquivo JSON com todos os templates e agendamentos cadastrados.
        </p>
        <button onClick={handleBackup} disabled={downloading}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloading ? "Gerando…" : "Baixar Backup"}
        </button>
      </section>

      {/* Restore */}
      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold text-white mb-1 text-sm">Restaurar Backup</h2>
        <p className="text-xs text-gray-500 mb-1">
          Importa um arquivo de backup. <span className="text-red-400 font-medium">Todos os dados atuais serão substituídos.</span>
        </p>
        <p className="text-xs text-gray-600 mb-4">Somente arquivos gerados pelo exportador desta aplicação são suportados.</p>

        <input ref={fileRef} type="file" accept=".json,application/json"
          onChange={handleFileChange} className="hidden" />

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

      {/* Modal de confirmação */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="font-semibold text-white text-sm mb-2">Confirmar restauração</h3>
            <p className="text-xs text-gray-400 mb-1">
              Arquivo: <span className="text-gray-200 font-mono">{pendingFile?.name}</span>
            </p>
            <p className="text-xs text-red-400 mb-6">
              Todos os templates e agendamentos existentes serão apagados e substituídos pelos dados do arquivo.
            </p>
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

// ── Componente principal ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("auth");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-gray-800 px-4 sm:px-6 py-3">
        <h1 className="font-semibold text-white text-sm sm:text-base">Configurações</h1>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-800 px-4 sm:px-6 flex gap-1">
        {[
          { id: "auth",   label: "Autenticação" },
          { id: "backup", label: "Backup e Restauração" },
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

      <div className="flex-1 p-4 sm:p-6 max-w-xl w-full mx-auto">
        {activeTab === "auth"   && <AuthTab />}
        {activeTab === "backup" && <BackupTab />}
      </div>
    </div>
  );
}
