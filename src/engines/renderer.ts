import { useEffect, useState } from "react";

export default function useASCII3DRenderer(width: number, height: number) {
  const [frameBuffer, setFrameBuffer] = useState<string[][]>();

  const renderingChars = [".", ";", "o", "x", "%", "@"];

  useEffect(() => {
    setFrameBuffer(Array.from(Array(height), () => Array(width).fill("#")));
  }, []);


  const convertFrameBufferToString = ()=>{
    let resultString = "";

    frameBuffer?.forEach((row) => {
      row.forEach((char) => {
        resultString += char;
      });
      resultString += "<br/>";
    });

    return resultString;
  }
  

  return { frameBuffer, convertFrameBufferToString };
}
