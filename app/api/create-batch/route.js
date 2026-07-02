import { createClient, validateConcurrentAccess, createTicket, getTicketItemId, lookupDelegationUserId, delegateTicket } from "@/lib/4biz";
import { applyTemplate } from "@/lib/template";

async function tryDelegate(client, ticketId, tecnico, groupId) {
  if (!tecnico?.nome) return;
  try {
    const itemId = await getTicketItemId(client, ticketId);
    if (!itemId) return;
    const userId = await lookupDelegationUserId(client, ticketId, tecnico.nome);
    if (!userId) return;
    await delegateTicket(client, { ticketId, itemId, userId, userName: tecnico.nome, groupId });
  } catch { /* silencia — não deve impedir o resultado do chamado */ }
}

export async function POST(request) {
  const { session, authToken, patrimonios, templateStr, tecnico } = await request.json();

  if (!authToken) {
    return Response.json({ error: "Cookies de autenticação obrigatórios." }, { status: 400 });
  }
  if (!Array.isArray(patrimonios) || patrimonios.length === 0) {
    return Response.json({ error: "Lista de patrimônios vazia." }, { status: 400 });
  }

  let templateObj;
  try {
    templateObj = JSON.parse(templateStr);
    JSON.stringify(templateObj);
  } catch {
    return Response.json({ error: "Template JSON inválido." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      const client = createClient(session, authToken);

      for (let i = 0; i < patrimonios.length; i++) {
        const patrimonio = String(patrimonios[i]).trim();

        try {
          const ok = await validateConcurrentAccess(client);
          if (!ok) {
            send({ index: i, patrimonio, success: false, error: "validateConcurrentAccess retornou false" });
            continue;
          }

          const payload = applyTemplate(templateStr, { patrimonio });
          const ticketId = await createTicket(client, payload);
          await tryDelegate(client, ticketId, tecnico, payload.idGrupoAtual);

          send({ index: i, patrimonio, success: true, ticketId });
        } catch (err) {
          const msg = err.response?.data
            ? JSON.stringify(err.response.data)
            : err.message;
          send({ index: i, patrimonio, success: false, error: msg });
        }

        if (i < patrimonios.length - 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }

      send({ done: true });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
