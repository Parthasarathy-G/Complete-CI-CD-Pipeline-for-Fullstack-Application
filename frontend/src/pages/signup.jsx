import React, { useMemo, useState } from "react";
import { useRouter } from "next/router"; // if using App Router, see note below
import { registerUser } from "../utils/api";
import { motion } from "framer-motion";
import { Geist, Geist_Mono } from "next/font/google"; 
const ROLES = ["doctor", "patient"];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const SignupPage = () => {
  const router = useRouter();
  const [role, setRole] = useState("doctor");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    specialization: "",
  age: "",
  gender: "",
  vitals: { heartRate: "", bpSystolic: "", bpDiastolic: "", bmi: "" },
  labs: [{ name: "HbA1c", value: "", date: "" }, { name: "Triglycerides", value: "", date: "" }],
    accept: false,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    if (name.includes(".")) {
      // handle nested keys like vitals.bpSystolic or labs.0.value
      const parts = name.split(".");
      setForm((prev) => {
        const copy = JSON.parse(JSON.stringify(prev));
        let cur = copy;
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i];
          if (!(p in cur)) cur[p] = isNaN(Number(parts[i + 1])) ? {} : [];
          cur = cur[p];
        }
        cur[parts[parts.length - 1]] = val;
        return copy;
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: val }));
    }
  };

  // Basic password score for hinting only (0-3)
  const pwScore = useMemo(() => {
    const pw = form.password || "";
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }, [form.password]);

  const validate = () => {
    const errs = {};

    if (!form.name?.trim()) errs.name = "Full name is required.";
    if (!form.email) errs.email = "Email is required.";
    else if (!emailRegex.test(form.email)) errs.email = "Enter a valid email.";

    if (!form.password) errs.password = "Password is required.";
    else if (form.password.length < 8) errs.password = "At least 8 characters.";

    if (!form.confirmPassword) errs.confirmPassword = "Confirm your password.";
    else if (form.confirmPassword !== form.password)
      errs.confirmPassword = "Passwords do not match.";

    if (role === "doctor") {
      if (!form.specialization?.trim())
        errs.specialization = "Specialization is required.";
    } else {
      const ageNum = Number(form.age);
      if (!form.age) errs.age = "Age is required.";
      else if (!Number.isFinite(ageNum) || ageNum <= 0) errs.age = "Enter a valid age.";
      if (!form.gender) errs.gender = "Select a gender.";
    }

    if (!form.accept) errs.accept = "You must accept the Terms & Privacy.";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const payload =
        role === "doctor"
          ? {
              name: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
              specialization: form.specialization.trim(),
            }
          : {
              name: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
                  age: Number(form.age),
                  gender: form.gender,
                  vitals: {
                    heartRate: form.vitals?.heartRate ? Number(form.vitals.heartRate) : null,
                    bpSystolic: form.vitals?.bpSystolic ? Number(form.vitals.bpSystolic) : null,
                    bpDiastolic: form.vitals?.bpDiastolic ? Number(form.vitals.bpDiastolic) : null,
                    bmi: form.vitals?.bmi ? Number(form.vitals.bmi) : null,
                  },
                  labs: form.labs || [],
            };

      await registerUser(role, payload);
      router.push("/login");
    } catch (err) {
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Registration failed. Please try again.";
      setError(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  const canSubmit = useMemo(() => {
    // quick gate to enable/disable; full validation still runs on submit
    if (!form.name || !form.email || !form.password || !form.confirmPassword || !form.accept)
      return false;
    if (role === "doctor" && !form.specialization) return false;
    if (role === "patient" && (!form.age || !form.gender)) return false;
    return !loading;
  }, [form, role, loading]);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white to-blue-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-xl w-full max-w-md"
      >
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Create your account
        </h1>
        <p className="text-center text-gray-600 mb-6">Sign up as {role}</p>

        {/* Role Switcher */}
        <div className="flex items-center justify-center gap-2 mb-6" role="tablist" aria-label="Select role">
          {ROLES.map((r) => {
            const active = role === r;
            return (
              <button
                key={r}
                role="tab"
                aria-selected={active}
                onClick={() => setRole(r)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  active
                    ? "bg-blue-600 text-white focus:ring-blue-600"
                    : "bg-gray-200 text-gray-700 hover:bg-blue-100 focus:ring-blue-300"
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Name */}
        <div className="space-y-1 mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Dr. Jane Doe / John Smith"
            value={form.name}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldErrors.name ? "border-red-400" : "border-gray-300"
            }`}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
          />
          {fieldErrors.name && <p id="name-error" className="text-sm text-red-600">{fieldErrors.name}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1 mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              fieldErrors.email ? "border-red-400" : "border-gray-300"
            }`}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          {fieldErrors.email && <p id="email-error" className="text-sm text-red-600">{fieldErrors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1 mb-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
              onKeyDown={onKeyDown}
              className={`w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.password ? "border-red-400" : "border-gray-300"
              }`}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          {fieldErrors.password && <p id="password-error" className="text-sm text-red-600">{fieldErrors.password}</p>}

          {/* Strength hint */}
          <div className="mt-1 flex items-center gap-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded ${pwScore > i ? "bg-blue-600" : "bg-gray-300"}`}
              />
            ))}
            <span className="text-xs text-gray-500">
              {pwScore <= 1 ? "Weak" : pwScore === 2 ? "Okay" : "Good"}
            </span>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1 mb-4">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={handleChange}
              onKeyDown={onKeyDown}
              className={`w-full p-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.confirmPassword ? "border-red-400" : "border-gray-300"
              }`}
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby={fieldErrors.confirmPassword ? "confirm-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p id="confirm-error" className="text-sm text-red-600">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        {/* Role-specific fields */}
        {role === "doctor" ? (
          <div className="space-y-1 mb-4">
            <label htmlFor="specialization" className="block text-sm font-medium text-gray-700">
              Specialization
            </label>
            <input
              id="specialization"
              name="specialization"
              type="text"
              placeholder="e.g., Cardiology"
              value={form.specialization}
              onChange={handleChange}
              onKeyDown={onKeyDown}
              className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                fieldErrors.specialization ? "border-red-400" : "border-gray-300"
              }`}
              aria-invalid={!!fieldErrors.specialization}
              aria-describedby={fieldErrors.specialization ? "spec-error" : undefined}
            />
            {fieldErrors.specialization && (
              <p id="spec-error" className="text-sm text-red-600">{fieldErrors.specialization}</p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-1 mb-4">
              <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                Age
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min="0"
                placeholder="e.g., 32"
                value={form.age}
                onChange={handleChange}
                onKeyDown={onKeyDown}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.age ? "border-red-400" : "border-gray-300"
                }`}
                aria-invalid={!!fieldErrors.age}
                aria-describedby={fieldErrors.age ? "age-error" : undefined}
              />
              {fieldErrors.age && <p id="age-error" className="text-sm text-red-600">{fieldErrors.age}</p>}
            </div>

            <div className="space-y-1 mb-2">
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                onKeyDown={onKeyDown}
                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.gender ? "border-red-400" : "border-gray-300"
                }`}
                aria-invalid={!!fieldErrors.gender}
                aria-describedby={fieldErrors.gender ? "gender-error" : undefined}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other / Prefer not to say</option>
              </select>
              {fieldErrors.gender && (
                <p id="gender-error" className="text-sm text-red-600">{fieldErrors.gender}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Heart Rate</label>
                <input name="vitals.heartRate" type="number" value={form.vitals.heartRate} onChange={handleChange} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">BMI</label>
                <input name="vitals.bmi" type="number" value={form.vitals.bmi} onChange={handleChange} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Systolic BP</label>
                <input name="vitals.bpSystolic" type="number" value={form.vitals.bpSystolic} onChange={handleChange} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Diastolic BP</label>
                <input name="vitals.bpDiastolic" type="number" value={form.vitals.bpDiastolic} onChange={handleChange} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">HbA1c (%)</label>
                <input name="labs.0.value" value={form.labs[0].value} onChange={handleChange} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Triglycerides (mmol/L)</label>
                <input name="labs.1.value" value={form.labs[1].value} onChange={handleChange} className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </>
        )}

        {/* Terms */}
        <div className="flex items-start gap-2 mb-4">
          <input
            id="accept"
            name="accept"
            type="checkbox"
            checked={form.accept}
            onChange={handleChange}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-invalid={!!fieldErrors.accept}
            aria-describedby={fieldErrors.accept ? "accept-error" : undefined}
          />
          <label htmlFor="accept" className="text-sm text-gray-700">
            I agree to the{" "}
            <a className="text-blue-600 underline" href="/terms">Terms</a> and{" "}
            <a className="text-blue-600 underline" href="/privacy">Privacy Policy</a>.
          </label>
        </div>
        {fieldErrors.accept && (
          <p id="accept-error" className="text-sm text-red-600 -mt-3 mb-2">{fieldErrors.accept}</p>
        )}

        {/* API error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
            role="alert"
          >
            {error}
          </motion.div>
        )}

        {/* Submit */}
        <motion.button
          whileHover={{ scale: canSubmit ? 1.02 : 1 }}
          whileTap={{ scale: canSubmit ? 0.98 : 1 }}
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`mt-2 w-full py-3 rounded-lg text-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            canSubmit
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl focus:ring-blue-600"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Creating account…
            </span>
          ) : (
            "Sign Up"
          )}
        </motion.button>

        <p className="mt-6 text-center text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-blue-600 hover:underline">Log in</a>
        </p>
      </motion.div>
    </section>
  );
};

export default SignupPage;
