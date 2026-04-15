// backend/controllers/appointment.controllers.js 
import Appointment from "../models/appointement.model.js";

// Get all appointments for the logged-in doctor
export const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctor: req.user.id })
      .populate("patient", "name age gender")
      .sort({ date: 1 });
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
};

// Create a new appointment
export const createAppointment = async (req, res) => {
  try {
    const { patient, date, time, status } = req.body;

    // --------- date validation & normalization (server-local YYYY-MM-DD) ----------
    let normalizedDate = null;
    if (typeof date === "string" && date.trim() !== "") {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        // Convert parsed date to server-local YYYY-MM-DD
        const tzOffsetMs = parsed.getTimezoneOffset() * 60000; // minutes -> ms
        const localISO = new Date(parsed - tzOffsetMs).toISOString();
        normalizedDate = localISO.split("T")[0];
      }
    }

    if (!normalizedDate) {
      return res
        .status(400)
        .json({ message: "Invalid or missing appointment date. Please provide a valid date (YYYY-MM-DD or ISO format)." });
    }
    // ---------------------------------------------------------------------------

    const appointment = new Appointment({
      doctor: req.user.id,
      patient,
      date: normalizedDate,
      time,
      status,
    });

    await appointment.save();
    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create appointment" });
  }
};
