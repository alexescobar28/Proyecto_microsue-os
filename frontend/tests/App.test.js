// __tests__/App.test.js
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { CameraView } from 'expo-camera';
import RootLayout from '../App';

// Mock the necessary modules
jest.mock('expo-camera', () => ({
  CameraView: jest.fn(),
  useCameraPermissions: () => [{
    granted: true
  }, jest.fn()]
}));

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({ sound: { 
        playAsync: jest.fn(),
        unloadAsync: jest.fn(),
        stopAsync: jest.fn(),
        replayAsync: jest.fn()
      }})
    }
  }
}));

describe('RootLayout', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  it('renders correctly with camera permissions', () => {
    const { getByText } = render(<RootLayout />);
    expect(getByText('Pausado')).toBeTruthy();
  });

  it('toggles monitoring state when play/pause is pressed', async () => {
    const { getByText } = render(<RootLayout />);
    const toggleButton = getByText('Pausado');

    await act(async () => {
      fireEvent.press(toggleButton);
    });

    expect(getByText('Monitoreando')).toBeTruthy();
  });

  it('shows alert when microsleep is detected', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ is_microsleep: true })
      })
    );

    const { getByText } = render(<RootLayout />);
    
    await act(async () => {
      fireEvent.press(getByText('Pausado'));
    });

    await act(async () => {
      // Wait for the monitoring interval to trigger
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    expect(getByText('¡Alerta! Posible somnolencia detectada.')).toBeTruthy();
  });
});