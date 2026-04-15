// backend/controllers/dashboard.controller.js
import Patient from "../models/patient.model.js";
import Appointment from "../models/appointement.model.js";

// 1. Assigned Patients Count (based on booked appointments)
export const getAssignedPatientsCount = async (req, res) => {
  try {
    const doctorId = req.user.id;

    // Find distinct patient IDs from appointments booked with this doctor
    const assignedPatientIds = await Appointment.distinct("patient", {
      doctor: doctorId,
    });

    res.json({ count: assignedPatientIds.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch patient count" });
  }
};

// 2. Today's Appointments Count (for logged-in doctor)
export const getTodaysAppointmentsCount = async (req, res) => {
  try {
    const doctorId = req.user.id;
    // compute today's date in server local timezone (avoid UTC off-by-one)
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000; // offset in ms
    const localISO = new Date(now - tzOffsetMs).toISOString();
    const today = localISO.split("T")[0]; // YYYY-MM-DD

    const count = await Appointment.countDocuments({
      doctor: doctorId,
      date: today,
    });

    res.json({ count, date: today });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch today's appointments" });
  }
};

// 3. High Risk Patients (based on booked appointments with doctor)
export const getHighRiskPatients = async (req, res) => {
  try {
    const doctorId = req.user.id;

    // 1) Find all distinct patients who have appointments with this doctor
    const patientIds = await Appointment.distinct("patient", {
      doctor: doctorId,
    });

    if (!patientIds || patientIds.length === 0) {
      return res.json([]);
    }

    // 2) Load patient docs (lean for speed). Pull many fields we'll need.
    const patients = await Patient.find({ _id: { $in: patientIds } }).lean();

    // helper: normalize probability value to 0..1 (handles 0..1 or 0..100 stored)
    const normProb = (v) => {
      if (v == null) return 0;
      const n = Number(v);
      if (isNaN(n)) return 0;
      return n > 1 ? n / 100 : n;
    };

    // clinical thresholds derived from your examples:
    const RULES = {
      cardio: {
        systolic: 160, // mmHg
        diastolic: 100, // mmHg
        bmi: 30, // obese
        tc: 6.2, // total cholesterol mmol/L
        ldl: 3.4, // LDL mmol/L
        hdl: 1.0, // HDL mmol/L (low if <1.0)
        creat: 1.5, // mg/dL approximate threshold
        egfr: 60, // mL/min/1.73m2 (CKD risk if <60)
        uacr: 30, // mg/g (microalbuminuria threshold)
      },
      diabetes: {
        fasting_glucose: 7.0, // mmol/L
        hba1c: 6.5, // percent; use 6.5+ as diabetes/high-risk
        bmi: 30,
        uacr: 30,
        egfr: 60,
      },
      probabilityThreshold: 0.35, // 35%
    };

    const flagged = [];

    const checkHighRisk = (p) => {
      const reasons = [];

      // 1. Model probabilities (new shape)
      const cardioProb =
        normProb(p?.risk?.cardio?.probabilities?.High ?? p?.risk?.cardio?.High ?? null);
      const diabetesProb =
        normProb(p?.risk?.diabetes?.probabilities?.Yes ?? p?.risk?.diabetes?.Yes ?? null);

      if (cardioProb > RULES.probabilityThreshold) {
        reasons.push({ type: "model", domain: "cardio", score: cardioProb });
      }
      if (diabetesProb > RULES.probabilityThreshold) {
        reasons.push({ type: "model", domain: "diabetes", score: diabetesProb });
      }

      // 2. Legacy flags / old-shape strings
      if (
        p.cardio_label === 1 ||
        (p?.risk?.cardio?.predicted_risk || "").toString().toLowerCase().includes("high")
      ) {
        reasons.push({ type: "flag", domain: "cardio", note: "cardio_label/predicted_risk" });
      }
      if (
        p.diabetes_label === 1 ||
        (p?.risk?.diabetes?.prediction || "").toString().toLowerCase().includes("high")
      ) {
        reasons.push({ type: "flag", domain: "diabetes", note: "diabetes_label/prediction" });
      }

      // 3. Clinical thresholds (vitals & labs) — collect simple maps
      const v = p.vitals || {};
      const labsMap = (p.labs || []).reduce((acc, it) => {
        if (it?.name) acc[it.name.toString().toLowerCase()] = it.value;
        return acc;
      }, {});

      // also allow top-level lab fields (legacy)
      const top = {
        hba1c: p.hba1c ?? labsMap["hba1c"] ?? labsMap["hba-1c"] ?? null,
        tc: p.tc ?? labsMap["total cholesterol"] ?? labsMap["tc"] ?? null,
        ldl: p.ldl ?? labsMap["ldl"] ?? null,
        hdl: p.hdl ?? labsMap["hdl"] ?? null,
        creat: p.creat ?? labsMap["creatinine"] ?? null,
        egfr: p.egfr ?? null,
        uacr: p.uacr ?? null,
        glucose: p.glucose ?? labsMap["glucose"] ?? null,
        bmi: (v?.bmi ?? p.bmi ?? null),
      };

      // Cardio clinical checks
      if (v?.bpSystolic != null && Number(v.bpSystolic) >= RULES.cardio.systolic)
        reasons.push({ type: "clinical", domain: "cardio", note: `systolic ${v.bpSystolic}` });
      if (v?.bpDiastolic != null && Number(v.bpDiastolic) >= RULES.cardio.diastolic)
        reasons.push({ type: "clinical", domain: "cardio", note: `diastolic ${v.bpDiastolic}` });
      if (top.bmi != null && Number(top.bmi) >= RULES.cardio.bmi)
        reasons.push({ type: "clinical", domain: "cardio", note: `bmi ${top.bmi}` });
      if (top.tc != null && Number(top.tc) > RULES.cardio.tc)
        reasons.push({ type: "clinical", domain: "cardio", note: `tc ${top.tc}` });
      if (top.ldl != null && Number(top.ldl) > RULES.cardio.ldl)
        reasons.push({ type: "clinical", domain: "cardio", note: `ldl ${top.ldl}` });
      if (top.hdl != null && Number(top.hdl) < RULES.cardio.hdl)
        reasons.push({ type: "clinical", domain: "cardio", note: `hdl ${top.hdl}` });
      if (top.creat != null && Number(top.creat) > RULES.cardio.creat)
        reasons.push({ type: "clinical", domain: "cardio", note: `creat ${top.creat}` });
      if (top.egfr != null && Number(top.egfr) < RULES.cardio.egfr)
        reasons.push({ type: "clinical", domain: "cardio", note: `egfr ${top.egfr}` });
      if (top.uacr != null && Number(top.uacr) > RULES.cardio.uacr)
        reasons.push({ type: "clinical", domain: "cardio", note: `uacr ${top.uacr}` });

      // History/lifestyle contributions
      if (p.smoker === true || p.smoker === "1" || String(p.smoker) === "true")
        reasons.push({ type: "history", domain: "cardio", note: "smoker" });
      if (p.dm === true || p.dm === "1" || String(p.dm) === "true" || p.diabetes === true)
        reasons.push({ type: "history", domain: "diabetes", note: "diabetes" });
      if (p.htn === true || p.htn === "1" || p.hypertension === true)
        reasons.push({ type: "history", domain: "cardio", note: "hypertension" });
      if (
        p.fam_cad === true ||
        p.fam_cad === "1" ||
        p.familyHistoryCad === true ||
        String(p.fam_cad).toLowerCase() === "yes"
      )
        reasons.push({ type: "history", domain: "cardio", note: "family CAD" });

      // Diabetes-specific checks
      if (top.glucose != null && Number(top.glucose) >= RULES.diabetes.fasting_glucose)
        reasons.push({ type: "clinical", domain: "diabetes", note: `glucose ${top.glucose}` });
      if (top.hba1c != null && Number(top.hba1c) >= RULES.diabetes.hba1c)
        reasons.push({ type: "clinical", domain: "diabetes", note: `hba1c ${top.hba1c}` });
      if (top.uacr != null && Number(top.uacr) >= RULES.diabetes.uacr)
        reasons.push({ type: "clinical", domain: "diabetes", note: `uacr ${top.uacr}` });
      if (top.egfr != null && Number(top.egfr) < RULES.diabetes.egfr)
        reasons.push({ type: "clinical", domain: "diabetes", note: `egfr ${top.egfr}` });

      const isHigh = reasons.length > 0;
      return { isHigh, reasons, cardioProb, diabetesProb };
    };

    // Evaluate all patients, collect those flagged
    for (const p of patients) {
      const { isHigh, reasons, cardioProb, diabetesProb } = checkHighRisk(p);
      if (isHigh) {
        flagged.push({
          _id: p._id,
          name: p.name,
          age: p.age,
          gender: p.gender,
          risk: p.risk ?? null,
          cardioProb,
          diabetesProb,
          reasons,
        });
      }
    }

    // Sort flagged by a simple score (number of reasons + probabilities) and return top 10
    const sorted = flagged
      .slice()
      .sort((a, b) => {
        const score = (x) => (x.reasons?.length || 0) + (Number(x.cardioProb || 0)) + (Number(x.diabetesProb || 0));
        return score(b) - score(a);
      })
      .slice(0, 10);

    res.json(sorted);
  } catch (err) {
    console.error("Error fetching high risk patients:", err);
    res.status(500).json({ message: "Failed to fetch high risk patients" });
  }
};

// 4. Upcoming Appointments (for logged-in doctor)
export const getUpcomingAppointments = async (req, res) => {
  try {
    const doctorId = req.user.id;
    // compute today's date in server local timezone (avoid UTC off-by-one)
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000; // offset in ms
    const localISO = new Date(now - tzOffsetMs).toISOString();
    const today = localISO.split("T")[0];

    const appointments = await Appointment.find({
      doctor: doctorId,
      date: { $gte: today },
    })
      .populate("patient", "name")
      .sort({ date: 1, time: 1 })
      .limit(5);

    const formatted = appointments.map((a) => ({
      patient: a.patient?.name || "Unknown",
      date: a.date,
      time: a.time,
      status: a.status,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
};
