export const PROFILE_MOBILE_CALIBRATION = Object.freeze({
  connect: { left: 15.02, top: 28.44, width: 69.60, height: 11.35 },
  connected: { left: 15.38, top: 29.38, width: 69.60, height: 9.80 },
  disconnect: { left: 34.93, top: 30.68, width: 30.80, height: 3.85 },
  wallet: { left: 15.90, top: 49.27, width: 59.10, height: 5.05 },
  copy: { left: 75.30, top: 49.78, width: 7.85, height: 4.35 },
  name: { left: 15.05, top: 63.10, width: 68.90, height: 5.25 },
  complete: { left: 22.88, top: 75.68, width: 54.80, height: 8.10 },
  back: { left: 34.60, top: 85.14, width: 30.80, height: 5.30 },
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
