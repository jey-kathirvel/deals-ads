"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!standalone) setVisible(true);

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
      setVisible(true);
    };

    const installed = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const install = async () => {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
      return;
    }

    if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) {
      window.alert("To install Deals.ai: tap Share in Safari, then choose Add to Home Screen.");
      return;
    }

    window.alert("Open your browser menu and choose Install app or Add to Home screen.");
  };

  if (!visible) return null;

  return (
    <button className="pwa-install" type="button" onClick={install}>
      <span aria-hidden="true">+</span>
      Install Deals.ai
    </button>
  );
}
