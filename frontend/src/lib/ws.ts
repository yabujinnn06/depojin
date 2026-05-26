import { tokens } from "./api";

export type PresenceUser = {
  kullanici_id: number;
  ad: string;
  rol: string;
  join_zaman: string;
  son_aktivite: string;
  son_seri: string | null;
  son_durum: string | null;
  baglanti_sayisi: number;
};

export type WSMesaj =
  | { tip: "tarama"; kullanici: string; kullanici_id: number; zaman: string; sonuc: any }
  | { tip: "presence"; kullanicilar: PresenceUser[] };

type Handler = (m: WSMesaj) => void;
type DurumDinleyici = (a: boolean) => void;

export class SayimWS {
  private ws: WebSocket | null = null;
  private kapatildi = false;
  private gecikme = 1000;
  private maxGecikme = 15000;
  private onAcildiKapandi?: DurumDinleyici;

  constructor(private oturumId: number, private onMesaj: Handler) {
    this.bag();
  }

  durum(fn: DurumDinleyici) { this.onAcildiKapandi = fn; }

  private bag() {
    if (this.kapatildi) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const t = tokens().access ?? "";
    const url = `${proto}://${host}/api/ws/sayim/${this.oturumId}?token=${encodeURIComponent(t)}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.gecikme = 1000;
      this.onAcildiKapandi?.(true);
    };
    ws.onmessage = (e) => {
      try { this.onMesaj(JSON.parse(e.data)); } catch { /* ignore */ }
    };
    ws.onclose = () => {
      this.onAcildiKapandi?.(false);
      if (this.kapatildi) return;
      setTimeout(() => {
        this.gecikme = Math.min(this.gecikme * 2, this.maxGecikme);
        this.bag();
      }, this.gecikme);
    };
    ws.onerror = () => {
      try { ws.close(); } catch { /* noop */ }
    };
  }

  close() {
    this.kapatildi = true;
    try { this.ws?.close(); } catch { /* noop */ }
  }
}

export function connectSayimWS(oturumId: number, onMesaj: Handler): SayimWS {
  return new SayimWS(oturumId, onMesaj);
}
