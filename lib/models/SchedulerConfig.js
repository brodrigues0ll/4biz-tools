import mongoose from "mongoose";

const SchedulerConfigSchema = new mongoose.Schema({
  _id:       { type: String, default: "global" },
  session:   { type: String, default: "" },
  authToken: { type: String, default: "" },
  updatedAt: { type: Date,   default: Date.now },
});

export default mongoose.models.SchedulerConfig ||
  mongoose.model("SchedulerConfig", SchedulerConfigSchema);
