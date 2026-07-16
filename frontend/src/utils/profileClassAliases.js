const PROFILE_CLASS_ALIASES = [
  ["profile-connect-hit", "profile-connect-hitbox"],
  ["profile-wallet-display", "profile-wallet-address"],
  ["profile-copy-hit", "profile-wallet-copy-hitbox"],
  ["profile-name-input", "profile-name-input"],
  ["profile-complete-hit", "profile-complete-hitbox"],
  ["profile-back-hit", "profile-back-hitbox"],
  ["profile-status", "profile-status-message"],
  ["profile-status", "profile-loading-message"],
  ["profile-connect-disabled", "profile-wallet-status"],
  ["profile-disconnect-hit", "profile-disconnect-hitbox"]
];

function applyProfileAliases(root = document) {
  if (typeof document === "undefined") return;
  PROFILE_CLASS_ALIASES.forEach(([sourceClass, aliasClass]) => {
    root.querySelectorAll?.(`.${sourceClass}`).forEach((element) => {
      if (!element.classList.contains(aliasClass)) element.classList.add(aliasClass);
    });
  });
}

if (typeof document !== "undefined") {
  const start = () => {
    applyProfileAliases(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node?.nodeType !== Node.ELEMENT_NODE) return;
          applyProfileAliases(node);
          if (node.matches?.(".profile-page, .profile-stage")) applyProfileAliases(document);
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}
