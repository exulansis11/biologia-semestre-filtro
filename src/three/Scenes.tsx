import { useEffect, useMemo } from "react";
import { Html } from "@react-three/drei";
import { CatmullRomCurve3, Vector3, TubeGeometry } from "three";
import { sceneData, type SceneId, type Structure } from "./data";
export interface SceneProps {
  progresso: number;
  rotulos: boolean;
  quality?: "low" | "high";
  onSelect: (s: Structure) => void;
}
type V = [number, number, number];
interface PartProps {
  position?: V;
  scale?: V | number;
  color?: string;
  info: Structure;
  ctx: SceneProps;
  kind?: "sphere" | "box" | "torus";
  rotation?: V;
  opacity?: number;
}
function Part({
  position = [0, 0, 0],
  scale = 1,
  color = "#EE7FA3",
  info,
  ctx,
  kind = "sphere",
  rotation = [0, 0, 0],
  opacity = 1,
}: PartProps) {
  return (
    <group position={position} rotation={rotation}>
      <mesh
        scale={scale}
        onClick={(e) => {
          if (opacity === 1) e.stopPropagation();
          ctx.onSelect(info);
        }}
      >
        {kind === "sphere" ? (
          <sphereGeometry args={[1, ctx.quality === "high" ? 32 : 16, 12]} />
        ) : kind === "torus" ? (
          <torusGeometry args={[1, 0.13, 8, 24]} />
        ) : (
          <boxGeometry />
        )}
        <meshStandardMaterial
          color={color}
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={opacity === 1}
        />
      </mesh>
      {ctx.rotulos && (
        <Html position={[0, 0.5, 0]} center>
          <button className="label3d" onClick={() => ctx.onSelect(info)}>
            {info.name}
          </button>
        </Html>
      )}
    </group>
  );
}
function Tube({
  points,
  info,
  ctx,
  color = "#ADA0F2",
  radius = 0.06,
}: {
  points: V[];
  info: Structure;
  ctx: SceneProps;
  color?: string;
  radius?: number;
}) {
  const geometry = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
        64,
        radius,
        6,
        false,
      ),
    [JSON.stringify(points), radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation();
        ctx.onSelect(info);
      }}
    >
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
export function Celula(ctx: SceneProps) {
  const a = sceneData.celula.structures;
  return (
    <group>
      <Part info={a[0]} ctx={ctx} scale={[3.8, 2.4, 2.6]} opacity={0.13} />
      <Part
        info={a[1]}
        ctx={ctx}
        position={[-1, 0.3, 0]}
        scale={1.15}
        color="#8675bc"
        opacity={0.8}
      />
      <Part
        info={a[2]}
        ctx={ctx}
        position={[-1, 0.3, 0.75]}
        scale={0.35}
        color="#EE7FA3"
      />
      {Array.from({ length: 12 }, (_, i) => {
        const t = (i * Math.PI) / 6;
        return (
          <Part
            key={"p" + i}
            info={a[1]}
            ctx={{ ...ctx, rotulos: false }}
            kind="torus"
            position={[-1 + Math.cos(t) * 1.05, 0.3 + Math.sin(t) * 1.05, 0.4]}
            scale={0.12}
            color="#e2ebe9"
          />
        );
      })}
      {[0, 1, 2, 3].map((i) => (
        <group key={"re" + i}>
          <Part
            info={a[3]}
            ctx={i === 0 ? ctx : { ...ctx, rotulos: false }}
            position={[-1, -0.9 - i * 0.2, -0.4]}
            scale={[2.6, 0.12, 1.4]}
            kind="box"
            color="#ADA0F2"
          />
          {Array.from({ length: 10 }, (_, j) => (
            <Part
              key={j}
              info={a[3]}
              ctx={{ ...ctx, rotulos: false }}
              position={[-2 + j * 0.22, -0.8 - i * 0.2, 0.35]}
              scale={0.06}
              color="#e2ebe9"
            />
          ))}
        </group>
      ))}
      {[0, 1, 2].map((i) => (
        <Tube
          key={"smooth" + i}
          ctx={ctx}
          info={a[4]}
          points={[
            [0.2, -1, -1],
            [1, -0.8, -1.3],
            [1.6, -1, -0.7],
            [2, -1.2, -1.1],
          ]}
          color="#6FCF9C"
          radius={0.08 + i * 0.025}
        />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <Part
          key={"g" + i}
          ctx={i === 0 ? ctx : { ...ctx, rotulos: false }}
          info={a[5]}
          position={[1.8, 0.1 + i * 0.23, -0.9]}
          scale={[0.85 - i * 0.05, 0.12, 0.55]}
          color={i < 2 ? "#ADA0F2" : "#EE7FA3"}
        />
      ))}
      {[
        [2, -0.3, 1],
        [-2.4, 0.8, 1],
      ].map((p, i) => (
        <group key={"m" + i} position={p as V}>
          <Part
            ctx={ctx}
            info={a[6]}
            scale={[0.85, 0.38, 0.4]}
            color="#E5B95C"
          />
          {[0, 1, 2, 3, 4].map((j) => (
            <Tube
              key={j}
              ctx={{ ...ctx, rotulos: false }}
              info={a[6]}
              points={[
                [-0.55 + j * 0.25, -0.16, 0.28],
                [-0.45 + j * 0.25, 0.2, 0.28],
                [-0.35 + j * 0.25, -0.1, 0.28],
              ]}
              color="#80531c"
              radius={0.04}
            />
          ))}
        </group>
      ))}
      <Part
        ctx={ctx}
        info={a[7]}
        position={[0.5, 1.4, 1]}
        scale={0.28}
        color="#EE7FA3"
      />
      <Part
        ctx={ctx}
        info={a[8]}
        position={[1.3, -1.3, 1]}
        scale={0.25}
        color="#6FCF9C"
      />
      <Part
        ctx={ctx}
        info={a[9]}
        position={[0.5, 0.6, 1]}
        scale={[0.18, 0.18, 0.4]}
        kind="box"
        color="#79b8cf"
      />
      {Array.from({ length: 8 }, (_, i) => {
        const t = (i * Math.PI) / 4;
        return (
          <Tube
            key={"mt" + i}
            ctx={{ ...ctx, rotulos: false }}
            info={a[9]}
            points={[
              [0.5, 0.6, 1],
              [1 + Math.cos(t), 0.6 + Math.sin(t), 0.7],
              [Math.cos(t) * 3, 0.6 + Math.sin(t) * 1.5, 0.3],
            ]}
            color="#79b8cf"
            radius={0.035}
          />
        );
      })}
    </group>
  );
}
export function DNA(ctx: SceneProps) {
  const a = sceneData.dna.structures;
  const p = ctx.progresso;
  const stage = Math.min(4, Math.floor(p * 5));
  const helix = (offset: number): V[] =>
    Array.from({ length: 100 }, (_, i) => {
      const t = (i / 99) * 5 * Math.PI;
      return [
        Math.cos(t + offset) * 0.6,
        -2.5 + (i / 99) * 5,
        Math.sin(t + offset) * 0.6,
      ];
    });
  return (
    <group>
      {stage === 0 ? (
        <>
          <Tube ctx={ctx} info={a[0]} points={helix(0)} color="#EE7FA3" />
          <Tube ctx={ctx} info={a[0]} points={helix(Math.PI)} />
          {Array.from({ length: 24 }, (_, i) => {
            const t = (i / 23) * 5 * Math.PI;
            return (
              <Tube
                key={i}
                ctx={{ ...ctx, rotulos: false }}
                info={a[0]}
                points={[
                  [Math.cos(t) * 0.6, -2.5 + (i / 23) * 5, Math.sin(t) * 0.6],
                  [-Math.cos(t) * 0.6, -2.5 + (i / 23) * 5, -Math.sin(t) * 0.6],
                ]}
                color="#6FCF9C"
                radius={0.035}
              />
            );
          })}
        </>
      ) : stage === 1 ? (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <group key={i} position={[(i - 2.5) * 1.05, Math.sin(i) * 0.3, 0]}>
              {Array.from({ length: 8 }, (_, j) => (
                <Part
                  key={j}
                  info={a[1]}
                  ctx={{ ...ctx, rotulos: false }}
                  position={[
                    Math.cos((j * Math.PI) / 2) * 0.17,
                    Math.sin((j * Math.PI) / 2) * 0.17,
                    j < 4 ? -0.12 : 0.12,
                  ]}
                  scale={0.2}
                  color="#ADA0F2"
                />
              ))}
              <Tube
                ctx={ctx}
                info={a[1]}
                points={Array.from({ length: 32 }, (_, j) => {
                  const t = (j / 31) * Math.PI * 3.5;
                  return [
                    Math.cos(t) * 0.5,
                    Math.sin(t) * 0.5,
                    (j / 31) * 0.4 - 0.2,
                  ];
                })}
                color="#EE7FA3"
              />
            </group>
          ))}
        </>
      ) : stage === 2 ? (
        <Tube
          ctx={ctx}
          info={a[2]}
          radius={0.22}
          points={Array.from({ length: 140 }, (_, i) => {
            const t = (i / 139) * Math.PI * 12;
            return [
              Math.cos(t) * 0.8,
              -2.3 + (i / 139) * 4.6,
              Math.sin(t) * 0.8,
            ];
          })}
        />
      ) : stage === 3 ? (
        <>
          {Array.from({ length: 10 }, (_, i) => {
            const t = (i * Math.PI) / 5;
            return (
              <Tube
                key={i}
                ctx={ctx}
                info={a[3]}
                radius={0.1}
                points={[
                  [0, -2, 0],
                  [Math.cos(t) * 2, 0, Math.sin(t) * 2],
                  [Math.cos(t) * 1.5, 1.5, Math.sin(t) * 1.5],
                  [0, 2, 0],
                ]}
              />
            );
          })}
        </>
      ) : (
        <>
          {[-1, 1].map((side) => (
            <group key={side} rotation={[0, 0, side * 0.36]}>
              <Part
                ctx={ctx}
                info={a[4]}
                scale={[0.4, 2.4, 0.4]}
                position={[side * 0.3, 0, 0]}
                color="#ADA0F2"
              />
              {[-1, 1].map((t) => (
                <Part
                  key={t}
                  ctx={ctx}
                  info={a[6]}
                  position={[side * 0.3, t * 2.2, 0]}
                  scale={0.42}
                  color="#EE7FA3"
                />
              ))}
            </group>
          ))}
          <Part
            ctx={ctx}
            info={a[5]}
            scale={[0.6, 0.28, 0.5]}
            color="#E5B95C"
          />
        </>
      )}
    </group>
  );
}
export function Membrana(ctx: SceneProps) {
  const a = sceneData.membrana.structures;
  return (
    <group>
      {[-1, 1].map((side) =>
        Array.from({ length: ctx.quality === "high" ? 120 : 60 }, (_, i) => {
          const cols = ctx.quality === "high" ? 20 : 12;
          const x = ((i % cols) - cols / 2) * 0.38;
          const z = (Math.floor(i / cols) - 2) * 0.38;
          return (
            <group key={side + ":" + i}>
              <Part
                ctx={{ ...ctx, rotulos: false }}
                info={a[0]}
                position={[x, side * 0.5, z]}
                scale={0.15}
                color="#EE7FA3"
              />
              <Part
                ctx={{ ...ctx, rotulos: false }}
                info={a[0]}
                kind="box"
                position={[x - 0.045, side * 0.24, z]}
                scale={[0.045, 0.4, 0.045]}
                color="#ADA0F2"
              />
              <Part
                ctx={{ ...ctx, rotulos: false }}
                info={a[0]}
                kind="box"
                position={[x + 0.045, side * 0.24, z]}
                scale={[0.045, 0.4, 0.045]}
                color="#ADA0F2"
              />
            </group>
          );
        }),
      )}
      {[0, 1, 2, 3, 4].map((i) => (
        <Part
          key={"chol" + i}
          ctx={i === 0 ? ctx : { ...ctx, rotulos: false }}
          info={a[1]}
          kind="box"
          position={[-1.8 + i * 0.7, 0.08, 0.5]}
          scale={[0.13, 0.5, 0.16]}
          color="#E5B95C"
        />
      ))}
      <Part
        ctx={ctx}
        info={a[2]}
        kind="torus"
        rotation={[Math.PI / 2, 0, 0]}
        position={[-1.4, 0, 0]}
        scale={[0.35, 0.35, 2]}
        color="#79b8cf"
      />
      <Part
        ctx={ctx}
        info={a[3]}
        position={[-0.45, 0, 0]}
        scale={[0.3, 0.8, 0.4]}
        color="#6FCF9C"
      />
      {[0, 1, 2].map((i) => (
        <Part
          key={"na" + i}
          ctx={{ ...ctx, rotulos: false }}
          info={a[3]}
          position={[-0.6 + i * 0.15, -1.5 + ctx.progresso * 3, 0.4]}
          scale={0.08}
          color="#E5B95C"
        />
      ))}
      {[0, 1].map((i) => (
        <Part
          key={"k" + i}
          ctx={{ ...ctx, rotulos: false }}
          info={a[3]}
          position={[-0.5 + i * 0.18, 1.5 - ctx.progresso * 3, -0.4]}
          scale={0.09}
          color="#ADA0F2"
        />
      ))}
      <Part
        ctx={ctx}
        info={a[4]}
        position={[0.5, 0, 0]}
        scale={[0.3, 0.85, 0.4]}
        color="#ADA0F2"
      />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Part
          key={"gp" + i}
          ctx={i === 0 ? ctx : { ...ctx, rotulos: false }}
          info={a[5]}
          position={[1.5 + Math.cos(i) * 0.2, 0, Math.sin(i) * 0.2]}
          scale={[0.09, 0.75, 0.09]}
          color="#EE7FA3"
        />
      ))}
      {[0, 1, 2].map((i) => (
        <Part
          key={"proteinG" + i}
          ctx={{ ...ctx, rotulos: false }}
          info={a[5]}
          position={[1.2 + i * 0.22, -1, 0.2]}
          scale={0.18}
          color="#6FCF9C"
        />
      ))}
      {[0, 1, 2].map((i) => (
        <Tube
          key={"glyco" + i}
          ctx={ctx}
          info={a[6]}
          points={[
            [-1 + i, 0.6, 0.7],
            [-1 + i, 1, 0.7],
            [-1.3 + i, 1.3, 0.7],
            [-1.5 + i, 1.5, 0.7],
          ]}
          color="#e2ebe9"
        />
      ))}
    </group>
  );
}
export const scenes: Record<SceneId, (p: SceneProps) => JSX.Element> = {
  celula: Celula,
  dna: DNA,
  membrana: Membrana,
};
