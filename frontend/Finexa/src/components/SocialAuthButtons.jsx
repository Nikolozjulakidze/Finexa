import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import Spinner from "./Spinner.jsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.002.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
);

const SocialAuthButtons = () => {
  const { sendGoogleOtp, verifyGoogleOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("idle"); // idle | otp
  const [idToken, setIdToken] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState(null);
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);

  const googleButtonRef = useRef(null);
  const googleRenderedRef = useRef(false);
  const recaptchaRef = useRef(null);

  const finishAuth = useCallback(async () => {
    toast.success("Signed in with Google!");
    navigate("/dashboard");
  }, [navigate]);

  const handleCredential = useCallback(
    async (credential) => {
      setSending(true);
      try {
        const data = await sendGoogleOtp(credential);
        setIdToken(credential);
        setMaskedEmail(data.email);
        setOtp("");
        setRecaptchaToken(null);
        setStep("otp");
        toast.success("Verification code sent to your email");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to send code");
      } finally {
        setSending(false);
      }
    },
    [sendGoogleOtp],
  );

  // Initialize Google Identity Services once.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return;
    if (!window.google?.accounts) {
      toast.error("Google sign-in is not available");
      return;
    }
    if (googleRenderedRef.current) return;
    googleRenderedRef.current = true;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => handleCredential(response.credential),
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      width: googleButtonRef.current.offsetWidth || 280,
      shape: "pill",
      text: "signin_with",
      logo_alignment: "left",
    });
  }, [handleCredential]);

  // Render the reCAPTCHA widget once the OTP step is shown.
  useEffect(() => {
    if (step !== "otp" || !recaptchaRef.current) return;
    if (!window.grecaptcha || !RECAPTCHA_SITE_KEY) return;

    window.grecaptcha.render(recaptchaRef.current, {
      sitekey: RECAPTCHA_SITE_KEY,
      theme: "light",
      callback: (token) => setRecaptchaToken(token),
    });
  }, [step]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error("Please enter the verification code");
      return;
    }
    if (!recaptchaToken) {
      toast.error(
        "Please complete the reCAPTCHA to confirm you are not a robot",
      );
      return;
    }

    setVerifying(true);
    try {
      await verifyGoogleOtp({ idToken, otp: otp.trim(), recaptchaToken });
      await finishAuth();
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = () => {
    setStep("idle");
    setIdToken(null);
    setMaskedEmail(null);
    setOtp("");
    setRecaptchaToken(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-border-color" />
        <span className="text-xs uppercase tracking-wider text-text-tertiary font-medium">
          or continue with
        </span>
        <div className="flex-1 h-px bg-border-color" />
      </div>

      {step === "idle" && (
        <>
          {/* Google button — rendered by the SDK into this container */}
          <div
            ref={googleButtonRef}
            className="w-full h-[50px] flex items-center justify-center overflow-hidden [&_iframe]:!w-full"
          >
            {!GOOGLE_CLIENT_ID && (
              <button
                type="button"
                onClick={() =>
                  toast.error("Google sign-in is not configured yet")
                }
                className="inline-flex items-center justify-center gap-2.5 border border-border-color bg-surface hover:bg-surface-alt text-text-primary font-semibold py-3.5 rounded-2xl transition w-full h-full"
              >
                <GoogleIcon />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="rounded-2xl border border-border-color bg-surface/60 p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <GoogleIcon />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Verify your email
                  </p>
                  <p className="text-xs text-text-secondary">
                    We sent a code to {maskedEmail}
                    {!RECAPTCHA_SITE_KEY && (
                      <span className="ml-1 text-amber-500">
                        (reCAPTCHA not configured)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-text-tertiary hover:text-text-primary transition"
              >
                Change
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary">
                Verification code
              </label>
              <input
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]*"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="input-field w-full rounded-2xl px-5 py-4 text-center text-lg tracking-[0.5em] placeholder-text-tertiary focus-ring-accent"
                placeholder="______"
                autoFocus
              />
            </div>

            {/* reCAPTCHA widget */}
            <div className="flex justify-center">
              {RECAPTCHA_SITE_KEY ? (
                <div ref={recaptchaRef} />
              ) : (
                <button
                  type="button"
                  onClick={() => toast.error("reCAPTCHA is not configured yet")}
                  className="border border-border-color bg-surface rounded-lg px-4 py-2 text-xs text-text-secondary"
                >
                  reCAPTCHA unavailable
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold py-3.5 rounded-2xl transition shadow-lg shadow-violet-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <>
                  <Spinner size="sm" />
                  Verifying...
                </>
              ) : (
                "Verify & Sign In"
              )}
            </button>
          </div>
        </form>
      )}

      {sending && (
        <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
          <Spinner size="sm" />
          Sending verification code...
        </div>
      )}
    </div>
  );
};

export default SocialAuthButtons;
