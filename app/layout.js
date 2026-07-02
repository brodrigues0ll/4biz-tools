import "./globals.css";
import Sidebar from "./components/Sidebar";
import Providers from "./providers";
import { auth } from "@/auth";

export const metadata = {
  title: "Automação 4Biz",
  description: "Abertura e encerramento de chamados em massa no 4Biz",
};

export default async function RootLayout({ children }) {
  const session = await auth();
  const isLoggedIn = !!session;

  return (
    <html lang="pt-BR">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <Providers session={session}>
          <div className="flex flex-col lg:flex-row min-h-screen">
            {isLoggedIn && <Sidebar />}
            <main className="flex-1 min-w-0 flex flex-col">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
