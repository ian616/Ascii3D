import { useEffect, useState } from "react";
import useLoader from "./loader";

export default function useASCII3DRenderer(width: number, height: number) {
  const loader = useLoader();
  const [frameBuffer, setFrameBuffer] = useState<string[][]>();

  const renderingChars = [".", ";", "o", "x", "%", "@"];

  useEffect(() => {
    setFrameBuffer(Array.from(Array(height), () => Array(width).fill("#")));
    initializeObject3D();
  }, []);

  const initializeObject3D = async ()=>{
    const polygons = await loader.parseObjtoPolygons();
    polygons.forEach((polygon)=>{
      
    });
  };

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
