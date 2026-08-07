import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, ChevronDown, ArrowLeft, MailCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import AuthHero from "../components/AuthHero.jsx";
import Spinner from "../components/Spinner.jsx";
import FinexaLogo from "../components/FinexaLogo.jsx";
import SocialAuthButtons from "../components/SocialAuthButtons.jsx";

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
];

const Register = () => {
  const { sendRegisterOtp, verifyRegisterOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = form, 2 = OTP
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    currency: "USD",
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const otpInputRef = useRef(null);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await sendRegisterOtp({ email: form.email });
      setMaskedEmail(res.email || form.email);
      setStep(2);
      setTimeout(() => otpInputRef.current?.focus(), 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      await verifyRegisterOtp({ ...form, otp });
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep(1);
    setOtp("");
  };

  return (
    <div className="min-h-screen flex bg-background text-text-primary">
      <div className="flex-1 flex flex-col px-6 sm:px-10 lg:px-14 py-8 order-1">
        <div className="flex justify-start items-center">
          <FinexaLogo variant="horizontal" size={64} titleSize={24} />
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-md">
            {step === 1 ? (
              <>
                <h2 className="text-4xl font-bold text-text-primary tracking-tight mb-2">
                  Sign Up
                </h2>
                <p className="text-text-secondary mb-10">
                  Create your account in seconds
                </p>

                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">
                      Name
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="input-field w-full rounded-2xl px-5 py-4 text-sm placeholder-text-tertiary focus-ring-accent"
                      placeholder="Alex"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="input-field w-full rounded-2xl px-5 py-4 text-sm placeholder-text-tertiary focus-ring-accent"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={form.password}
                        onChange={(e) =>
                          setForm({ ...form, password: e.target.value })
                        }
                        className="input-field w-full rounded-2xl px-5 py-4 pr-12 text-sm placeholder-text-tertiary focus-ring-accent"
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">
                      Currency
                    </label>
                    <div className="relative">
                      <select
                        value={form.currency}
                        onChange={(e) =>
                          setForm({ ...form, currency: e.target.value })
                        }
                        className="input-field w-full appearance-none rounded-2xl px-5 py-4 pr-12 text-sm placeholder-text-tertiary focus-ring-accent cursor-pointer"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={18}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold py-4 rounded-2xl transition shadow-lg shadow-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" />
                        Sending code...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition mb-6"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>

                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                    <MailCheck size={32} className="text-accent" />
                  </div>
                  <h2 className="text-3xl font-bold text-text-primary tracking-tight mb-2">
                    Verify your email
                  </h2>
                  <p className="text-text-secondary">
                    We sent a 6-digit code to{" "}
                    <span className="font-semibold text-text-primary">
                      {maskedEmail}
                    </span>
                    . Enter it below to activate your account.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-text-primary">
                      Verification code
                    </label>
                    <input
                      ref={otpInputRef}
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      className="input-field w-full rounded-2xl px-5 py-4 text-center text-2xl font-bold tracking-[0.5em] placeholder-text-tertiary focus-ring-accent"
                      placeholder="••••••"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold py-4 rounded-2xl transition shadow-lg shadow-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Sign Up"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="w-full text-center text-sm font-semibold text-accent hover:text-accent-hover transition disabled:opacity-60"
                  >
                    Didn't get the code? Resend
                  </button>
                </form>
              </>
            )}

            {step === 1 && (
              <>
                <SocialAuthButtons />
                <p className="text-center mt-8 text-sm text-text-secondary">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-accent hover:text-accent-hover transition"
                  >
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-start gap-6 text-xs text-text-secondary">
          <a className="hover:text-text-primary transition cursor-pointer">
            Privacy Policy
          </a>
          <a className="hover:text-text-primary transition cursor-pointer">
            Terms
          </a>
          <a className="hover:text-text-primary transition cursor-pointer">
            FAQ
          </a>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] order-2">
        <AuthHero headline="Begin" subheadline="your financial journey" />
      </div>
    </div>
  );
};

export default Register;
