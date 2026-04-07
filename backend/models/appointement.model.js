import mongoose from "mongoose";
const appointmentSchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
  date: String, // ISO date string "YYYY-MM-DD"
  time: String, // "HH:MM AM/PM"
  status: String, // e.g., "Confirmed", "Pending"
});
export default mongoose.model("Appointment", appointmentSchema);
