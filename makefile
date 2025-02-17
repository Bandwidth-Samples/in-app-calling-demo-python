setup-backend:
	cd backend && python3.13 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt

setup-frontend:
	cd frontend && npm install

setup: setup-backend setup-frontend

freeze:
	cd backend && pip freeze > requirements.txt

setup: setup-backend setup-frontend

run-local:
	@command -v docker-compose > /dev/null 2>&1 && docker-compose up --build || docker compose up --build
