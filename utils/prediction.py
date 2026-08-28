# prediction.py
# Módulo de predicción: reconstruye la arquitectura EfficientNetB0 + Transfer Learning
# entrenada en el Colab sobre el dataset Caltech Birds 2011 (CUB-200-2011), carga los
# pesos guardados (model.h5) y expone una función para clasificar una imagen de ave.
#
# Origen: Copia_de_Transfer_Learning.ipynb (entrenamiento) y
#         Copia_de_Transfer_Learning_Despliegue_TF.ipynb (despliegue/inferencia).

import os

import numpy as np
from PIL import Image

import keras
from keras import layers
from keras.applications import EfficientNetB0

try:
    from .cub200_class_names import CLASS_NAMES  # cuando se importa como paquete (utils.prediction)
except ImportError:
    from cub200_class_names import CLASS_NAMES  # cuando se ejecuta directamente (python prediction.py)

IMG_SIZE = 224
NUM_CLASSES = len(CLASS_NAMES)

# Ruta al archivo de pesos entrenado. Por defecto se busca en pesos/model.h5
# (raíz del proyecto); se puede sobreescribir con la variable de entorno MODEL_PATH.
MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "..", "pesos", "model.h5"),
)

# Cache del modelo cargado (se construye una sola vez por proceso).
_model = None


def build_model(num_classes: int = NUM_CLASSES) -> keras.Model:
    """Reconstruye la misma arquitectura usada en el entrenamiento (EfficientNetB0
    congelado + cabeza densa), necesaria para poder cargar los pesos de model.h5."""
    inputs = layers.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    base_model = EfficientNetB0(include_top=False, input_tensor=inputs, weights=None)
    base_model.trainable = False

    x = layers.GlobalAveragePooling2D(name="avg_pool")(base_model.output)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.2, name="top_dropout")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="pred")(x)

    model = keras.Model(inputs, outputs, name="EfficientNet")
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-2),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def load_model(model_path: str = MODEL_PATH) -> keras.Model:
    """Carga (una sola vez) el modelo con los pesos entrenados."""
    global _model
    if _model is None:
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"No se encontró el archivo de pesos del modelo en: {model_path}. "
                "Copia el model.h5 generado en el Colab dentro de utils/ o define "
                "la variable de entorno MODEL_PATH."
            )
        model = build_model(NUM_CLASSES)
        model.load_weights(model_path)
        _model = model
    return _model


def preprocess_image(image: Image.Image) -> np.ndarray:
    """Redimensiona y prepara una imagen PIL para el modelo (batch de tamaño 1)."""
    image = image.convert("RGB")
    image = image.resize((IMG_SIZE, IMG_SIZE))
    array = np.array(image, dtype=np.float32)
    return np.expand_dims(array, axis=0)


def predict_topk(image: Image.Image, top_k: int = 5) -> list[dict]:
    """Devuelve las top_k especies más probables para una imagen.

    Retorna una lista de dicts: [{"especie": str, "confianza": float}, ...]
    ordenada de mayor a menor confianza (confianza en porcentaje 0-100).
    """
    model = load_model()
    batch = preprocess_image(image)
    prediction = model.predict(batch, verbose=0)[0]

    top_indices = np.argsort(prediction)[::-1][:top_k]
    return [
        {"especie": CLASS_NAMES[i], "confianza": round(float(prediction[i]) * 100, 1)}
        for i in top_indices
    ]


def predict_image(image: Image.Image) -> dict:
    """Devuelve solo la predicción principal: {"especie": str, "confianza": float}."""
    return predict_topk(image, top_k=1)[0]


def predict_from_path(image_path: str) -> dict:
    """Atajo para clasificar una imagen a partir de una ruta de archivo."""
    with Image.open(image_path) as img:
        return predict_image(img)


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print("Uso: python prediction.py <ruta_a_imagen>")
        sys.exit(1)

    resultado = predict_from_path(sys.argv[1])
    print(f"Especie detectada: {resultado['especie']} — {resultado['confianza']}% de confianza")
