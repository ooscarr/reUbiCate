"use client";

import { useState, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import * as Icons from "@/app/components/ui/icons/icons";
import { useSidebar } from "@/app/context/sidebarCtx";
import PlacesJSON from "@/lib/places/data";
import Fuse from "fuse.js";
import { Feature } from "@/lib/types";
import { emitPlaceSelectedEvent } from "@/lib/events/customEvents";

export default function CameraSearch() {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setPlaces } = useSidebar();

  // Initialize Fuse for matching results to places
  const fuse = new Fuse(PlacesJSON.features, {
    keys: ["properties.name"],
    threshold: 0.3,
  });

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL("image/jpeg");
        setCapturedImage(dataUrl);

        // Stop stream
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());

        sendToGemini(dataUrl);
      }
    }
  };

  const sendToGemini = async (imageBase64: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageBase64,
          prompt:
            "Identifica este lugar o edificio dentro del campus universitario. Responde solo con el nombre si lo sabes.",
        }),
      });

      const data = await response.json();

      if (data.text) {
        const results = fuse.search(data.text);
        if (results.length > 0) {
          const feature = results[0].item as Feature;
          setPlaces([feature]);
          emitPlaceSelectedEvent(feature);
        } else {
          alert(`Gemini dice: ${data.text} (No encontrado en el mapa)`);
        }
      }
    } catch (error) {
      console.error("Error querying Gemini:", error);
      alert("Error al analizar la imagen");
    } finally {
      setIsAnalyzing(false);
      setIsCameraOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={startCamera}
        className="text-xs px-3 h-8 flex gap-2"
        // Make sure Icons.Camera exists in your icons file. 
        // If not, use standard text or add the SVG to icons.tsx
        icon={<Icons.Camera className="w-4 h-4" />} 
        text="Cámara"
      />

      {/* Modal Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${capturedImage ? "hidden" : "block"}`}
          />
          {capturedImage && (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          )}
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute bottom-10 flex gap-8 items-center">
            <button
              onClick={stopCamera}
              className="p-4 bg-destructive/80 rounded-full text-white font-bold"
            >
              <Icons.Close className="w-6 h-6 fill-white" />
            </button>

            {!capturedImage && (
              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 flex items-center justify-center"
              >
                <div className="w-16 h-16 bg-white rounded-full" />
              </button>
            )}
          </div>

          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg text-black font-bold">
                Analizando...
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}