export const PROFILE_MOBILE_CALIBRATION = Object.freeze({
  connect: { left: 21.02, top: 25.79, width: 57.82, height: 9.30 },
  connected: { left: 21.59, top: 25.88, width: 57.39, height: 8.96 },
  disconnect: { left: 34.93, top: 30.68, width: 30.80, height: 3.85 },
  wallet: { left: 24.25, top: 40.95, width: 44.53, height: 3.72 },
  copy: { left: 69.52, top: 40.98, width: 7.64, height: 3.51 },
  name: { left: 26.19, top: 51.65, width: 42.34, height: 4.04 },
  complete: { left: 22.88, top: 75.68, width: 54.80, height: 8.10 },
  back: { left: 30.74, top: 85.14, width: 39.15, height: 7.47 },
  status: { left: 10, bottom: 1.2, width: 80 }
});

function installProfileMobileCalibration() {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  Object.entries(PROFILE_MOBILE_CALIBRATION).forEach(([target, values]) => {
    Object.entries(values).forEach(([property, value]) => {
      root.style.setProperty(`--profile-mobile-${target}-${property}`, `${value}%`);
    });
  });
}

installProfileMobileCalibration();

if (typeof window !== "undefined") {
  window.PROFILE_MOBILE_CALIBRATION = PROFILE_MOBILE_CALIBRATION;
}
