import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function PiggyBankAnimated() {
  // --- Persisté ---
  const [balance, setBalance] = useState(() => {
    const s = localStorage.getItem("piggy_balance"); return s ? parseFloat(s) : 0;
  });
  const [lastDropAt, setLastDropAt] = useState(() => {
    const s = localStorage.getItem("piggy_lastDropAt"); return s ? parseInt(s, 10) : Date.now();
  });

  // --- Réglages UI ---
  const [amount, setAmount] = useState(0.5);
  const [duration, setDuration] = useState(6); // secondes
  const [running, setRunning] = useState(true);
  const [soundOn, setSoundOn] = useState(false);

  // --- Scène / Anim ---
  const containerRef = useRef(null);
  const slotRef = useRef(null);
  const [targetXY, setTargetXY] = useState({ x: NaN, y: NaN });
  const coinSize = 48;
  const durationMs = duration * 1000;

  const [dropKey, setDropKey] = useState(0);       // force une nouvelle anim
  const animatingRef = useRef(false);              // évite des anims concurrentes
  const timerRef = useRef(null);                   // prochain rendez-vous

  // Persist
  useEffect(() => localStorage.setItem("piggy_balance", String(balance)), [balance]);
  useEffect(() => localStorage.setItem("piggy_lastDropAt", String(lastDropAt)), [lastDropAt]);

  // Mesure la cible (fente)
  useLayoutEffect(() => {
    function measure() {
      const c = containerRef.current, s = slotRef.current;
      if (!c || !s) return;
      const cr = c.getBoundingClientRect(), sr = s.getBoundingClientRect();
      const x = sr.left - cr.left + sr.width / 2 - coinSize / 2;
      const y = sr.top - cr.top - coinSize / 2;
      setTargetXY({ x, y });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Helpers timers
  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }
  function scheduleNext(ms) {
    clearTimer();
    timerRef.current = setTimeout(() => { timerRef.current = null; maybeStartNext(); }, Math.max(0, ms));
  }

  // Cible prête ?
  function targetReady() {
    return !!(containerRef.current && slotRef.current && Number.isFinite(targetXY.x) && Number.isFinite(targetXY.y));
  }

  // Cœur : décide quoi faire maintenant (anime 0 ou 1 pièce, crédite le reste sans anim)
  function maybeStartNext() {
    if (!running) return;
    if (document.visibilityState !== "visible") { scheduleNext(5000); return; }
    if (animatingRef.current) return;
    if (!targetReady()) { scheduleNext(50); return; }

    const now = Date.now();
    const elapsed = now - lastDropAt;
    let due = Math.floor(elapsed / durationMs); // nombre de périodes entières écoulées

    if (due <= 0) {
      const nextAt = lastDropAt + durationMs;
      scheduleNext(nextAt - now);
      return;
    }

    if (due >= 2) {
      // On a raté plusieurs pièces : crédite tout sauf 1 (celle qu’on va animer)
      const creditCount = due - 1;
      setBalance(b => parseFloat((b + creditCount * amount).toFixed(2)));
      setLastDropAt(prev => prev + creditCount * durationMs);
      // Il en reste 1 à animer maintenant
    }

    // Lance UNE animation réelle
    animatingRef.current = true;
    setDropKey(k => k + 1);
  }

  // Démarrages / changements → (re)planifie
  useEffect(() => {
    clearTimer();
    maybeStartNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, duration, lastDropAt, targetXY.x, targetXY.y]);

  // Visibilité : à la reprise, recalcule et repars
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        clearTimer();
        maybeStartNext();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fin d’anim : crédite + son + planifie la suite exactement
  function onAnimComplete() {
    // Crédit de CETTE pièce
    setBalance(b => parseFloat((b + amount).toFixed(2)));
    setLastDropAt(prev => prev + durationMs);

    if (soundOn) {
      const el = document.getElementById("coin-audio");
      if (el) { try { el.currentTime = 0; el.play(); } catch {} }
    }

    animatingRef.current = false;
    // décide la suite (replanifie si pas encore l’heure)
    maybeStartNext();
  }

  // Toggle Pause/Démarrer — fige le temps en pause (pas d’accumulation)
  function toggleRunning() {
    setRunning(prev => {
      const next = !prev;
      if (!next) {
        // PAUSE : gèle l’horloge, coupe timers, tue l’anim en cours
        clearTimer();
        animatingRef.current = false;
        setLastDropAt(Date.now());
        setDropKey(k => k + 1); // démonte l’anim instantanément
      } else {
        // REPRISE : redémarre propre, sans backlog
        clearTimer();
        setLastDropAt(Date.now());
        maybeStartNext();
      }
      return next;
    });
  }

  // Reset propre
  function hardReset() {
    // Stoppe tout
    clearTimer();
    animatingRef.current = false;
    setRunning(false);
    setDropKey(k => k + 1); // démonte l’anim en cours

    // État à zéro
    setBalance(0);
    const now = Date.now();
    setLastDropAt(now);

    // Repars clean après que la cible soit prête
    requestAnimationFrame(() => {
      if (!targetReady()) {
        scheduleNext(50); // laisse 1 tick pour la mesure, puis maybeStartNext
      }
      setRunning(true);
      setLastDropAt(Date.now()); // pas de backlog
      scheduleNext(0);
    });
  }

  return (
    <div style={{ maxWidth: 700, margin: "24px auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>🐷 Tirelire animée — stable & pause/reset fiables</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>Solde : <strong>{balance.toFixed(2)} €</strong></div>
        <button onClick={toggleRunning}>{running ? "Pause" : "Démarrer"}</button>
        <button onClick={hardReset}>Reset</button>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Montant (€)
          <input
            type="number" step="0.01" min="0"
            value={amount}
            onChange={e => setAmount(parseFloat(e.target.value || "0"))}
            style={{ width: 90, padding: 6 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          Durée (s)
          <input
            type="range" min="1" max="12" value={duration}
            onChange={e => setDuration(parseInt(e.target.value))}
          />
          <span>{duration}</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={soundOn} onChange={e => setSoundOn(e.target.checked)} />
          Son “coin”
        </label>

        <button onClick={() => maybeStartNext()}>Rattraper maintenant</button>
      </div>

      {/* Scène */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "13 / 8",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fffae5",
          marginTop: 12,
        }}
      >
        <img
          src="/piggy.png"
          alt="Piggy"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            imageRendering: "pixelated",
            userSelect: "none",
            pointerEvents: "none",
          }}
          draggable={false}
        />

        {/* Fente cible — ajuste si besoin */}
        <div
          ref={slotRef}
          style={{
            position: "absolute",
            bottom: 328,
            left: "52%",
            width: 44,
            height: 10,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            // outline: "1px dashed red",
          }}
        />

        {/* Une seule anim réelle, uniquement quand onglet visible et cible prête */}
        {running && document.visibilityState === "visible" && targetReady() && (
          <motion.img
            key={dropKey}
            src="/coin.png"
            alt="Coin"
            initial={{ x: targetXY.x, y: -coinSize - 30 }}
            animate={{ x: targetXY.x, y: targetXY.y }}
            transition={{ duration, ease: "easeIn" }}
            onAnimationComplete={onAnimComplete}
            style={{
              position: "absolute",
              width: coinSize,
              height: coinSize,
              imageRendering: "pixelated",
              userSelect: "none",
              pointerEvents: "none",
              willChange: "transform",
            }}
            draggable={false}
          />
        )}
      </div>

      <audio id="coin-audio" src="/coin.mp3" preload="auto" />
      <p style={{ fontSize: 12, color: "#667085", marginTop: 8 }}>
        Pause fige le temps (aucun backlog). Reset coupe tout et relance propre.  
        Le rattrapage crédite ce qui a été manqué sans double-compte, puis n’anime qu’une pièce.
      </p>
    </div>
  );
}
