"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "checkout_form_data";

export function usePersistedCheckoutForm<T>(initialState: T) {
  const [formData, setFormData] = useState<T>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);
  // Capture the initial state once so the load effect doesn't re-run
  const initialStateRef = useRef(initialState);

  // Cargar datos guardados al montar el componente
  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData) as Partial<T>;
        setFormData({ ...initialStateRef.current, ...parsed });
      }
    } catch (error) {
      console.error("Error loading persisted form data:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Guardar datos en sessionStorage cuando cambien
  useEffect(() => {
    if (isLoaded) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      } catch (error) {
        console.error("Error persisting form data:", error);
      }
    }
  }, [formData, isLoaded]);

  // Función para limpiar los datos guardados
  const clearPersistedData = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing persisted data:", error);
    }
  };

  return {
    formData,
    setFormData,
    isLoaded,
    clearPersistedData,
  };
}