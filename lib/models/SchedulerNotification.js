import mongoose from "mongoose";

const SchedulerNotificationSchema = new mongoose.Schema({
  scheduleId:   { type: mongoose.Schema.Types.ObjectId, ref: "Schedule" },
  scheduleName: { type: String, default: "" },
  tipo:         { type: String, enum: ["sem_tecnico", "erro_execucao", "erro_delegacao", "erro_unidade"], required: true },
  mensagem:     { type: String, required: true },
  lido:         { type: Boolean, default: false },
  criadoEm:    { type: Date, default: Date.now },
});

delete mongoose.models["SchedulerNotification"];
export default mongoose.model("SchedulerNotification", SchedulerNotificationSchema);
