import { Link } from "react-router-dom";
import FinexaLogo from "../components/FinexaLogo.jsx";

const Starter = () => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-linear-to-b from-[#111827] to-[#1E293B]">
      {/* Blurred office background */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-sm"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1497373317827-365f380a758f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2100&q=80')",
        }}
      />

      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Floating hero card with glassmorphism */}
      <div className="relative z-10 w-full max-w-2xl mx-4">
        <div className="relative rounded-[28px] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 p-12 text-center animate-fadeIn">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-[28px] bg-linear-to-b from-white/5 to-transparent pointer-events-none" />

          {/* Premium logo */}
          <div className="relative mb-6 flex justify-center">
            <FinexaLogo size={192} variant="icon" />
          </div>

          {/* Headline */}
          <h1 className="relative text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            Welcome to Finexa
          </h1>

          {/* Subheadline */}
          <p className="relative text-lg text-slate-300 mb-10 max-w-md mx-auto leading-relaxed">
            Financial clarity for a digital world.
          </p>

          {/* CTA Buttons */}
          <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="group inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-semibold py-4 px-10 rounded-2xl transition-all duration-300 shadow-lg shadow-white/10 hover:shadow-xl hover:shadow-white/20 hover:scale-[1.02]"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 border border-white/20 text-white font-semibold py-4 px-10 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/30 hover:scale-[1.02]"
            >
              Create Account
            </Link>
          </div>
        </div>

        {/* Soft shadow beneath the card */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-black/30 blur-2xl rounded-full pointer-events-none" />
      </div>
    </div>
  );
};

export default Starter;
