import { useEffect, useRef, useState } from "react";
import { create, all, Matrix } from "mathjs";
import useObject3D from "./object3D";
import useCamera from "./camera";
import { Polygon } from "../model/polygon";
import useProjection from "./projection";

export default function useASCII3DRenderer(width: number, height: number) {
  const math = create(all);
  const [frameBuffer, setFrameBuffer] = useState<string[][]>(
    Array.from(Array(height), () => Array(width).fill("_"))
  );

  const fps = 60;
  const object3D = useObject3D();
  const camera = useCamera();
  const projection = useProjection(width, height);

  const previousTimeRef = useRef(0);
  const requestRef = useRef<number | null>(null);
  const running = useRef<boolean>(false);

  const updatePosition = () => {
    // z 축 앞으로 이동
    // object3D.setPosition((prev) =>
    //   prev.map((value, index) => {
    //     if (index[0] === 2) {
    //       return value - 0.1;
    //     }
    //     return value;
    //   })
    // );

    /*** Y축 rotation ***/
    object3D.setRotation((prev) =>
      prev.map((value, index) => {
        if (index[0] === 1) {
          return value - 3;
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
        const viewTransformedVertex = camera.viewTransform(
          worldTransformedVertex
        );
        const projectedVertex = projection.projectionTransform(
          viewTransformedVertex
        );
        if (
          0 <= screenX &&
          screenX < width &&
          0 <= screenY &&
          screenY < height
        ) {
          const w = projectedVertex.get([3, 0]); // Get the w component
          const normalizedX2D = projectedVertex.get([0, 0]) / w;
          const normalizedY2D = projectedVertex.get([1, 0]) / w;

          const screenX = (normalizedX2D + 1) * (width / 2);
          const screenY = (1 - normalizedY2D) * (height / 2); // Y축 반전
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
