// backend/controllers/patient.controller.js
import axios from "axios";
import Patient from "../models/patient.model.js";
import bcrypt from "bcryptjs";

/**
 * Helper: safe extraction of numeric probability value
 * Returns Number or null if not present
 */
function safeProb(obj, path) {
  try {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return null;
      cur = cur[p];
    }
    if (cur == null) return null;
    return Number(cur);
  } catch {
    return null;
  }
}

// normalize numeric probability to 0..1 (accepts 0..1 or 0..100)
function normProb(v) {
  if (v == null) return null;
  const n = Number(v);
  if (isNaN(n)) return null;
  return n > 1 ? n / 100 : n;
}

/**
 * Add a new patient and compute risk via external FastAPI.
 * Re-uses your original behavior but with safety checks.
 */
export const addPatientWithRisk = async (req, res) => {
  try {
    const patientData = req.body;

    // 1. Prepare payload for FastAPI (same as before)
    const fastApiPayload = {
      name: patientData.name,
      email: patientData.email,
      age: patientData.age,
      gender: patientData.gender === "male" ? "1" : "0", // male -> "1", female -> "0"
      sbp: patientData.sbp,
      dbp: patientData.dbp,
      bmi: patientData.bmi,
      glucose: patientData.glucose,
      tc: patientData.tc,
      hdl: patientData.hdl,
      ldl: patientData.ldl,
      hba1c: patientData.hba1c,
      alt: patientData.alt,
      ast: patientData.ast,
      creat: patientData.creat,
      egfr: patientData.egfr,
      uacr: patientData.uacr,
      bilirubin: patientData.bilirubin,
      smoker: patientData.smoker ? "1" : "0",
      dm: patientData.dm ? "1" : "0",
      htn: patientData.htn ? "1" : "0",
      fam_cad: patientData.fam_cad ? "1" : "0",
    };

    // 2. Call FastAPI endpoint
    const predictorUrl =
      process.env.RISK_PREDICTOR_URL || "http://127.0.0.1:8000/api/patient/add";

    const riskRes = await axios.post(predictorUrl, fastApiPayload, { timeout: 20000 });

    // Uncomment during debugging:
    // console.log("PREDICTOR URL:", predictorUrl);
    // console.log("PREDICTOR REQUEST (truncated):", JSON.stringify(fastApiPayload).slice(0,500));
    // console.log("PREDICTOR RESPONSE (truncated):", JSON.stringify(riskRes.data).slice(0,2000));

    const riskData = riskRes?.data?.risk ?? null;
    if (!riskData) {
      return res
        .status(500)
        .json({ message: "Risk predictor returned no risk data." });
    }

    // 3. Save new patient with risk info
    const hashed = await bcrypt.hash("Test123@", 10);

    // Safe extraction of probabilities (guarding absent shapes)
    const cardioRaw = safeProb(riskData, "cardio.probabilities.High");
    const diabetesRaw = safeProb(riskData, "diabetes.probabilities.Yes");

    const cardioProb = normProb(cardioRaw);
    const diabetesProb = normProb(diabetesRaw);

    // Persist normalized probabilities into risk object so downstream code has canonical 0..1 values
    try {
      if (riskData?.cardio?.probabilities && cardioProb != null) {
        riskData.cardio.probabilities.High_norm = cardioProb;
      }
      if (riskData?.diabetes?.probabilities && diabetesProb != null) {
        riskData.diabetes.probabilities.Yes_norm = diabetesProb;
      }
    } catch (e) {
      // ignore if riskData shape unusual; we've already got cardioProb/diabetesProb
    }

    const THRESH = 0.35; // 35% threshold

    const newPatient = new Patient({
      ...patientData,
      password: hashed, // Store hashed password
      risk: riskData,
      cardio_label: cardioProb != null ? (cardioProb >= THRESH ? 1 : 0) : 0,
      diabetes_label: diabetesProb != null ? (diabetesProb >= THRESH ? 1 : 0) : 0,
    });

    await newPatient.save();

    res.status(201).json({
      message: "Patient added successfully with risk prediction",
      patient: newPatient,
    });
  } catch (error) {
    console.error("Error adding patient:", error);

    // Handle duplicate email (unique index) gracefully
    if (error && (error.code === 11000 || error.code === 11001) && error.keyPattern && error.keyPattern.email) {
      return res.status(409).json({ message: "Email already exists" });
    }

    res.status(500).json({
      message: "Failed to add patient with risk prediction",
      error: error.message,
    });
  }
};

/**
 * Compute/backfill risk for an existing patient by calling the predictor
 * and updating the patient document with risk and label fields.
 */
export const computePatientRisk = async (req, res) => {
  try {
    const patientId = req.params.id;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    // Prepare payload from existing patient fields (same mapping as addPatientWithRisk)
    const fastApiPayload = {
      name: patient.name,
      email: patient.email,
      age: patient.age,
      gender: (patient.gender === "male" || patient.gender === "1") ? "1" : "0",
      sbp: patient.sbp,
      dbp: patient.dbp,
      bmi: patient.bmi,
      glucose: patient.glucose,
      tc: patient.tc,
      hdl: patient.hdl,
      ldl: patient.ldl,
      hba1c: patient.hba1c,
      alt: patient.alt,
      ast: patient.ast,
      creat: patient.creat,
      egfr: patient.egfr,
      uacr: patient.uacr,
      bilirubin: patient.bilirubin,
      smoker: patient.smoker ? "1" : "0",
      dm: patient.dm ? "1" : "0",
      htn: patient.htn ? "1" : "0",
      fam_cad: patient.fam_cad ? "1" : "0",
    };

    const predictorUrl =
      process.env.RISK_PREDICTOR_URL || "http://127.0.0.1:8000/api/patient/add";

    const riskRes = await axios.post(predictorUrl, fastApiPayload, { timeout: 20000 });

    // Uncomment during debugging:
    // console.log("PREDICTOR RESPONSE (compute):", JSON.stringify(riskRes.data).slice(0,2000));

    const riskData = riskRes?.data?.risk ?? null;
    if (!riskData) {
      return res.status(500).json({ message: "Risk predictor returned no risk data." });
    }

    // Extract probabilities safely and normalize
    const cardioRaw = safeProb(riskData, "cardio.probabilities.High");
    const diabetesRaw = safeProb(riskData, "diabetes.probabilities.Yes");

    const cardioProb = normProb(cardioRaw);
    const diabetesProb = normProb(diabetesRaw);
    const THRESH = 0.35;

    // Persist normalized probabilities into risk object
    try {
      if (riskData?.cardio?.probabilities && cardioProb != null) {
        riskData.cardio.probabilities.High_norm = cardioProb;
      }
      if (riskData?.diabetes?.probabilities && diabetesProb != null) {
        riskData.diabetes.probabilities.Yes_norm = diabetesProb;
      }
    } catch (e) {
      // ignore weird shapes
    }

    // Update patient doc
    patient.risk = riskData;
    patient.cardio_label = cardioProb != null ? (cardioProb >= THRESH ? 1 : 0) : 0;
    patient.diabetes_label = diabetesProb != null ? (diabetesProb >= THRESH ? 1 : 0) : 0;

    await patient.save();

    res.json({ message: "Risk computed and saved", patient });
  } catch (err) {
    console.error("computePatientRisk error:", err);
    res.status(500).json({ message: "Failed to compute risk", error: err.message });
  }
};

export const addMedicationToPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, dose, instructions } = req.body;

    const patient = await Patient.findById(id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    patient.medications.push({ name, dose, instructions });
    await patient.save();

    res.json({ message: "Medication added successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to add medication" });
  }
};

export const getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err) {
    console.error("Error fetching patients:", err);
    res.status(500).json({ message: "Failed to fetch patients" });
  }
};

// Update labs and top-level lab fields for a specific patient (doctor-only)
export const updatePatientLabsByDoctor = async (req, res) => {
  try {
    const patientId = req.params.id;
    const { labs } = req.body;
    if (!Array.isArray(labs)) {
      return res.status(400).json({ message: "labs array is required" });
    }

    // Normalize labs: { name, value, date }
    const cleaned = labs.map((l) => ({
      name: l?.name ?? null,
      value: l?.value == null ? null : l.value,
      date: l?.date ?? null,
    }));

    // Prepare top-level updates from labs (so legacy top-level fields also updated)
    const top = {};
    cleaned.forEach((item) => {
      if (!item?.name) return;
      const n = String(item.name).toLowerCase();
      const v = item.value;
      if (/hba1c/i.test(n)) top.hba1c = v;
      if (/^alt$/i.test(n)) top.alt = v;
      if (/^ast$/i.test(n)) top.ast = v;
      if (/creat(ini)?/i.test(n)) top.creat = v;
      if (/egfr/i.test(n)) top.egfr = v;
      if (/uacr/i.test(n)) top.uacr = v;
      if (/bilirubin/i.test(n)) top.bilirubin = v;
      if (/^tc$|total cholesterol/i.test(n)) top.tc = v;
      if (/^ldl$/i.test(n)) top.ldl = v;
      if (/^hdl$/i.test(n)) top.hdl = v;
      if (/^glucose$/i.test(n)) top.glucose = v;
    });

    // Update patient document: set labs and top-level fields
    const updated = await Patient.findByIdAndUpdate(
      patientId,
      { $set: { labs: cleaned, ...top } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Patient not found" });
    res.json({ message: "Saved", patient: updated });
  } catch (err) {
    console.error("updatePatientLabsByDoctor:", err);
    res.status(500).json({ message: "Failed to update patient labs", error: err.message });
  }
};
