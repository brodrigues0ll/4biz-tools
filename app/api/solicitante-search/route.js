import axios from "axios";

export async function POST(request) {
  try {
    const { session, authToken, query } = await request.json();

    if (!authToken) {
      return Response.json({ error: "HYPER-AUTH-TOKEN obrigatório." }, { status: 400 });
    }
    if (!query || query.trim().length < 2) {
      return Response.json({ query, suggestions: [], data: [] });
    }

    const cookieString = session ? `SESSION=${session}; HYPER-AUTH-TOKEN=${authToken}` : `HYPER-AUTH-TOKEN=${authToken}`;

    const client = axios.create({
      baseURL: "https://nav.4biz.one/4biz",
      headers: {
        Accept: "text/plain, */*; q=0.01",
        "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-transform, no-store, no-cache, must-revalidate, post-check=0, pre-check=0",
        Connection: "keep-alive",
        DNT: "1",
        Origin: "https://nav.4biz.one",
        Pragma: "no-cache",
        Referer:
          "https://nav.4biz.one/4biz/pages/serviceRequestIncident/serviceRequestIncident.load?iframe=true",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        Cookie: cookieString,
      },
    });

    const { data } = await client.get(
      `/pages/serviceRequestIncident/pages/autoCompleteSolicitante/autoCompleteSolicitante.load`,
      { params: { query: query.trim() } },
    );

    return Response.json(data);
  } catch (err) {
    if (err.response) {
      const body = typeof err.response.data === "string"
        ? err.response.data.slice(0, 2000)
        : JSON.stringify(err.response.data).slice(0, 2000);
      console.error("[solicitante-search] status:", err.response.status, "body:", body);
      return Response.json(
        { error: `Erro da API 4Biz: ${err.response.status}`, detail: body },
        { status: err.response.status },
      );
    }
    console.error("[solicitante-search] erro interno:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
