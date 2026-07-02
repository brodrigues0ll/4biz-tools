"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { idbLoad, idbSave } from "@/lib/idb";

export default function AuthenticationPage() {
  const [session,     setSession]     = useState("");
  const [authToken,   setAuthToken]   = useState("");
  const [showSession, setShowSession] = useState(false);
  const [showToken,   setShowToken]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [status,      setStatus]      = useState(null);

  useEffect(() => {
    idbLoad("auth").then((auth) => {
      if (auth?.session)   setSession(auth.session);
      if (auth?.authToken) setAuthToken(auth.authToken);
    });
  }, []);

  async function handleSave() {
    if (!session.trim() || !authToken.trim()) {
      setStatus({ ok: false, msg: "Preencha SESSION e HYPER-AUTH-TOKEN." });
      return;
    }
    setLoading(true);
    setStatus(null);

    const result = await signIn("credentials", {
      session:   session.trim(),
      authToken: authToken.trim(),
      redirect:  false,
    });

    if (result?.error) {
      setStatus({ ok: false, msg: "Cookies inválidos ou expirados. Verifique os valores e tente novamente." });
      setLoading(false);
      return;
    }

    await idbSave({ session: session.trim(), authToken: authToken.trim() }, "auth");
    setStatus({ ok: true, msg: "Cookies atualizados e sessão renovada." });
    setLoading(false);
  }

  async function handleClear() {
    setSession("");
    setAuthToken("");
    await idbSave({ session: "", authToken: "" }, "auth");
    setStatus(null);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="font-semibold text-white mb-1 text-sm">Autenticação 4Biz</h2>
        <p className="text-xs text-gray-500 mb-4">
          Cookies obtidos do navegador após fazer login no 4Biz. Atualizar aqui renova a sessão sem precisar sair do sistema.
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

        {status && (
          <div className={`mt-4 px-3 py-2.5 rounded-lg text-xs font-medium ${
            status.ok
              ? "bg-green-900/30 border border-green-700/50 text-green-300"
              : "bg-red-900/30 border border-red-700/50 text-red-300"
          }`}>
            {status.ok ? "✓ " : "✗ "}{status.msg}
          </div>
        )}

        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSave} disabled={loading || !session || !authToken}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors text-sm">
            {loading ? "Verificando…" : "Salvar e renovar sessão"}
          </button>
          <button onClick={handleClear}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg text-sm border border-gray-700">
            Limpar
          </button>
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
