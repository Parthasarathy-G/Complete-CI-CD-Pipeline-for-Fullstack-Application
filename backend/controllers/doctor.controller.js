// backend/controllers/doctor.controller.js
import Patient from "../models/patient.model.js";
import Appointment from "../models/appointement.model.js";
import Timeline from "../models/timeline.model.js";
import PDFDocument from "pdfkit";
import { Readable } from "stream";
import path from "path";
// 1. Get patients who booked appointments with the doctor
export const getAssignedPatients = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const appointments = await Appointment.find({ doctor: doctorId }).select(
      "patient"
    );
    const patientIds = [
      ...new Set(appointments.map((a) => a.patient.toString())),
    ];

    const patients = await Patient.find(
      { _id: { $in: patientIds } },
      "name age gender risk"
    );
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch patients" });
  }
};

export const getPatientDetails = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch patient data" });
  }
};

export const downloadPatientReport = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Create PDF
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const stream = new Readable().wrap(doc);

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Patient_Report_${patient.name.replace(
        /\s+/g,
        "_"
      )}.pdf`
    );

    // Safe PDF metadata
    doc.info.Title = `Report – ${patient.name || "Unknown"}`;
    doc.info.Author = "HealthSys";
    doc.info.Subject = "Patient Risk Assessment";
    doc.info.CreationDate = new Date();

    // Utilities
    const hr = (y) => {
      doc
        .strokeColor("#DDD")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(doc.page.width - 50, y)
        .stroke();
    };

    const drawTitle = (title) => {
      hr(doc.y);
      doc
        .moveDown(0.2)
        .font("Helvetica-Bold")
        .fillColor("#004D7A")
        .fontSize(14)
        .text(title)
        .moveDown(0.8);
    };

    // Header
    doc
      .fillColor("#004D7A")
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("Patient Risk Assessment Report", { align: "center" })
      .moveDown(0.5)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#666")
      .text(`Generated on ${new Date().toDateString()}`, { align: "center" })
      .moveDown(1);

    // Patient Info
    drawTitle("Patient Information");
    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor("#333")
      .text(`Name: `, { continued: true })
      .font("Helvetica-Bold")
      .text(patient.name)
      .moveDown(0.3)
      .font("Helvetica")
      .text(`Age: `, { continued: true })
      .font("Helvetica-Bold")
      .text(`${patient.age} years`)
      .moveDown(0.3)
      .font("Helvetica")
      .text(`Gender: `, { continued: true })
      .font("Helvetica-Bold")
      .text(patient.gender === "1" ? "Male" : "Female")
      .moveDown(1);

    // Risk Report
    drawTitle("Risk Assessment Results");
    const renderRisk = (label, data) => {
      doc
        .font("Helvetica-Bold")
        .fillColor("#004D7A")
        .text(`${label}`)
        .moveDown(0.3)
        .font("Helvetica")
        .fillColor("#333")
        .text(`Level: ${data}`, {
          indent: 20,
        })
        .moveDown(0.2)
        .text(`Interpretation: ${data?.interpretation || "N/A"}`, {
          indent: 20,
        })
        .moveDown(1);
    };

    if (patient.risk?.cardio) {
      renderRisk("Cardiovascular Risk", patient.risk.cardio);
    }
    if (patient.risk?.diabetes) {
      renderRisk("Diabetes Risk", patient.risk.diabetes);
    }

    // Medications from patient schema
    drawTitle("Prescribed Medications");
    if (patient.medications && patient.medications.length > 0) {
      patient.medications
        .slice()
        .reverse()
        .forEach((med, i) => {
          doc
            .font("Helvetica-Bold")
            .fontSize(12)
            .fillColor("#004D7A")
            .text(`#${i + 1} – ${new Date(med.date).toDateString()}`)
            .moveDown(0.2)
            .font("Helvetica")
            .fontSize(11)
            .fillColor("#333")
            .text(`Name: ${med.name}`, { indent: 20 })
            .text(`Dose: ${med.dose}`, { indent: 20 })
            .text(`Instructions: ${med.instructions}`, { indent: 20 })
            .moveDown(1);
        });
    } else {
      doc
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#A00")
        .text("No medications prescribed yet.", { indent: 20 })
        .moveDown(1);
    }

    // Footer with page numbers
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#999")
        .text(
          "Confidential – Handle per HIPAA regulations",
          50,
          doc.page.height - 40
        )
        .text(`Page ${i + 1} of ${range.count}`, 0, doc.page.height - 40, {
          align: "right",
          width: doc.page.width - 50,
        });
    }

    doc.end();
    stream.pipe(res);
  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(500).json({ message: "Report generation failed" });
  }
};

export const getPatientTimeline = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const timeline = [];

    // Add Alerts
    if (patient.alerts && patient.alerts.length > 0) {
      patient.alerts.forEach((alert) => {
        timeline.push({
          type: "Alert",
          title: alert.type || "Alert",
          message: alert.message || "Checkup needed",
          date: alert.date || new Date(),
        });
      });
    }

    // Add Diagnoses based on labels
    if (patient.diabetes_label === 1) {
      timeline.push({
        type: "Diagnosis",
        title: "Diagnosed with Diabetes",
        message: "High HBA1C and glucose level",
        date: patient.createdAt,
      });
    }
    if (patient.ckd_label === 1) {
      timeline.push({
        type: "Diagnosis",
        title: "Diagnosed with Chronic Kidney Disease",
        message: "Elevated creatinine/low eGFR detected",
        date: patient.createdAt,
      });
    }
    if (patient.nafld_label === 1) {
      timeline.push({
        type: "Diagnosis",
        title: "NAFLD Suspected",
        message: "ALT/AST markers above normal range",
        date: patient.createdAt,
      });
    }

    // Add a dummy appointment for now (optional)
    timeline.push({
      type: "Appointment",
      title: "Follow-up Visit",
      message: "Scheduled review with endocrinologist",
      date: new Date(new Date().setDate(new Date().getDate() + 7)),
    });

    res.json(timeline.sort((a, b) => new Date(b.date) - new Date(a.date)));
  } catch (err) {
    console.error("Timeline error:", err);
    res.status(500).json({ message: "Failed to load patient timeline" });
  }
};

export const addMedicationToPatient = async (req, res) => {
  try {
    const { name, dose, instructions } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Medication name is required" });
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Check if already prescribed
    const existingMed = patient.medications.find(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    );

    if (existingMed) {
      existingMed.dose = dose;
      existingMed.instructions = instructions;
    } else {
      patient.medications.push({
        name,
        dose,
        instructions,
        date: new Date(),
      });
    }

    await patient.save();

    // Add timeline event
    await Timeline.create({
      patientId: req.params.id,
      date: new Date(),
      event: `Medication ${existingMed ? "updated" : "added"}: ${name}`,
    });

    res.json({ success: true, medications: patient.medications });
  } catch (err) {
    console.error("Error adding medication:", err);
    res.status(500).json({ message: "Server error" });
  }
};
