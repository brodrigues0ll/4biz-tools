"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [session,   setSession]   = useState("");
  const [authToken, setAuthToken] = useState("");
  const [showSess,  setShowSess]  = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!session.trim() || !authToken.trim()) {
      setError("Preencha SESSION e HYPER-AUTH-TOKEN.");
      return;
    }
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      session:   session.trim(),
      authToken: authToken.trim(),
      redirect:  false,
    });

    if (result?.error) {
      setError("Credenciais inválidas. Verifique SESSION e HYPER-AUTH-TOKEN.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / título */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-white">Automação 4Biz</h1>
          <p className="text-xs text-gray-500 mt-1">Insira seus cookies de autenticação para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">

          {/* SESSION */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">SESSION</label>
            <div className="relative">
              <input
                type={showSess ? "text" : "password"}
                value={session}
                onChange={(e) => setSession(e.target.value)}
                placeholder="Cole o valor do cookie SESSION"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 pr-16 text-xs font-mono text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowSess((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300">
                {showSess ? "ocultar" : "mostrar"}
              </button>
            </div>
          </div>

          {/* HYPER-AUTH-TOKEN */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">HYPER-AUTH-TOKEN</label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Cole o valor do cookie HYPER-AUTH-TOKEN"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 pr-16 text-xs font-mono text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowToken((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300">
                {showToken ? "ocultar" : "mostrar"}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading || !session || !authToken}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors text-sm mt-2">
            {loading ? "Verificando…" : "Entrar"}
          </button>

          {/* Instruções */}
          <details className="mt-2">
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400 select-none">
              Como obter os cookies?
            </summary>
            <ol className="text-xs text-gray-500 space-y-1 mt-2 list-decimal list-inside">
              <li>Faça login no 4Biz pelo navegador</li>
              <li>Abra as ferramentas de desenvolvedor (F12)</li>
              <li>Vá em <span className="text-gray-300">Application → Cookies</span></li>
              <li>Copie <span className="font-mono text-gray-300">SESSION</span> e <span className="font-mono text-gray-300">HYPER-AUTH-TOKEN</span></li>
            </ol>
          </details>
        </form>
      </div>
    </div>
  );
}
