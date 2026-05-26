from asyncio import Lock
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from fastapi import WebSocket


@dataclass
class Conn:
    ws: WebSocket
    user_id: int
    ad: str
    rol: str
    join_zaman: datetime = field(default_factory=datetime.utcnow)
    son_aktivite: datetime = field(default_factory=datetime.utcnow)
    son_seri: str | None = None
    son_durum: str | None = None


class WSManager:
    def __init__(self) -> None:
        self.rooms: dict[int, list[Conn]] = defaultdict(list)
        self.lock = Lock()

    async def connect(self, oturum_id: int, ws: WebSocket, user_id: int, ad: str, rol: str) -> Conn:
        await ws.accept()
        conn = Conn(ws=ws, user_id=user_id, ad=ad, rol=rol)
        async with self.lock:
            self.rooms[oturum_id].append(conn)
        await self.broadcast_presence(oturum_id)
        return conn

    async def disconnect(self, oturum_id: int, ws: WebSocket) -> None:
        async with self.lock:
            self.rooms[oturum_id] = [c for c in self.rooms.get(oturum_id, []) if c.ws is not ws]
            if not self.rooms[oturum_id]:
                self.rooms.pop(oturum_id, None)
        await self.broadcast_presence(oturum_id)

    async def broadcast(self, oturum_id: int, payload: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for c in list(self.rooms.get(oturum_id, ())):
            try:
                await c.ws.send_json(payload)
            except Exception:
                dead.append(c.ws)
        for ws in dead:
            await self.disconnect(oturum_id, ws)

    async def broadcast_presence(self, oturum_id: int) -> None:
        await self.broadcast(oturum_id, {
            "tip": "presence",
            "kullanicilar": self.presence(oturum_id),
        })

    def presence(self, oturum_id: int) -> list[dict[str, Any]]:
        by_user: dict[int, Conn] = {}
        baglanti_say: dict[int, int] = defaultdict(int)
        for c in self.rooms.get(oturum_id, ()):
            baglanti_say[c.user_id] += 1
            ex = by_user.get(c.user_id)
            if not ex or c.son_aktivite > ex.son_aktivite:
                by_user[c.user_id] = c
        out = []
        for u_id, c in by_user.items():
            out.append({
                "kullanici_id": u_id, "ad": c.ad, "rol": c.rol,
                "join_zaman": c.join_zaman.isoformat(),
                "son_aktivite": c.son_aktivite.isoformat(),
                "son_seri": c.son_seri, "son_durum": c.son_durum,
                "baglanti_sayisi": baglanti_say[u_id],
            })
        out.sort(key=lambda x: x["son_aktivite"], reverse=True)
        return out

    def update_aktivite(self, oturum_id: int, user_id: int,
                        seri: str | None = None, durum: str | None = None) -> None:
        now = datetime.utcnow()
        for c in self.rooms.get(oturum_id, ()):
            if c.user_id == user_id:
                c.son_aktivite = now
                if seri: c.son_seri = seri
                if durum: c.son_durum = durum


manager = WSManager()
