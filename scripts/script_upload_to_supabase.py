"""
Importar PoemasDelAlmaDataset.csv → Supabase (schema: versos, tabla: poems)
============================================================================
14.750 poemas, 1.354 autores.

Requisitos:
    pip install pandas requests

Uso:
    export SUPABASE_URL="https://xxxx.supabase.co"
    export SUPABASE_KEY="tu_service_role_key"
    python import_csv_poemas.py
"""

import os
import re
import time
import logging
import requests
import pandas as pd

# ── Configuración ──────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
TABLA      = "poems"
SCHEMA     = "versos"
ERA        = "Contemporáneo"   # valor por defecto — ajusta si quieres
CREATED_BY = "420674d9-efb8-4e63-8f9e-10ad379b2126"

CSV_PATH = "../csv/PoemasDelAlmaDataset.csv"
BATCH_SIZE = 200   # Supabase aguanta bien batches de 200

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

SB_HEADERS = {
    "apikey":          SUPABASE_KEY,
    "Authorization":   f"Bearer {SUPABASE_KEY}",
    "Content-Type":    "application/json",
    "Prefer":          "return=minimal",
    "Content-Profile": SCHEMA,
    "Accept-Profile":  SCHEMA,
}
SB_URL = f"{SUPABASE_URL}/rest/v1/{TABLA}"


# ── Limpieza de texto ──────────────────────────────────────────────────────────

def limpiar(texto: str) -> str:
    """Normaliza los saltos de línea del CSV y elimina espacios redundantes."""
    # \r\n y \n\r\n → salto de línea simple
    texto = re.sub(r"\r\n|\n\r\n", "\n", texto)
    # Más de dos saltos seguidos → dos (separación de estrofa)
    texto = re.sub(r"\n{3,}", "\n\n", texto)
    return texto.strip()


# ── Carga y limpieza del CSV ───────────────────────────────────────────────────

def cargar_csv(path: str) -> list[dict]:
    log.info(f"Cargando {path}...")
    df = pd.read_csv(path)
    total_original = len(df)

    # Eliminar filas sin título o sin texto
    df = df.dropna(subset=["Title", "Poem"])
    df["Title"]  = df["Title"].str.strip()
    df["Author"] = df["Author"].str.strip()
    df["Poem"]   = df["Poem"].apply(limpiar)

    # Eliminar filas con texto vacío tras limpiar
    df = df[df["Poem"].str.len() > 0]
    df = df[df["Title"].str.len() > 0]

    log.info(f"  {total_original} filas → {len(df)} válidas tras limpiar nulls")

    registros = [
        {
            "title":      row["Title"],
            "author":     row["Author"],
            "body_text":  row["Poem"],
            "era":        ERA,
            "created_by": CREATED_BY,
        }
        for _, row in df.iterrows()
    ]
    return registros


# ── Inserción en Supabase ──────────────────────────────────────────────────────

def insertar_batch(batch: list[dict]) -> bool:
    try:
        resp = requests.post(SB_URL, json=batch, headers=SB_HEADERS, timeout=60)
        if resp.status_code in (200, 201):
            return True
        log.error(f"  HTTP {resp.status_code}: {resp.text[:300]}")
        return False
    except Exception as e:
        log.error(f"  Error de red: {e}")
        return False


def subir(registros: list[dict]) -> None:
    total = len(registros)
    ok    = 0
    fallos = []

    for i in range(0, total, BATCH_SIZE):
        batch = registros[i : i + BATCH_SIZE]
        if insertar_batch(batch):
            ok += len(batch)
            log.info(f"  [{ok}/{total}] subidos")
        else:
            fallos.extend(batch)
            log.warning(f"  Falló batch {i // BATCH_SIZE + 1} — reintentando uno a uno...")
            # Reintento unitario para aislar el registro problemático
            for registro in batch:
                if insertar_batch([registro]):
                    ok += 1
                else:
                    log.error(f"    Registro fallido: {registro['title'][:60]}")
            time.sleep(1)

    log.info(f"\n✓ Completado: {ok}/{total} poemas subidos")
    if fallos:
        log.warning(f"  {len(fallos)} registros fallaron definitivamente")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if "TU_PROYECTO" in SUPABASE_URL or "TU_SERVICE" in SUPABASE_KEY:
        log.error("Configura SUPABASE_URL y SUPABASE_KEY como variables de entorno")
        return
    if "TU-UUID" in CREATED_BY:
        log.error("Pon tu UUID en la variable CREATED_BY del script")
        return

    registros = cargar_csv(CSV_PATH)
    log.info(f"Subiendo {len(registros)} poemas a Supabase (schema: {SCHEMA}, tabla: {TABLA})...")
    log.info(f"Batches de {BATCH_SIZE} — estimado: ~{len(registros) // BATCH_SIZE + 1} peticiones")
    subir(registros)


if __name__ == "__main__":
    main()