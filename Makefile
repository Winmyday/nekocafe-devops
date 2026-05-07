.PHONY: up down test
up:    ; docker compose -p nekocafe up -d --build
down:  ; docker compose -p nekocafe down -v
test:  ; docker compose -p nekocafe exec reservation pytest
