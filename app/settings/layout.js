"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function SettingsLayout({ children }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAdmin      = session?.isAdmin ?? false;
  const canBackup    = isAdmin || session?.permissions?.configuracoes?.backupRestauracao;
  const canPermissoes = isAdmin || session?.permissions?.configuracoes?.gerenciarPermissoes;

  const tabs = [
    { href: "/settings/authentication", label: "Autenticação",         show: true },
    { href: "/settings/backup",         label: "Backup e Restauração", show: canBackup },
    { href: "/settings/permissions",    label: "Permissões",           show: canPermissoes },
  ].filter(t => t.show);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-gray-800 px-4 sm:px-6 py-3">
        <h1 className="font-semibold text-white text-sm sm:text-base">Configurações</h1>
      </div>
      <div className="border-b border-gray-800 px-4 sm:px-6 flex gap-1">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              pathname === tab.href
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="flex-1 p-4 sm:p-6 max-w-xl w-full mx-auto">
        {children}
      </div>
    </div>
  );
}
