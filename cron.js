import { connectDB } from "./lib/mongodb.js";
import { initScheduler } from "./lib/scheduler.js";

await connectDB();
await initScheduler();

console.log("[cron] Processo iniciado.");

process.on("SIGTERM", () => { console.log("[cron] Encerrando..."); process.exit(0); });
process.on("SIGINT",  () => { console.log("[cron] Encerrando..."); process.exit(0); });
