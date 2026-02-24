"""
Tracking router — WebSocket for real-time technician location updates.

Protocol:
  Professional sends: {"lat": 28.4595, "lng": 77.0266}
  Server broadcasts to users watching the same booking:
    {"booking_id": "...", "lat": 28.4595, "lng": 77.0266, "ts": "2024-01-01T10:00:00Z"}

Architecture:
  For single-server dev: in-memory connection registry.
  For production: replace _rooms dict with Redis pub/sub channels.
"""
import json
from datetime import datetime, timezone
from collections import defaultdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from starlette.websockets import WebSocketState

from app.database import AsyncSessionLocal
from app.models.booking import Booking, BookingStatus
from app.models.professional import Professional
from app.services.auth_service import decode_access_token

router = APIRouter(prefix="/tracking", tags=["tracking"])

# room_id (booking_id) → list of connected WebSocket clients
_rooms: dict[str, list[WebSocket]] = defaultdict(list)


@router.websocket("/{booking_id}")
async def tracking_ws(websocket: WebSocket, booking_id: str, token: str | None = None):
    """
    WebSocket endpoint for live tracking.

    Query param `?token=<JWT>` is required for authentication (WS headers are limited).
    The professional sends location; all other connections in the room receive broadcasts.
    """
    if not token:
        await websocket.close(code=1008)  # Policy violation
        return

    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        role = payload.get("role")
    except Exception:
        await websocket.close(code=1008)
        return

    # Validate booking exists and is in-progress
    async with AsyncSessionLocal() as db:
        booking = await db.scalar(select(Booking).where(Booking.id == booking_id))
        if not booking or booking.status != BookingStatus.in_progress:
            await websocket.close(code=1008)
            return

        # Check user belongs to this booking
        if role == "user" and booking.user_id != user_id:
            await websocket.close(code=1008)
            return
        if role == "professional":
            pro = await db.scalar(select(Professional).where(Professional.user_id == user_id))
            if not pro or booking.pro_id != pro.id:
                await websocket.close(code=1008)
                return

    await websocket.accept()
    _rooms[booking_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()

            # Only professional sends location updates
            if role == "professional":
                try:
                    loc = json.loads(data)
                    lat, lng = float(loc["lat"]), float(loc["lng"])
                except (json.JSONDecodeError, KeyError, ValueError):
                    await websocket.send_text(json.dumps({"error": "Invalid location format"}))
                    continue

                # Update pro's last known location in DB
                async with AsyncSessionLocal() as db:
                    pro = await db.scalar(select(Professional).where(Professional.user_id == user_id))
                    if pro:
                        pro.latitude = lat
                        pro.longitude = lng
                        await db.commit()

                # Broadcast to all watchers in the room
                broadcast_msg = json.dumps({
                    "booking_id": booking_id,
                    "lat": lat,
                    "lng": lng,
                    "ts": datetime.now(timezone.utc).isoformat(),
                })
                dead = []
                for ws in _rooms[booking_id]:
                    if ws == websocket:
                        continue
                    try:
                        await ws.send_text(broadcast_msg)
                    except Exception:
                        dead.append(ws)
                for ws in dead:
                    _rooms[booking_id].remove(ws)

    except WebSocketDisconnect:
        if websocket in _rooms[booking_id]:
            _rooms[booking_id].remove(websocket)
