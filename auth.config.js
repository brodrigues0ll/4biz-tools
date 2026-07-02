/** Configuração de auth compatível com Edge Runtime (sem axios / Node.js APIs).
 *  Usada pelo middleware. O auth.js completo usa este arquivo como base. */

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.session   = user.session;
        token.authToken = user.authToken;
        token.username  = user.username;
        // name e email já são campos padrão do token Next-Auth
        token.name      = user.name;
        token.email     = user.email;
      }
      return token;
    },
    session({ session, token }) {
      session.session   = token.session;
      session.authToken = token.authToken;
      // Garante que os dados do usuário decodificados do JWT chegam ao cliente
      session.user = {
        name:     token.name     ?? session.user?.name     ?? "",
        email:    token.email    ?? session.user?.email    ?? "",
        username: token.username ?? "",
      };
      return session;
    },
  },
};
