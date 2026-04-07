// backend/models/patient.model.js
import mongoose from "mongoose";

const CardioRiskSchema = new mongoose.Schema(
  {
    probabilities: {
      High: Number,
      Low: Number,
    },
    interpretation: String,
  },
  { _id: false }
);

const DiabetesRiskSchema = new mongoose.Schema(
  {
    probabilities: {
      Yes: Number,
      No: Number,
    },
    interpretation: String,
  },
  { _id: false }
);

const MedicationSchema = new mongoose.Schema({
  name: String,
  dose: String,
  instructions: String,
  date: { type: Date, default: Date.now },
});

const PatientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    age: Number,
    hr: Number,
    gender: String,
    sbp: Number,
    dbp: Number,
    glucose: Number,
    bmi: Number,
    tc: Number,
    hdl: Number,
    ldl: Number,
    smoker: Number,
    dm: Number,
    htn: Number,
    fam_cad: Number,
    hba1c: Number,
    alt: Number,
    ast: Number,
    creat: Number,
    egfr: Number,
    uacr: Number,
    bilirubin: Number,

    diabetes_label: Number,
    cardio_label: Number,
    ckd_label: Number,
    nafld_label: Number,

    risk: {
      cardio: CardioRiskSchema,
      diabetes: DiabetesRiskSchema,
    },

    vitals: {
      heartRate: Number,
      bpSystolic: Number,
      bpDiastolic: Number,
      bmi: Number,
    },

    labs: [
      {
        name: String,
        value: mongoose.Schema.Types.Mixed,
        date: Date,
      },
    ],

    alerts: [{ message: String, type: String, date: Date }],

    medications: [MedicationSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Patient", PatientSchema);
