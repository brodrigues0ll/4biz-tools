import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import axios from "axios";
import { authConfig } from "@/auth.config";

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return {};
  }
}

async function validate4biz(session, authToken) {
  try {
    const cookie = session
      ? `SESSION=${session}; HYPER-AUTH-TOKEN=${authToken}`
      : `HYPER-AUTH-TOKEN=${authToken}`;
    const { status } = await axios.get(
      "https://nav.4biz.one/4biz/pages/serviceRequestIncident/pages/autoCompleteUnidade/autoCompleteUnidade.load",
      {
        params: { query: "DN" },
        headers: {
          Accept: "text/plain, */*; q=0.01",
          "Content-Type": undefined,
          Cookie: cookie,
          Origin: "https://nav.4biz.one",
          Referer: "https://nav.4biz.one/4biz/pages/serviceRequestIncident/serviceRequestIncident.load?iframe=true",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "X-Requested-With": "XMLHttpRequest",
        },
        timeout: 8000,
      },
    );
    return status === 200;
  } catch {
    return false;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        session:   { label: "SESSION",          type: "password" },
        authToken: { label: "HYPER-AUTH-TOKEN", type: "password" },
      },
      async authorize(credentials) {
        const { session = "", authToken = "" } = credentials ?? {};
        if (!authToken) return null;

        const valid = await validate4biz(session, authToken);
        if (!valid) return null;

        const claims = decodeJwt(authToken);

        return {
          id:       claims.sub || "user",
          name:     claims.name || claims.preferred_username || "Usuário",
          email:    claims.email || "",
          username: claims.preferred_username || "",
          session,
          authToken,
        };
      },
    }),
  ],
});
