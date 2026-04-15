import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true }, // stored as Date
    url: { type: String },                 // e.g., /uploads/xxxx.ext
  },
  { timestamps: true }
);

export default mongoose.model("Report", ReportSchema);
