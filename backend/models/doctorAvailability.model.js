// models/doctorAvailability.model.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const DoctorAvailabilitySchema = new Schema(
  {
    doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    slots: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.every((s) => /^\d{2}:\d{2}$/.test(s)),
        message: "Each slot must be HH:MM (24h).",
      },
    },
  },
  { timestamps: true }
);

// One doc per doctor per date
DoctorAvailabilitySchema.index({ doctor: 1, date: 1 }, { unique: true });

export default mongoose.model("DoctorAvailability", DoctorAvailabilitySchema);
