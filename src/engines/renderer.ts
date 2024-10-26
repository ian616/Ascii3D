import { useEffect, useRef, useState } from "react";
import { create, all } from "mathjs";
import useObject3D from "./object3D";
import useCamera from "./camera";
import { Polygon } from "../model/polygon";
import useProjection from "./projection";

export default function useASCII3DRenderer(width: number, height: number) {
  const math = create(all);
  const [frameBuffer, setFrameBuffer] = useState<string[][]>(Array.from(Array(height), () => Array(width).fill("_")));
  
  const fps = 60;
  const object3D = useObject3D();
  const camera = useCamera();
  const projection = useProjection(width, height);
  
  const previousTimeRef = useRef(0); 
  const requestRef = useRef<number | null>(null); 
  const running = useRef<boolean>(false); 

  const updatePosition = () => {
    object3D.setPosition((prevPosition) =>
      prevPosition.map((value, index) => {
        if (index[0] === 2) {
          return value - 0.1;
        }
        return value;
      })
    );
  };

  const processRender = () => {
    const newBuffer = Array.from(Array(height), () => Array(width).fill("_")); 

    object3D.mesh.forEach((polygon: Polygon, i) => {
      polygon.vertices.forEach((vertex) => {
        const worldTransformedVertex = object3D.worldTransform(vertex);
        const viewTransformedVertex = camera.viewTransform(worldTransformedVertex);
        const [screenX, screenY] = projection.projectionTransform(viewTransformedVertex);

        // Check if the index is inside the size of the window
        if (
          0 <= screenX &&
          screenX < width &&
          0 <= screenY &&
          screenY < height
        ) {
          newBuffer[math.floor(screenY)][math.floor(screenX)] = "*";
        }
      });
    });

    setFrameBuffer(newBuffer); 
  };

  const animate = (time: number) => {
    if (!running.current) return; 

    const deltaTime = time - previousTimeRef.current;
    if (deltaTime >= 1000 / fps) {
      previousTimeRef.current = time; 
      updatePosition(); 
      processRender(); 
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    running.current = true; 
    previousTimeRef.current = performance.now(); 
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      running.current = false; 
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current); 
      }
    };
  }, [object3D]); 


  const convertFrameBufferToString = () => {
    let resultString = "";

    frameBuffer?.forEach((row) => {
      row.forEach((char) => {
        resultString += char;
      });
      resultString += "<br/>";
    });

    return resultString;
  };

  return { frameBuffer, convertFrameBufferToString };
}
