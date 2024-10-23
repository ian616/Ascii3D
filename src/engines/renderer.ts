import { useEffect, useRef, useState } from "react";
import { create, all, Matrix } from "mathjs";
import useObject3D from "./object3D";

export default function useASCII3DRenderer(width: number, height: number) {
  
  const frameBuffer = useRef<string[][]>();
  const object3D = useObject3D();

  const renderingChars = [".", ";", "o", "x", "%", "@"];

  const math = create(all);

  useEffect(() => {
    frameBuffer.current = Array.from(Array(height), () => Array(width).fill("#"));
    console.log(object3D.transform(math.matrix([1, 1, 1])));
  }, []);

  const convertFrameBufferToString = ()=>{
    let resultString = "";

    frameBuffer.current?.forEach((row) => {
      row.forEach((char) => {
        resultString += char;
      });
      resultString += "<br/>";
    });

    return resultString;
  }
  

  return { frameBuffer, convertFrameBufferToString };
}
