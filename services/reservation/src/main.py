"""NekoCafe 预约服务 - FastAPI入口
班级：计算机233  姓名：刘俞靖  学号：231002501"""
import os
import logging
import uuid
from datetime import datetime, date
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# Structured JSON logging
logging.basicConfig(
    format='{"time":"%(asctime)s","level":"%(levelname)s","service":"reservation","message":"%(message)s"}',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

app = FastAPI(title="NekoCafe Reservation Service", version="1.0.0")
FastAPIInstrumentor.instrument_app(app)
tracer = trace.get_tracer(__name__)

# ===== Models =====
class CreateReservationRequest(BaseModel):
    store_id: str
    table_id: str
    date: date
    slot_id: str
    guest_count: int = Field(default=1, ge=1, le=10)
    has_cat: bool = False

class Reservation(BaseModel):
    reservation_id: str
    user_id: str
    store_id: str
    table_id: str
    date: date
    slot_id: str
    guest_count: int
    status: str
    created_at: datetime

# ===== In-memory store (replace with PostgreSQL in production) =====
reservations_db: dict = {}
tables_db = {
    "T001": {"table_id": "T001", "type": "双人桌", "capacity": 2, "cat_friendly": True, "store_id": "S001"},
    "T002": {"table_id": "T002", "type": "四人桌", "capacity": 4, "cat_friendly": False, "store_id": "S001"},
}
stores_db = {
    "S001": {"store_id": "S001", "name": "NekoCafe北京朝阳店", "city": "北京", "rating": 4.8},
    "S002": {"store_id": "S002", "name": "NekoCafe上海静安店", "city": "上海", "rating": 4.7},
}

# ===== Endpoints =====
@app.get("/healthz")
def healthz():
    return {"status": "ok", "service": "reservation", "version": "1.0.0"}

@app.get("/api/v1/stores")
def list_stores(city: Optional[str] = None, sort_by: str = "rating", page: int = 1, page_size: int = 20):
    with tracer.start_as_current_span("list_stores") as span:
        stores = list(stores_db.values())
        if city:
            stores = [s for s in stores if s["city"] == city]
        if sort_by == "rating":
            stores.sort(key=lambda s: s["rating"], reverse=True)
        span.set_attribute("store_count", len(stores))
        logger.info("Listed stores", extra={"city": city, "count": len(stores)})
        return {"data": stores, "page": page, "page_size": page_size}

@app.get("/api/v1/stores/{store_id}")
def get_store(store_id: str):
    store = stores_db.get(store_id)
    if not store:
        raise HTTPException(status_code=404, detail="门店不存在")
    return store

@app.post("/api/v1/reservations", status_code=201)
def create_reservation(req: CreateReservationRequest):
    with tracer.start_as_current_span("create_reservation") as span:
        # Validate table exists
        table = tables_db.get(req.table_id)
        if not table:
            raise HTTPException(status_code=404, detail="桌位不存在")

        # Check for conflicts
        for r in reservations_db.values():
            if (r["table_id"] == req.table_id and str(r["date"]) == str(req.date)
                and r["slot_id"] == req.slot_id and r["status"] not in ("cancelled",)):
                raise HTTPException(status_code=409, detail="该时段桌位已被预约")

        reservation = {
            "reservation_id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "store_id": req.store_id,
            "table_id": req.table_id,
            "date": req.date,
            "slot_id": req.slot_id,
            "guest_count": req.guest_count,
            "status": "confirmed",
            "created_at": datetime.utcnow().isoformat()
        }
        reservations_db[reservation["reservation_id"]] = reservation

        span.set_attribute("reservation_id", reservation["reservation_id"])
        logger.info("Reservation created", extra={
            "reservation_id": reservation["reservation_id"],
            "table_id": req.table_id,
            "date": str(req.date)
        })
        return reservation

@app.get("/api/v1/reservations/{reservation_id}")
def get_reservation(reservation_id: str):
    r = reservations_db.get(reservation_id)
    if not r:
        raise HTTPException(status_code=404, detail="预约不存在")
    return r

@app.delete("/api/v1/reservations/{reservation_id}")
def cancel_reservation(reservation_id: str):
    r = reservations_db.get(reservation_id)
    if not r:
        raise HTTPException(status_code=404, detail="预约不存在")
    r["status"] = "cancelled"
    logger.info("Reservation cancelled", extra={"reservation_id": reservation_id})
    return {"message": "预约已取消", "reservation_id": reservation_id}

if __name__ == "__main__":
    logger.info("Reservation service starting on port 8080")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)