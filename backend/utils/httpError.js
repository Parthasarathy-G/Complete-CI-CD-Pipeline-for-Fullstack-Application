// utils/httpError.js
export const httpBadReq = (res, message) => res.status(400).json({ ok:false, message });
export const httpServerErr = (res, message, meta) => {
  console.error(message, meta ?? "");
  return res.status(500).json({ ok:false, message });
};
