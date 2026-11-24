import mongoose from "mongoose";

const cronLogSchema = new mongoose.Schema(
  {
    jobName: { type: String, default: "DAILY_ORDER_CLEANUP" },
    triggerType: {
      type: String,
      enum: ["SCHEDULED", "MANUAL"],
      default: "SCHEDULED",
    },
    status: { type: String, enum: ["SUCCESS", "FAILED"], default: "SUCCESS" },
    cancelledOrdersCount: { type: Number, default: 0 },
    restoredItemsCount: { type: Number, default: 0 },
    details: { type: String },
    durationMs: { type: Number },
  },
  { timestamps: true },
);

const CronLog = mongoose.model("CronLog", cronLogSchema);
export default CronLog;
