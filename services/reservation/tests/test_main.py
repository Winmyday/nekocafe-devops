import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_healthz():
    r = client.get("/healthz")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["service"] == "reservation"


def test_list_stores():
    r = client.get("/api/v1/stores")
    assert r.status_code == 200
    data = r.json()
    assert "data" in data
    assert len(data["data"]) == 2


def test_list_stores_filter_by_city():
    r = client.get("/api/v1/stores?city=北京")
    assert r.status_code == 200
    data = r.json()
    assert len(data["data"]) == 1
    assert data["data"][0]["city"] == "北京"


def test_get_store_found():
    r = client.get("/api/v1/stores/S001")
    assert r.status_code == 200
    data = r.json()
    assert data["store_id"] == "S001"
    assert "北京" in data["name"]


def test_get_store_not_found():
    r = client.get("/api/v1/stores/S999")
    assert r.status_code == 404


def test_create_reservation_success():
    payload = {
        "store_id": "S001",
        "table_id": "T001",
        "date": "2026-06-01",
        "slot_id": "lunch",
        "guest_count": 2
    }
    r = client.post("/api/v1/reservations", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "confirmed"
    assert "reservation_id" in data


def test_create_reservation_conflict():
    payload = {
        "store_id": "S001",
        "table_id": "T001",
        "date": "2026-06-02",
        "slot_id": "dinner",
        "guest_count": 2
    }
    r1 = client.post("/api/v1/reservations", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/api/v1/reservations", json=payload)
    assert r2.status_code == 409


def test_create_reservation_invalid_table():
    payload = {
        "store_id": "S001",
        "table_id": "T999",
        "date": "2026-06-01",
        "slot_id": "lunch",
        "guest_count": 1
    }
    r = client.post("/api/v1/reservations", json=payload)
    assert r.status_code == 404


def test_get_reservation_found():
    payload = {
        "store_id": "S001",
        "table_id": "T001",
        "date": "2026-06-03",
        "slot_id": "afternoon",
        "guest_count": 3
    }
    create_r = client.post("/api/v1/reservations", json=payload)
    rid = create_r.json()["reservation_id"]
    r = client.get(f"/api/v1/reservations/{rid}")
    assert r.status_code == 200
    assert r.json()["reservation_id"] == rid


def test_get_reservation_not_found():
    r = client.get("/api/v1/reservations/nonexistent-id")
    assert r.status_code == 404


def test_cancel_reservation():
    payload = {
        "store_id": "S001",
        "table_id": "T001",
        "date": "2026-06-04",
        "slot_id": "morning",
        "guest_count": 1
    }
    create_r = client.post("/api/v1/reservations", json=payload)
    rid = create_r.json()["reservation_id"]
    r = client.delete(f"/api/v1/reservations/{rid}")
    assert r.status_code == 200
    assert r.json()["message"] == "预约已取消"


def test_create_reservation_guest_count_boundary():
    payload = {
        "store_id": "S001",
        "table_id": "T001",
        "date": "2026-06-05",
        "slot_id": "lunch",
        "guest_count": 0
    }
    r = client.post("/api/v1/reservations", json=payload)
    assert r.status_code == 422

    payload["guest_count"] = 11
    r = client.post("/api/v1/reservations", json=payload)
    assert r.status_code == 422