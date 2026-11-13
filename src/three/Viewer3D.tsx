import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Link } from "react-router-dom";
import { sceneData, type SceneId, type Structure } from "./data";
const Scene = lazy(() =>
  import("./Scenes").then((m) => ({
    default: ({
      id,
      ...p
    }: import("./Scenes").SceneProps & { id: SceneId }) => {
      const C = m.scenes[id];
      return <C {...p} />;
    },
  })),
);
function webGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="status">
        Não foi possível abrir o 3D. As explicações e os links continuam
        disponíveis abaixo.
      </p>
    ) : (
      this.props.children
    );
  }
}
export default function Viewer3D({ id }: { id: SceneId }) {
  const [supported] = useState(webGL),
    [p, setP] = useState(0),
    [play, setPlay] = useState(false),
    [labels, setLabels] = useState(false),
    [info, setInfo] = useState<Structure | null>(null),
    [quality, setQuality] = useState<"low" | "high">("low");
  const data = sceneData[id];
  useEffect(() => {
    setP(0);
    setInfo(null);
    setPlay(false);
  }, [id]);
  useEffect(() => {
    if (!play || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let raf: number,
      last = performance.now();
    const tick = (t: number) => {
      setP((v) => (v + (t - last) / 14000) % 1);
      last = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play]);
  return (
    <section className="stack">
      <p className="eyebrow">Laboratório tridimensional · modelo esquemático</p>
      <h1>{data.name}</h1>
      <p className="muted">
        Arraste para girar, aproxime com dois dedos e toque em uma estrutura
        para explorar.
      </p>
      <Boundary>
        {supported ? (
          <div className="canvas" aria-label={"Modelo 3D de " + data.name}>
            <Canvas
              dpr={quality === "low" ? 1 : [1, 2]}
              frameloop="demand"
              camera={{ position: [5, 3, 7], fov: 45 }}
              gl={{ antialias: quality === "high" }}
            >
              <ambientLight intensity={1.6} />
              <directionalLight position={[5, 5, 5]} intensity={2} />
              <Suspense fallback={null}>
                <Scene
                  id={id}
                  progresso={p}
                  rotulos={labels}
                  quality={quality}
                  onSelect={setInfo}
                />
              </Suspense>
              <OrbitControls
                enablePan={false}
                minDistance={3}
                maxDistance={14}
              />
            </Canvas>
          </div>
        ) : (
          <div className="card" role="status">
            <h2>Modelo 3D indisponível</h2>
            <p>
              Este navegador não oferece WebGL. Explore as estruturas e o
              conteúdo textual abaixo.
            </p>
          </div>
        )}
      </Boundary>
      <div className="card row">
        <button
          className="btn"
          onClick={() => setPlay(!play)}
          aria-pressed={play}
        >
          {play ? "Pausar" : "Animar"}
        </button>
        <label className="range">
          {id === "dna" ? "Nível de compactação" : "Progresso"} ·{" "}
          {Math.round(p * 100)}%
          <input
            aria-label={
              id === "dna" ? "Nível de compactação" : "Progresso da animação"
            }
            type="range"
            min="0"
            max="1"
            step=".005"
            value={p}
            onChange={(e) => {
              setPlay(false);
              setP(+e.target.value);
            }}
          />
        </label>
        <button
          className="btn"
          aria-pressed={labels}
          onClick={() => setLabels(!labels)}
        >
          Rótulos {labels ? "ligados" : "desligados"}
        </button>
        <label>
          Qualidade{" "}
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as "low" | "high")}
          >
            <option value="low">Baixa</option>
            <option value="high">Alta</option>
          </select>
        </label>
      </div>
      {id === "dna" && (
        <p className="ask">
          {
            [
              "Dupla hélice",
              "Nucleossomos: octâmero de histonas + DNA",
              "Fibra de cromatina",
              "Alças de cromatina",
              "Cromossomo metafásico",
            ][Math.min(4, Math.floor(p * 5))]
          }
        </p>
      )}
      <div className="card stack" aria-live="polite">
        {info ? (
          <>
            <h2>{info.name}</h2>
            <p>{info.description}</p>
            <Link to={"/conteudo/" + info.section}>
              Ler a seção de conteúdo
            </Link>
          </>
        ) : (
          <p>Toque em uma estrutura ou escolha seu nome abaixo.</p>
        )}
      </div>
      <div className="row">
        {data.structures.map((s) => (
          <button className="chip" key={s.name} onClick={() => setInfo(s)}>
            {s.name}
          </button>
        ))}
      </div>
      <p className="muted">
        Representação didática, sem escala. As explicações são extraídas do
        conteúdo fornecido.
      </p>
    </section>
  );
}
