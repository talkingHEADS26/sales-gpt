import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const BLUE = "#0e51a0";
const BLUE_DARK = "#123d74";
const CYAN = "#44c4ff";
const INK = "#223044";
const MUTED = "#68758a";
const CARD = "rgba(255,255,255,0.88)";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const sceneStyle: React.CSSProperties = {
  background:
    "radial-gradient(circle at 18% 8%, rgba(68,196,255,0.28), transparent 26%), radial-gradient(circle at 80% 12%, rgba(14,81,160,0.18), transparent 32%), linear-gradient(180deg, #f7fbff 0%, #eef4fb 64%, #e8f0f8 100%)",
  color: INK,
  fontFamily:
    '"Plus Jakarta Sans", "Avenir Next", "Montserrat", "Trebuchet MS", sans-serif',
  overflow: "hidden",
};

const MarketingBackground = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const drift = interpolate(frame, [0, 30 * fps], [0, 1], clamp);

  return (
    <AbsoluteFill style={sceneStyle}>
      <div
        style={{
          position: "absolute",
          inset: -160,
          backgroundImage:
            "linear-gradient(rgba(14,81,160,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(14,81,160,0.055) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          transform: `translateY(${-50 * drift}px) rotate(-2deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          left: -260,
          top: -120,
          borderRadius: "50%",
          background: "rgba(68,196,255,0.22)",
          filter: "blur(38px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 820,
          height: 820,
          right: -310,
          bottom: -160,
          borderRadius: "50%",
          background: "rgba(14,81,160,0.16)",
          filter: "blur(44px)",
        }}
      />
    </AbsoluteFill>
  );
};

const LogoMark = ({size = 104}: {size?: number}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.24,
      background: "linear-gradient(180deg,#ffffff 0%,#e7f0fa 100%)",
      boxShadow: "0 26px 60px rgba(14,81,160,0.20)",
      display: "grid",
      placeItems: "center",
      border: "1px solid rgba(14,81,160,0.12)",
    }}
  >
    <svg width={size * 0.78} height={size * 0.78} viewBox="0 0 512 512">
      <path d="M92 389L198 123L302 389H249L198 265L146 389H92Z" fill={BLUE_DARK} />
      <path d="M139 347C198 283 262 256 332 266C367 271 396 285 421 307" stroke={CYAN} strokeWidth="28" strokeLinecap="round" />
      <path d="M344 126C286.562 126 240 172.562 240 230V284C240 341.438 286.562 388 344 388C401.438 388 448 341.438 448 284V230C448 172.562 401.438 126 344 126ZM344 173C375.48 173 401 198.52 401 230V284C401 315.48 375.48 341 344 341C312.52 341 287 315.48 287 284V230C287 198.52 312.52 173 344 173Z" fill="#2B65B1" />
      <circle cx="344" cy="223" r="24" fill={BLUE_DARK} />
      <path d="M319 275C319 266.716 325.716 260 334 260H354C362.284 260 369 266.716 369 275V350H319V275Z" fill={CYAN} />
    </svg>
  </div>
);

const FadeUp = ({
  children,
  delay = 0,
  distance = 46,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = interpolate(frame, [delay * fps, (delay + 0.65) * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * distance}px)`,
      }}
    >
      {children}
    </div>
  );
};

const Shell = ({children}: {children: React.ReactNode}) => (
  <AbsoluteFill style={{padding: 78}}>
    <div style={{position: "absolute", top: 58, left: 78, display: "flex", gap: 22, alignItems: "center"}}>
      <LogoMark size={72} />
      <div style={{fontSize: 25, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", color: MUTED}}>
        Abschluss<span style={{color: BLUE}}>IO</span>
      </div>
    </div>
    {children}
  </AbsoluteFill>
);

const Pill = ({children, tone = "blue"}: {children: React.ReactNode; tone?: "blue" | "white"}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "16px 24px",
      background: tone === "blue" ? "rgba(14,81,160,0.10)" : CARD,
      color: BLUE,
      fontSize: 24,
      fontWeight: 850,
      letterSpacing: 3.2,
      textTransform: "uppercase",
      border: "1px solid rgba(14,81,160,0.14)",
      boxShadow: "0 18px 42px rgba(14,81,160,0.10)",
    }}
  >
    {children}
  </div>
);

const ScoreCard = ({label, score, text, delay}: {label: string; score: number; text: string; delay: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const fill = interpolate(frame, [delay * fps, (delay + 0.8) * fps], [0, score], clamp);

  return (
    <FadeUp delay={delay} distance={28}>
      <div
        style={{
          background: CARD,
          border: "1px solid rgba(255,255,255,0.9)",
          borderRadius: 32,
          padding: 28,
          boxShadow: "0 24px 56px rgba(15,23,42,0.10)",
          display: "grid",
          gridTemplateColumns: "1fr 112px",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div>
          <div style={{fontSize: 28, fontWeight: 900, color: INK}}>{label}</div>
          <div style={{fontSize: 20, color: MUTED, marginTop: 8, lineHeight: 1.35}}>{text}</div>
          <div style={{height: 10, background: "#d7e5f5", borderRadius: 99, marginTop: 20, overflow: "hidden"}}>
            <div style={{width: `${fill}%`, height: "100%", background: `linear-gradient(90deg, ${BLUE}, ${CYAN})`, borderRadius: 99}} />
          </div>
        </div>
        <div
          style={{
            width: 112,
            height: 112,
            borderRadius: 28,
            display: "grid",
            placeItems: "center",
            background: "rgba(14,81,160,0.09)",
            color: BLUE,
            fontSize: 36,
            fontWeight: 950,
          }}
        >
          {Math.round(fill)}
        </div>
      </div>
    </FadeUp>
  );
};

const IntroScene = () => (
  <Shell>
    <div style={{marginTop: 350}}>
      <FadeUp>
        <Pill>Launch fuer Fitnessstudios</Pill>
      </FadeUp>
      <FadeUp delay={0.2}>
        <h1 style={{fontSize: 104, lineHeight: 0.92, letterSpacing: -7, margin: "48px 0 0", maxWidth: 880, fontWeight: 950}}>
          Mehr Mitgliedschaften aus jedem Beratungsgespraech.
        </h1>
      </FadeUp>
      <FadeUp delay={0.65}>
        <p style={{fontSize: 39, lineHeight: 1.2, color: MUTED, maxWidth: 810, marginTop: 42, fontWeight: 650}}>
          AbschlussIO trainiert dein Team realistisch, messbar und direkt auf den Abschluss.
        </p>
      </FadeUp>
    </div>
  </Shell>
);

const ProblemScene = () => (
  <Shell>
    <div style={{marginTop: 320}}>
      <FadeUp>
        <Pill tone="white">Das Problem im Studioalltag</Pill>
      </FadeUp>
      <FadeUp delay={0.25}>
        <h2 style={{fontSize: 82, lineHeight: 0.98, letterSpacing: -5, marginTop: 44, maxWidth: 870, fontWeight: 950}}>
          Probetraining gebucht. Interesse da. Abschluss offen.
        </h2>
      </FadeUp>
      <div style={{display: "grid", gap: 24, marginTop: 58}}>
        {["Unsichere Bedarfsanalyse", "Einwaende bleiben liegen", "Kein einheitlicher Sales-Standard"].map((item, index) => (
          <FadeUp key={item} delay={0.55 + index * 0.18} distance={24}>
            <div style={{fontSize: 33, fontWeight: 850, color: INK, background: CARD, borderRadius: 30, padding: "27px 32px", boxShadow: "0 18px 46px rgba(15,23,42,0.08)"}}>
              <span style={{color: BLUE, marginRight: 18}}>0{index + 1}</span>
              {item}
            </div>
          </FadeUp>
        ))}
      </div>
    </div>
  </Shell>
);

const ChatBubble = ({side, text, delay}: {side: "left" | "right"; text: string; delay: number}) => (
  <FadeUp delay={delay} distance={24}>
    <div
      style={{
        maxWidth: 710,
        marginLeft: side === "right" ? "auto" : 0,
        marginTop: 24,
        padding: "26px 30px",
        borderRadius: side === "right" ? "32px 32px 8px 32px" : "32px 32px 32px 8px",
        background: side === "right" ? BLUE : "#f2f7fd",
        color: side === "right" ? "white" : INK,
        fontSize: 31,
        lineHeight: 1.22,
        fontWeight: 750,
        boxShadow: "0 18px 42px rgba(15,23,42,0.10)",
      }}
    >
      {text}
    </div>
  </FadeUp>
);

const SimulationScene = () => (
  <Shell>
    <div style={{marginTop: 250}}>
      <FadeUp>
        <Pill>Trainieren wie im echten Beratungsgespraech</Pill>
      </FadeUp>
      <FadeUp delay={0.22}>
        <div style={{marginTop: 54, padding: 42, borderRadius: 42, background: CARD, boxShadow: "0 32px 86px rgba(15,23,42,0.13)", border: "1px solid rgba(255,255,255,0.9)"}}>
          <div style={{display: "flex", gap: 18, marginBottom: 34}}>
            <div style={{width: 16, height: 16, borderRadius: 99, background: "#ff6b6b"}} />
            <div style={{width: 16, height: 16, borderRadius: 99, background: "#ffd166"}} />
            <div style={{width: 16, height: 16, borderRadius: 99, background: "#51cf66"}} />
          </div>
          <ChatBubble side="left" text="Ich will fitter werden, aber der Preis ist schon hoch." delay={0.45} />
          <ChatBubble side="right" text="Was waere es dir wert, wenn du in 90 Tagen wirklich dranbleibst?" delay={1.05} />
          <ChatBubble side="left" text="Wenn ich den Fortschritt sehe, wuerde ich starten." delay={1.65} />
        </div>
      </FadeUp>
      <FadeUp delay={2.3}>
        <p style={{fontSize: 38, lineHeight: 1.18, color: MUTED, fontWeight: 750, marginTop: 44, maxWidth: 860}}>
          AbschlussIO simuliert echte Gespraechsdynamik statt trockener Theorie.
        </p>
      </FadeUp>
    </div>
  </Shell>
);

const FeedbackScene = () => (
  <Shell>
    <div style={{marginTop: 260}}>
      <FadeUp>
        <Pill>Direktes Feedback nach jeder Session</Pill>
      </FadeUp>
      <div style={{display: "grid", gap: 24, marginTop: 58}}>
        <ScoreCard label="Bedarfsanalyse" score={91} text="Fragen sitzen. Motivation wird klar." delay={0.35} />
        <ScoreCard label="Einwandbehandlung" score={84} text="Nutzen staerker gegen Preisargumente fuehren." delay={0.7} />
        <ScoreCard label="Closing" score={88} text="Naechster Schritt wird konkret vereinbart." delay={1.05} />
      </div>
    </div>
  </Shell>
);

const RoiScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const revenue = interpolate(frame, [0.8 * fps, 2.1 * fps], [0, 24300], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <Shell>
      <div style={{marginTop: 300}}>
        <FadeUp>
          <Pill>Der Hebel fuer Fitnessstudios</Pill>
        </FadeUp>
        <FadeUp delay={0.28}>
          <h2 style={{fontSize: 78, lineHeight: 0.98, letterSpacing: -5, marginTop: 48, fontWeight: 950}}>
            Kleine Verbesserung.
            <br />
            Grosser Jahres-Effekt.
          </h2>
        </FadeUp>
        <FadeUp delay={0.72}>
          <div style={{marginTop: 58, borderRadius: 44, padding: 44, background: BLUE, color: "white", boxShadow: "0 34px 90px rgba(14,81,160,0.34)"}}>
            <div style={{fontSize: 24, textTransform: "uppercase", letterSpacing: 3, color: "rgba(255,255,255,0.68)", fontWeight: 900}}>
              Beispiel aus dem ROI-Rechner
            </div>
            <div style={{fontSize: 88, lineHeight: 1, letterSpacing: -5, fontWeight: 950, marginTop: 22}}>
              {Math.round(revenue).toLocaleString("de-DE")} EUR
            </div>
            <div style={{fontSize: 31, lineHeight: 1.22, marginTop: 20, color: "rgba(255,255,255,0.84)", fontWeight: 700}}>
              plausibler Mehrumsatz in 12 Monaten bei trainiertem Team.
            </div>
          </div>
        </FadeUp>
      </div>
    </Shell>
  );
};

const BenefitsScene = () => (
  <Shell>
    <div style={{marginTop: 300}}>
      <FadeUp>
        <Pill>Was dein Team bekommt</Pill>
      </FadeUp>
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 58}}>
        {[
          ["Praxisnahe Szenarien", "Probetraining, Beratung, Preis-Einwaende"],
          ["Sofort-Feedback", "Wirkung, Klarheit und Abschlussimpuls"],
          ["Messbarer Fortschritt", "Teamstandard statt Bauchgefuehl"],
          ["Skalierbare Lizenzen", "Solo, 3er, 5er und Enterprise"],
        ].map(([title, text], index) => (
          <FadeUp key={title} delay={0.24 + index * 0.18} distance={28}>
            <div style={{minHeight: 232, borderRadius: 36, padding: 32, background: CARD, boxShadow: "0 24px 58px rgba(15,23,42,0.10)", border: "1px solid rgba(255,255,255,0.9)"}}>
              <div style={{height: 12, width: 82, borderRadius: 99, background: index % 2 === 0 ? BLUE : CYAN, marginBottom: 28}} />
              <div style={{fontSize: 34, lineHeight: 1.05, fontWeight: 950}}>{title}</div>
              <div style={{fontSize: 23, lineHeight: 1.32, color: MUTED, marginTop: 18, fontWeight: 650}}>{text}</div>
            </div>
          </FadeUp>
        ))}
      </div>
    </div>
  </Shell>
);

const OutroScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame, fps, config: {damping: 16, stiffness: 92, mass: 0.8}});

  return (
    <Shell>
      <div style={{display: "grid", placeItems: "center", height: "100%", textAlign: "center"}}>
        <div>
          <div style={{transform: `scale(${0.82 + pop * 0.18})`, display: "grid", placeItems: "center"}}>
            <LogoMark size={160} />
          </div>
          <FadeUp delay={0.3}>
            <h2 style={{fontSize: 92, lineHeight: 0.95, letterSpacing: -6, margin: "54px 0 0", fontWeight: 950}}>
              AbschlussIO
              <br />
              fuer dein Fitnessstudio.
            </h2>
          </FadeUp>
          <FadeUp delay={0.75}>
            <p style={{fontSize: 38, color: MUTED, lineHeight: 1.18, marginTop: 38, fontWeight: 750}}>
              Trainieren. Feedback bekommen.
              <br />
              Mehr Abschluesse erzielen.
            </p>
          </FadeUp>
          <FadeUp delay={1.25}>
            <div style={{display: "inline-flex", marginTop: 58, borderRadius: 999, background: BLUE, color: "white", padding: "26px 44px", fontSize: 30, fontWeight: 950, boxShadow: "0 24px 60px rgba(14,81,160,0.30)"}}>
              Demo buchen auf abschluss-io.de
            </div>
          </FadeUp>
        </div>
      </div>
    </Shell>
  );
};

export const AbschlussIOFitnessLaunch = () => {
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill>
      <MarketingBackground />
      <Sequence from={0} durationInFrames={4 * fps} premountFor={fps}>
        <IntroScene />
      </Sequence>
      <Sequence from={4 * fps} durationInFrames={4 * fps} premountFor={fps}>
        <ProblemScene />
      </Sequence>
      <Sequence from={8 * fps} durationInFrames={5 * fps} premountFor={fps}>
        <SimulationScene />
      </Sequence>
      <Sequence from={13 * fps} durationInFrames={5 * fps} premountFor={fps}>
        <FeedbackScene />
      </Sequence>
      <Sequence from={18 * fps} durationInFrames={4 * fps} premountFor={fps}>
        <RoiScene />
      </Sequence>
      <Sequence from={22 * fps} durationInFrames={4 * fps} premountFor={fps}>
        <BenefitsScene />
      </Sequence>
      <Sequence from={26 * fps} durationInFrames={4 * fps} premountFor={fps}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
