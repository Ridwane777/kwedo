# API Kwedo (FastAPI) : moteur, modèles déjà entraînés, base de démo initialisée au premier démarrage.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 KWEDO_HOST=0.0.0.0

# libgomp1 : requis par LightGBM.
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Même arborescence que le dépôt : les chemins relatifs du moteur et du service restent valides.
COPY packages/engine packages/engine
COPY packages/generator packages/generator
COPY ml/artifacts ml/artifacts
COPY data/demo data/demo
COPY services/api services/api

RUN mkdir -p /data
VOLUME /data
EXPOSE 3460

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3460/auth/profils', timeout=2)"

# La base est créée et chargée avec la démo figée si elle est vide (premier démarrage du volume).
CMD ["python", "services/api/serveur.py", "--db", "/data/kwedo.sqlite", "--port", "3460"]
