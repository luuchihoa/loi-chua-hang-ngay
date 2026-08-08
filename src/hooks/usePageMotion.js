import { useRef } from "react";

export function usePageMotion() {
  const heroRef = useRef(null);
  
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (d = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: d }
    })
  };

  const heroReveal = {
    hidden: { opacity: 0, y: 20 },
    visible: (d = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: d }
    })
  };

  const vp = { once: true, margin: "-10% 0px" };

  return { heroRef, heroY: 0, fadeUp, heroReveal, vp };
}
