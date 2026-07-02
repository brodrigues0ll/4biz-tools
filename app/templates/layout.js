"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TemplatesLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-gray-800 px-4 sm:px-6 py-3">
        <h1 className="font-semibold text-white text-sm sm:text-base">Templates</h1>
      </div>
      <div className="border-b border-gray-800 px-4 sm:px-6 flex gap-1">
        <Link
          href="/templates/close"
          className={`px-4 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            pathname === "/templates/close"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          Encerramento
        </Link>
        <Link
          href="/templates/open"
          className={`px-4 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            pathname === "/templates/open"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          Abertura
        </Link>
      </div>
      {children}
    </div>
  );
}
