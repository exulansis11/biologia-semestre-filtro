import { lazy, Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { sceneData, type SceneId } from "./data";
const Viewer3D = lazy(() => import("./Viewer3D"));
export function ScenePage() {
  const { id } = useParams();
  return <SceneContent id={id} />;
}
export function SceneContent({ id }: { id?: string }) {
  return id && id in sceneData ? (
    <Suspense fallback={<p>Carregando modelo 3D…</p>}>
      <Viewer3D id={id as SceneId} />
    </Suspense>
  ) : (
    <section className="stack">
      <p className="eyebrow">Explorar · girar · descobrir</p>
      <h1>
        Biologia em <span className="accent">três dimensões.</span>
      </h1>
      <div className="grid">
        {Object.entries(sceneData).map(([key, s]) => (
          <Link className="card scene-card" to={"/3d/" + key} key={key}>
            <svg viewBox="0 0 200 100" aria-hidden="true">
              <ellipse
                cx="100"
                cy="50"
                rx="65"
                ry="36"
                fill="none"
                stroke="currentColor"
              />
              <ellipse
                cx="100"
                cy="50"
                rx="26"
                ry="36"
                fill="none"
                stroke="currentColor"
              />
              <path d="M35 50h130M48 28h104M48 72h104" stroke="currentColor" />
            </svg>
            <h2>{s.name}</h2>
            <p>Explorar estruturas e relacionar ao conteúdo →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
