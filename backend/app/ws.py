from collections import defaultdict
from typing import Any
from fastapi import WebSocket


class WSManager:
    def __init__(self) -> None:
        self.rooms: dict[int, set[WebSocket]] = defaultdict(set)

    async def connect(self, oturum_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self.rooms[oturum_id].add(ws)

    def disconnect(self, oturum_id: int, ws: WebSocket) -> None:
        self.rooms[oturum_id].discard(ws)
        if not self.rooms[oturum_id]:
            self.rooms.pop(oturum_id, None)

    async def broadcast(self, oturum_id: int, payload: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for ws in list(self.rooms.get(oturum_id, ())):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(oturum_id, ws)


manager = WSManager()
