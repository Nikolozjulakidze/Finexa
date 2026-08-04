import { useRef, useEffect } from "react";
import { gsap } from "gsap";

const FeatureCard = ({ icon, title, children }) => {
  const cardRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const card = cardRef.current;
    const glow = glowRef.current;

    const handleMouseMove = (e) => {
      const { left, top, width, height } = card.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      const rotateX = gsap.utils.mapRange(0, height, 15, -15, y);
      const rotateY = gsap.utils.mapRange(0, width, -15, 15, x);

      gsap.to(card, {
        rotateX: rotateX,
        rotateY: rotateY,
        duration: 0.7,
        ease: "power3.out",
      });

      gsap.to(glow, {
        x: x,
        y: y,
        duration: 0.5,
        ease: "power3.out",
      });
    };

    const handleMouseEnter = () => {
      gsap.to(card, { scale: 1.05, duration: 0.5, ease: "power3.out" });
      gsap.to(glow, { opacity: 1, duration: 0.5, ease: "power3.out" });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 1,
        ease: "elastic.out(1, 0.5)",
      });
      gsap.to(glow, { opacity: 0, duration: 0.5, ease: "power3.out" });
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseenter", handleMouseEnter);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseenter", handleMouseEnter);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className="feature-card relative bg-surface/70 p-8 rounded-2xl border border-border-color overflow-hidden shadow-soft"
      style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
    >
      <div
        ref={glowRef}
        className="glow"
        style={{
          position: "absolute",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background:
            "radial-gradient(circle at center, var(--accent-bg) 0%, rgba(255, 255, 255, 0) 40%)",
          opacity: 0,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      ></div>
      <div className="card-content" style={{ transform: "translateZ(50px)" }}>
        <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-accent-bg border border-accent/20 mb-6 text-accent">
          {icon}
        </div>
        <h3 className="text-2xl font-bold mb-2 text-text-primary">{title}</h3>
        <p className="text-text-secondary">{children}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
