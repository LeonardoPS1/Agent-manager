"""Aicore Office — Python client.

Usage::

    from office_client import OfficeClient

    office = OfficeClient(url="http://localhost:3000", agent_id="atlas", token="...")
    office.state("typing")
    office.usage(model="mistral", tokens_in=120, tokens_out=340, cost=0.001)
    office.message(to="nova", content="Passo el dataset.")
"""

from __future__ import annotations

import json
import threading
import time
import urllib.request
from typing import Any, Callable, Dict, Optional

try:  # optional WebSocket support
    from websocket import WebSocketApp  # type: ignore
except Exception:  # pragma: no cover - websocket-client not installed
    WebSocketApp = None  # type: ignore

__all__ = ["OfficeClient"]

AgentState = str  # one of: thinking|typing|reading|sorting|printing|saving|meeting|calling|error|done|idle


class OfficeClient:
    def __init__(
        self,
        url: str,
        agent_id: str,
        token: Optional[str] = None,
        heartbeat_ms: int = 0,
    ) -> None:
        self.url = url.rstrip("/")
        self.agent_id = agent_id
        self.token = token
        self._hb_stop = threading.Event()
        self._hb_thread: Optional[threading.Thread] = None
        self._last_event_id = 0
        if heartbeat_ms and heartbeat_ms > 0:
            self.start_heartbeat(heartbeat_ms)

    # ------------------------------------------------------------------ emit
    def emit(self, event_type: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        body = {
            "agent_id": self.agent_id,
            "type": event_type,
            "payload": payload or {},
            "source": "sdk-python",
        }
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            f"{self.url}/v1/events", data=data, method="POST"
        )
        req.add_header("Content-Type", "application/json")
        if self.token:
            req.add_header("Authorization", f"Bearer {self.token}")
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def state(self, state: AgentState) -> Dict[str, Any]:
        return self.emit("state", {"state": state})

    def usage(
        self,
        model: str,
        tokens_in: int,
        tokens_out: int,
        cost: Optional[float] = None,
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "model": model,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
        }
        if cost is not None:
            payload["cost"] = cost
        if request_id is not None:
            payload["request_id"] = request_id
        return self.emit("usage", payload)

    def tool(self, name: str, args_summary: str, ok: bool = True) -> Dict[str, Any]:
        return self.emit("tool_call", {"name": name, "args_summary": args_summary, "ok": ok})

    def message(self, to: str, content: str, obj: str = "note") -> Dict[str, Any]:
        return self.emit("message", {"from": self.agent_id, "to": to, "content": content, "object": obj})

    def heartbeat(self) -> Dict[str, Any]:
        return self.emit("heartbeat", {"ts": int(time.time() * 1000)})

    # -------------------------------------------------------------- heartbeat
    def start_heartbeat(self, ms: int) -> None:
        self._hb_stop.clear()

        def _loop() -> None:
            while not self._hb_stop.wait(ms / 1000.0):
                try:
                    self.heartbeat()
                except Exception:
                    pass

        self._hb_thread = threading.Thread(target=_loop, daemon=True)
        self._hb_thread.start()

    def stop_heartbeat(self) -> None:
        self._hb_stop.set()

    # --------------------------------------------------------------- commands
    def on_command(self, handler: Callable[[Dict[str, Any]], None]) -> None:
        """Subscribe to live events/commands via WebSocket (requires websocket-client)."""
        if WebSocketApp is None:
            raise RuntimeError("Install websocket-client to use onCommand(): pip install websocket-client")

        params = f"agent_id={self.agent_id}"
        if self.token:
            params += f"&token={self.token}"
        ws_url = f"{self.url.replace('http', 'ws')}/v1/stream?{params}"

        def _on_message(_ws: Any, message: str) -> None:
            try:
                data = json.loads(message)
                if isinstance(data.get("id"), int):
                    self._last_event_id = data["id"]
                handler(data)
            except Exception:
                pass

        app = WebSocketApp(ws_url, on_message=_on_message)
        threading.Thread(target=app.run_forever, daemon=True).start()

    def close(self) -> None:
        self._hb_stop.set()
