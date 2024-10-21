import { useEffect, useState } from "react";

export default function useASCII3DRenderer(width: number, height: number) {
  const [frameBuffer, setFrameBuffer] = useState<string[][]>();

  const renderingChars = [".", ";", "o", "x", "%", "@"];

  useEffect(() => {
    setFrameBuffer(Array.from(Array(width), () => Array(height).fill(".")));
  }, []);

  return { frameBuffer };
}
