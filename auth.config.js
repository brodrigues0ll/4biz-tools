/** Configuração de auth compatível com Edge Runtime (sem axios / Node.js APIs).
 *  Usada pelo middleware. O auth.js completo usa este arquivo como base. */

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.session     = user.session;
        token.authToken   = user.authToken;
        token.username    = user.username;
        token.name        = user.name;
        token.email       = user.email;
        token.permissions = user.permissions;
        token.isAdmin     = user.isAdmin;
      }
      return token;
    },
    session({ session, token }) {
      session.session     = token.session;
      session.authToken   = token.authToken;
      session.permissions = token.permissions ?? null;
      session.isAdmin     = token.isAdmin ?? false;
      session.user = {
        name:     token.name     ?? session.user?.name     ?? "",
        email:    token.email    ?? session.user?.email    ?? "",
        username: token.username ?? "",
      };
      return session;
    },
  },
};
