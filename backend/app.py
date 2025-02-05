from flask import Flask, request, jsonify
import mediapipe as mp
import cv2
import numpy as np
import time
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
# Configuración de Mediapipe
mp_face_mesh = mp.solutions.face_mesh
index_left_eye = [33, 160, 158, 133, 153, 144]
index_right_eye = [362, 385, 387, 263, 373, 380]
EAR_THRESH = 0.2
MICROSLEEP_FRAMES = 2  # 2 segundos de microsueño (los frames son de 1 segundo)

# Variables de estado
class State:
    def __init__(self):
        self.microsleep_counter = 0
        self.aux_counter = 0
        self.beep_active = False
        self.last_frame_time = time.time()
        self.is_microsleep = False

state = State()

def eye_aspect_ratio(coordinates):
    d_A = np.linalg.norm(np.array(coordinates[1]) - np.array(coordinates[5]))
    d_B = np.linalg.norm(np.array(coordinates[2]) - np.array(coordinates[4]))
    d_C = np.linalg.norm(np.array(coordinates[0]) - np.array(coordinates[3]))
    return (d_A + d_B) / (2 * d_C)

@app.route('/process_frame', methods=['POST'])
def process_frame():
    current_time = time.time()
    frame_duration = current_time - state.last_frame_time
    state.last_frame_time = current_time

    # Leer la imagen enviada desde el cliente
    file = request.files['frame']
    file_bytes = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    height, width, _ = frame.shape
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Procesar el frame con MediaPipe
    with mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1) as face_mesh:
        results = face_mesh.process(frame_rgb)
        coordinates_left_eye = []
        coordinates_right_eye = []

        if results.multi_face_landmarks is not None:
            for face_landmarks in results.multi_face_landmarks:
                for index in index_left_eye:
                    x = int(face_landmarks.landmark[index].x * width)
                    y = int(face_landmarks.landmark[index].y * height)
                    coordinates_left_eye.append([x, y])
                for index in index_right_eye:
                    x = int(face_landmarks.landmark[index].x * width)
                    y = int(face_landmarks.landmark[index].y * height)
                    coordinates_right_eye.append([x, y])
            print("Coordenadas Ojo Izquierdo:", coordinates_left_eye)
            print("Coordenadas Ojo Derecho:", coordinates_right_eye)


            # Calcular EAR para ambos ojos
            ear_left_eye = eye_aspect_ratio(coordinates_left_eye)
            ear_right_eye = eye_aspect_ratio(coordinates_right_eye)
            ear = (ear_left_eye + ear_right_eye) / 2
            print("EAR: ",  ear_left_eye, ear_right_eye, ear)
            
            # Detectar ojos cerrados
            if ear < EAR_THRESH:
                state.aux_counter += 1
                if state.aux_counter >= MICROSLEEP_FRAMES:
                    if not state.beep_active:
                        state.microsleep_counter += 1
                        state.beep_active = True
                    state.is_microsleep = True
            else:
                state.beep_active = False
                state.is_microsleep = False
                state.aux_counter = 0
            print("MICROSLEEP: ", state.is_microsleep)
            return jsonify({
                "microsleep_counter": state.microsleep_counter,
                "is_microsleep": state.is_microsleep
            })

    return jsonify({"error": "No face detected"}), 400

@app.route('/reset', methods=['POST'])
def reset_state():
    global state
    state = State()
    return jsonify({"message": "State reset successfully"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
