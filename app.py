# app.py
# Backend Flask que expone el modelo de clasificación de aves (Taller 2:
# EfficientNetB0 + Transfer Learning sobre Caltech Birds 2011) como API HTTP.
#
# Endpoint principal: POST /predict — recibe una imagen y responde con la
# etiqueta (especie) detectada y el porcentaje de confianza.

import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image

from utils.prediction import predict_image, predict_topk

app = Flask(__name__)

# Orígenes permitidos: Angular en desarrollo (ng serve) y el backend Node
# (server/index.js) que sirve el build de producción.
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:4200,http://localhost:3000"
).split(",")
CORS(app, origins=ALLOWED_ORIGINS)

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_BYTES


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/predict")
def predict():
    if "imagen" not in request.files:
        return jsonify({"error": "No se envió ninguna imagen (campo 'imagen')."}), 400

    archivo = request.files["imagen"]
    if archivo.filename == "":
        return jsonify({"error": "El archivo de imagen está vacío."}), 400

    try:
        image = Image.open(archivo.stream)
        image.load()
    except Exception:
        return jsonify({"error": "El archivo enviado no es una imagen válida."}), 400

    try:
        resultado = predict_image(image)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"No se pudo clasificar la imagen: {e}"}), 500

    return jsonify(resultado)


@app.post("/predict/top")
def predict_top():
    """Variante que devuelve el top-5 de especies más probables."""
    if "imagen" not in request.files:
        return jsonify({"error": "No se envió ninguna imagen (campo 'imagen')."}), 400

    archivo = request.files["imagen"]
    try:
        image = Image.open(archivo.stream)
        image.load()
    except Exception:
        return jsonify({"error": "El archivo enviado no es una imagen válida."}), 400

    try:
        resultado = predict_topk(image, top_k=5)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"No se pudo clasificar la imagen: {e}"}), 500

    return jsonify({"predicciones": resultado})


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
