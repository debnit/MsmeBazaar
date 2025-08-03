.PHONY: install run test lint format docker-up docker-down

install:
\tpip install -r requirements.txt
\tpip install -r requirements-dev.txt

run:
\tuvicorn src.main:app --reload --host 0.0.0.0 --port 8003

test:
\tpytest --asyncio-mode=auto --maxfail=1 --disable-warnings -q

lint:
\tflake8 src

format:
\tblack src

docker-up:
\tdocker compose -f docker/docker-compose.override.yml up -d --build

docker-down:
\tdocker compose -f docker/docker-compose.override.yml down
