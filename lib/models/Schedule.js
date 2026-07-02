import mongoose from "mongoose";

const UnidadeSchema = new mongoose.Schema(
  { id: Number, nome: String, sigla: String },
  { _id: false },
);

const ScheduleSchema = new mongoose.Schema({
  nome:            { type: String, default: "" },
  frequencia:      { type: String, enum: ["diaria", "semanal", "mensal", "anual"], required: true },
  diasSemana:      [Number],
  diaMes:          { type: Number, min: 1, max: 31 },
  mes:             { type: Number, min: 1, max: 12 },
  hora:            { type: Number, required: true, min: 0, max: 23 },
  minuto:          { type: Number, required: true, min: 0, max: 59 },
  todasUnidades:   { type: Boolean, default: false },
  unidades:        [UnidadeSchema],
  patrimonioFixo:  { type: String, default: "" },
  session:         { type: String, required: true },
  authToken:       { type: String, required: true },
  templateStr:     { type: String, required: true },
  tecnico:         { type: { id: Number, nome: String }, _id: false },
  ativo:           { type: Boolean, default: true },
  ultimaExecucao:  { type: Date, default: null },
  proximaExecucao: { type: Date, required: true },
  criadoEm:        { type: Date, default: Date.now },
});

delete mongoose.models["Schedule"];
export default mongoose.model("Schedule", ScheduleSchema);
