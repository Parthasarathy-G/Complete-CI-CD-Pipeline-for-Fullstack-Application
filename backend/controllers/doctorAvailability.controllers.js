import DoctorAvailability from "../models/doctorAvailability.model.js";

const isYMD  = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isHHMM = (s) => typeof s === "string" && /^\d{2}:\d{2}$/.test(s);

// Delete older duplicates for a (doctor,date) pair, keep newest
async function consolidateDuplicates(doctorId, date) {
  const dupes = await DoctorAvailability
    .find({ doctor: doctorId, date })
    .sort({ updatedAt: -1, createdAt: -1 })
    .select("_id")
    .lean();

  if (dupes.length > 1) {
    const keep = dupes[0]._id;
    const toDelete = dupes.slice(1).map(d => d._id);
    await DoctorAvailability.deleteMany({ _id: { $in: toDelete } });
    return keep;
  }
  return dupes[0]?._id ?? null;
}

export const getAvailability = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthenticated" });
    const { date } = req.query;
    if (!isYMD(date)) return res.status(400).json({ message: "Invalid 'date' (YYYY-MM-DD required)" });

    const doc = await DoctorAvailability.findOne({ doctor: req.user.id, date }).lean();
    return res.json({ ok: true, date, slots: doc?.slots ?? [] });
  } catch (err) {
    console.error("getAvailability error:", err);
    return res.status(500).json({ message: "Failed to fetch availability" });
  }
};

export const setAvailability = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthenticated" });

    const { date, slots } = req.body;
    if (!isYMD(date))  return res.status(400).json({ message: "Invalid 'date' (YYYY-MM-DD required)" });
    if (!Array.isArray(slots)) return res.status(400).json({ message: "'slots' must be an array of HH:MM strings" });

    // Normalize: HH:MM only, unique, sorted
    const cleaned = [...new Set(
      slots.map(s => String(s).trim()).filter(s => s && isHHMM(s))
    )].sort();

    // Upsert atomically, then fetch (never assume the doc exists in-memory)
    await DoctorAvailability.updateOne(
      { doctor: req.user.id, date },
      { $set: { slots: cleaned } },
      { upsert: true }
    );

    const doc = await DoctorAvailability.findOne({ doctor: req.user.id, date }).lean();
    return res.status(200).json({ ok: true, date: doc?.date ?? date, slots: doc?.slots ?? cleaned });

  } catch (err) {
    // Duplicate key → collapse dupes, retry once in a null-safe way
    if (err?.code === 11000) {
      try {
        await consolidateDuplicates(req.user.id, req.body.date);

        const dedupedSlots = [...new Set((req.body.slots || []).map(String))].sort();
        await DoctorAvailability.updateOne(
          { doctor: req.user.id, date: req.body.date },
          { $set: { slots: dedupedSlots } },
          { upsert: true }
        );

        const doc = await DoctorAvailability.findOne({ doctor: req.user.id, date: req.body.date }).lean();
        return res.status(200).json({
          ok: true,
          date: doc?.date ?? req.body.date,
          slots: doc?.slots ?? dedupedSlots
        });
      } catch (e2) {
        console.error("Failed after duplicate-key retry:", e2);
        return res.status(500).json({ message: "Failed after duplicate-key retry." });
      }
    }

    console.error("setAvailability error:", err);
    return res.status(500).json({ message: "Failed to save availability" });
  }
};
