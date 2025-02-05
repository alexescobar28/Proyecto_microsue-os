# tests/test_eye_detection.py
import pytest
import numpy as np
from app import eye_aspect_ratio, State

def test_eye_aspect_ratio():
    # Test coordinates simulating an open eye
    coordinates = [
        [0, 0],   # Point 0
        [2, 2],   # Point 1
        [4, 2],   # Point 2
        [6, 0],   # Point 3
        [4, -2],  # Point 4
        [2, -2]   # Point 5
    ]
    ear = eye_aspect_ratio(coordinates)
    assert ear > 0.2  # Should be above threshold for open eyes

    # Test coordinates simulating a closed eye
    coordinates = [
        [0, 0],   # Point 0
        [2, 0.5], # Point 1
        [4, 0.5], # Point 2
        [6, 0],   # Point 3
        [4, -0.5],# Point 4
        [2, -0.5] # Point 5
    ]
    ear = eye_aspect_ratio(coordinates)
    assert ear < 0.2  # Should be below threshold for closed eyes

def test_state_initialization():
    state = State()
    assert state.microsleep_counter == 0
    assert state.aux_counter == 0
    assert state.beep_active == False
    assert state.is_microsleep == False

def test_state_reset():
    from app import reset_state
    response = reset_state()
    assert response.status_code == 200
    data = response.get_json()
    assert data["message"] == "State reset successfully"