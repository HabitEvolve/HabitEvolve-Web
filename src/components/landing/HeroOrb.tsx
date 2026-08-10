import { Component, Suspense, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Sparkles } from "@react-three/drei";
import type { Mesh } from "three";

// ── Reduced-motion gate ──────────────────────────────────────────────────────
// index.css disables sky-in/sky-lift under prefers-reduced-motion (PRODUCT.md
// §Accessibility); the 3D orb has no CSS hook, so it's checked directly here —
// autoRotate/Float both stop, leaving a still (but still rendered) gem.
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── The gem mesh ──────────────────────────────────────────────────────────────
// A soft icosahedron reads as a "sky gem" without needing a modeled asset.
// Material is tuned pastel-glossy (sky-deep body, sky-violet sheen at the
// grazing angle) rather than a photoreal PBR gem — stays inside the airy
// Sky-Pastel register instead of looking like a stock 3D-render prop.
const Gem = ({ reducedMotion }: { reducedMotion: boolean }) => {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (reducedMotion || !ref.current) return;
    ref.current.rotation.y += delta * 0.15;
  });

  return (
    <Float
      speed={reducedMotion ? 0 : 1.6}
      rotationIntensity={reducedMotion ? 0 : 0.6}
      floatIntensity={reducedMotion ? 0 : 1.1}
    >
      <mesh ref={ref} castShadow>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshPhysicalMaterial
          color="#5C8CC4"
          roughness={0.18}
          metalness={0.1}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
          transmission={0.08}
          iridescence={0.35}
          iridescenceIOR={1.3}
          sheen={0.5}
          sheenColor="#C0D8F1"
        />
      </mesh>
      {/* Faint halo sphere — reads as glow without a post-processing bloom pass. */}
      <mesh scale={1.5}>
        <sphereGeometry args={[1.35, 32, 32]} />
        <meshBasicMaterial color="#A9C7E8" transparent opacity={0.1} />
      </mesh>
    </Float>
  );
};

const Scene = () => {
  const reducedMotion = useMemo(prefersReducedMotion, []);
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} color="#EEF6FD" />
      <directionalLight position={[-3, -2, -2]} intensity={0.35} color="#7C6AC7" />
      <Gem reducedMotion={reducedMotion} />
      {!reducedMotion && (
        <Sparkles count={40} scale={4.5} size={2.5} speed={0.25} color="#F0AC72" opacity={0.5} />
      )}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!reducedMotion}
        autoRotateSpeed={1.4}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.6}
      />
    </>
  );
};

// ── Static fallback ───────────────────────────────────────────────────────────
// Same silhouette rendered in flat CSS — shown while the scene chunk loads
// and if WebGL throws (old browser / GPU disabled), so the hero never shows
// a blank hole where the 3D piece should be.
const OrbFallback = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="relative h-56 w-56 sm:h-72 sm:w-72">
      <div className="absolute inset-0 rounded-full bg-linear-to-br from-sky-deep-lo to-sky-violet opacity-90 blur-[2px] animate-pulse" />
      <div className="absolute inset-6 rounded-full bg-linear-to-tl from-sky-3/70 to-transparent" />
    </div>
  </div>
);

class OrbErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <OrbFallback /> : this.props.children;
  }
}

/** Floating, rotating "sky gem" — the Hero section's 3D hook (right-hand side). */
export default function HeroOrb() {
  return (
    <div className="h-72 w-full sm:h-96 lg:h-112" aria-hidden="true">
      <OrbErrorBoundary>
        <Suspense fallback={<OrbFallback />}>
          <Canvas
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 0, 5], fov: 42 }}
          >
            <Scene />
          </Canvas>
        </Suspense>
      </OrbErrorBoundary>
    </div>
  );
}
