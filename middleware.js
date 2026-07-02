import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  if (!isLoggedIn && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isLoggedIn) {
    const perms = req.auth.permissions ?? {};
    const isAdmin = req.auth.isAdmin ?? false;

    if (!isAdmin) {
      const redirect = (to) => NextResponse.redirect(new URL(to, req.url));

      if (pathname === "/" && !perms.abertura?.acessar) return redirect("/settings/authentication");

      if (pathname === "/close" && !perms.encerramento?.acessar) return redirect("/settings/authentication");

      if (pathname.startsWith("/templates") && !perms.templateEncerramento?.acessar)
        return redirect("/settings/authentication");

      if (pathname === "/settings/backup" && !perms.configuracoes?.backupRestauracao)
        return redirect("/settings/authentication");

      if (pathname === "/settings/permissions" && !perms.configuracoes?.gerenciarPermissoes)
        return redirect("/settings/authentication");

      if (pathname.startsWith("/schedule")) {
        if (!perms.agendamentos?.acessar) return redirect("/settings");
        if (
          (pathname === "/schedule/new" || pathname.match(/^\/schedule\/.+\/edit$/)) &&
          !perms.agendamentos?.editar
        )
          return redirect("/schedule");
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
