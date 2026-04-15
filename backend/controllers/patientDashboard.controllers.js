import Doctor from "../models/doctor.model.js";
import Appointment from "../models/appointement.model.js";
import Patient from "../models/patient.model.js";
import Report from "../models/report.model.js";

// GET /api/patient/doctors
export const listDoctors = async (_req, res) => {
  try {
    const docs = await Doctor.find({}, "name specialization email").lean();
    res.json(docs);
  } catch {
    res.status(500).json({ message: "Failed to fetch doctors" });
  }
};

// GET /api/patient/appointments/upcoming
export const getUpcomingAppointmentsForPatient = async (req, res) => {
  try {
    const patientId = req.user.id;
    const appointments = await Appointment.find({ patient: patientId })
      .populate("doctor", "name specialization")
      .sort({ date: 1, time: 1 })
      .lean();
    res.json(appointments);
  } catch {
    res.status(500).json({ message: "Failed to fetch upcoming appointments" });
  }
};

// POST /api/patient/appointments/book
export const bookAppointment = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { doctorId, date, time, reason } = req.body;
    if (!doctorId || !date || !time) {
      return res.status(400).json({ message: "doctorId, date, time are required" });
    }

    // Normalize incoming date to server-local YYYY-MM-DD
    let normalizedDate = null;
    if (typeof date === "string" && date.trim() !== "") {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const tzOffsetMs = parsed.getTimezoneOffset() * 60000;
        const localISO = new Date(parsed - tzOffsetMs).toISOString();
        normalizedDate = localISO.split("T")[0];
      }
    }
    if (!normalizedDate) {
      return res.status(400).json({ message: "Invalid date. Please provide a valid date (YYYY-MM-DD or ISO format)." });
    }

    const appt = await Appointment.create({
      doctor: doctorId,
      patient: patientId,
      date: normalizedDate,
      time,
      status: "Pending",
      reason,
    });
    res.status(201).json(appt);
  } catch {
    res.status(500).json({ message: "Booking failed" });
  }
};

// GET /api/patient/reports
export const getPatientReports = async (req, res) => {
  try {
    const patientId = req.user.id;
    const reports = await Report.find({ patient: patientId })
      .sort({ date: -1, createdAt: -1 })
      .lean();
    res.json(reports);
  } catch {
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

// POST /api/patient/reports
export const addPatientReport = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { title, description, date } = req.body;
    if (!title?.trim() || !date || !description?.trim()) {
      return res.status(400).json({ message: "Title, date and description are required" });
    }
    const rpt = new Report({
      patient: patientId,
      title: title.trim(),
      description: description.trim(),
      date,
    });
    await rpt.save();
    res.status(201).json(rpt);
  } catch {
    res.status(500).json({ message: "Failed to save report" });
  }
};

// GET /api/patient/profile
export const getPatientProfile = async (req, res) => {
  try {
    const patientId = req.user.id;
    const patient = await Patient.findById(patientId).lean();
    res.json(patient);
  } catch {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// POST /api/patient/profile
export const upsertPatientProfile = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { name, age, gender, labs } = req.body;

    const updates = { name, age, gender };
    if (Array.isArray(labs)) updates.labs = labs;

    const a1c = labs?.find((l) => /hba1c/i.test(l?.name || ""));
    if (a1c?.value != null) updates.hba1c = Number(String(a1c.value).replace(/[^\d.]/g, ""));

    const patient = await Patient.findByIdAndUpdate(
      patientId,
      { $set: updates },
      { new: true, upsert: false }
    );
    res.json({ message: "Saved", patient });
  } catch {
    res.status(500).json({ message: "Failed to save profile" });
  }
};
