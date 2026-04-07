// backend/models/timeline.model.js
import mongoose from "mongoose";

const TimelineSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    date: { type: Date, default: Date.now },
    event: { type: String, required: true },
    type: { type: String, enum: ["Alert", "Diagnosis", "Appointment", "Medication"], default: "Medication" },
  },
  { timestamps: true }
);

export default mongoose.model("Timeline", TimelineSchema);
