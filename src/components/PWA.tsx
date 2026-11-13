import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function InstallButton() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  if (
    installed ||
    (typeof window !== "undefined" &&
      window.matchMedia("(display-mode: standalone)").matches)
  )
    return <span className="pill">App instalado</span>;
  return event ? (
    <button
      className="primary"
      onClick={async () => {
        await event.prompt();
        await event.userChoice;
        setEvent(null);
      }}
    >
      ↓ Instalar app
    </button>
  ) : (
    <details className="install-help">
      <summary>Instalar app</summary>
      <p>
        No menu do navegador, escolha “Instalar aplicativo” ou “Adicionar à tela
        de início”. A opção depende do navegador.
      </p>
    </details>
  );
}
export default function PWA() {
  const {
    offlineReady: [ready, setReady],
    needRefresh: [refresh, setRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    if (!ready || refresh) return;
    const t = setTimeout(() => setReady(false), 5000);
    return () => clearTimeout(t);
  }, [ready, refresh, setReady]);
  return ready || refresh ? (
    <aside className="pwa-toast" role="status">
      <p>{refresh ? "Nova versão disponível." : "Pronto para uso offline."}</p>
      {refresh && (
        <button onClick={() => updateServiceWorker(true)}>
          Atualizar agora
        </button>
      )}
      <button
        aria-label="Fechar aviso"
        onClick={() => {
          setReady(false);
          setRefresh(false);
        }}
      >
        Fechar
      </button>
    </aside>
  ) : null;
}
