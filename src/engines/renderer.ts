import { useEffect, useRef, useState } from "react";
import { create, all, Matrix } from "mathjs";
import type { Polygon } from "../model/polygon";

import useObject3D from "./object3D";
import useCamera from "./camera";
import useLight from "./light";
import useProjection from "./projection";

export default function useASCII3DRenderer(width: number, height: number) {
  const math = create(all);
  const [frameBuffer, setFrameBuffer] = useState<string[][]>(Array.from(Array(height), () => Array(width).fill("_")));

  const fps = 60;
  const object3D = useObject3D();
  const camera = useCamera();
  const projection = useProjection(width, height);
  const light = useLight();

  const previousTimeRef = useRef(0);
  const requestRef = useRef<number | null>(null);
  const running = useRef<boolean>(false);

  const updatePosition = () => {
    /*** Z축 translation ***/
    // object3D.setPosition((prev) =>
    //   prev.map((value, index) => {
    //     if (index[0] === 2) {
    //       return value - 0.1;
    //     }
    //     return value;
    //   })
    // );

    /*** X, Y축 rotation ***/
    object3D.setRotation((prev) =>
      prev.map((value, index) => {
        if (index[0] === 1) {
          return value - 3;
        } else if (index[0] === 0) {
          return value - 0.2;
        }
        return value;
      })
    );
  };

  const projectToScreen = (viewTransformedVertex: Matrix) => {
    const projectedVertex = projection.projectionTransform(viewTransformedVertex);

    if (0 <= screenX && screenX < width && 0 <= screenY && screenY < height) {
      const w = projectedVertex.get([3, 0]);
      const normalizedX2D = projectedVertex.get([0, 0]) / w;
      const normalizedY2D = projectedVertex.get([1, 0]) / w;

      const screenX = (normalizedX2D + 1) * (width / 2);
      const screenY = (1 - normalizedY2D) * (height / 2); // Y축 반전

      return math.matrix([screenX, screenY]);
    }
  };

  const processRender = () => {
    const newBuffer = Array.from(Array(height), () => Array(width).fill("_"));
    const shadeASCII = [".", ";", "o", "x", "#", "%", "@"];

    const sign = (v1: Matrix, v2: Matrix, v3: Matrix) => {
      return (
        (v1.get([0]) - v3.get([0])) * (v2.get([1]) - v3.get([1])) -
        (v2.get([0]) - v3.get([0])) * (v1.get([1]) - v3.get([1]))
      );
    };

    const getBoundingBox = (v1: Matrix, v2: Matrix, v3: Matrix) => {
      const minX = Math.min(v1.get([0]), v2.get([0]), v3.get([0]));
      const minY = Math.min(v1.get([1]), v2.get([1]), v3.get([1]));
      const maxX = Math.max(v1.get([0]), v2.get([0]), v3.get([0]));
      const maxY = Math.max(v1.get([1]), v2.get([1]), v3.get([1]));

      return { minX, minY, maxX, maxY };
    };

    const isVertexInTriangle = (v: Matrix, v1: Matrix, v2: Matrix, v3: Matrix) => {
      const d1 = sign(v, v1, v2);
      const d2 = sign(v, v2, v3);
      const d3 = sign(v, v3, v1);

      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

      return !(hasNeg && hasPos);
    };

    object3D.mesh.forEach((polygon: Polygon, i) => {
      const viewTransformedVerticies: Matrix[] = polygon.vertices
        .map((vertex) => {
          const worldTransformedVertex = object3D.worldTransform(vertex);
          const viewTransformedVertex = camera.viewTransform(worldTransformedVertex);
          return viewTransformedVertex;
        })
        .filter((vertex): vertex is Matrix => vertex !== undefined);

      const brightness = light.getBrightness(
        viewTransformedVerticies[0],
        viewTransformedVerticies[1],
        viewTransformedVerticies[2]
      );

      const screenVerticies: Matrix[] = viewTransformedVerticies
        .map((vertex) => {
          return projectToScreen(vertex);
        })
        .filter((vertex): vertex is Matrix => vertex !== undefined);

      const bbox = getBoundingBox(screenVerticies[0], screenVerticies[1], screenVerticies[2]);

      for (let y = Math.max(0, Math.floor(bbox.minY)); y <= Math.min(height - 1, Math.floor(bbox.maxY)); y++) {
        for (let x = Math.max(0, Math.floor(bbox.minX)); x <= Math.min(width - 1, Math.floor(bbox.maxX)); x++) {
          if (isVertexInTriangle(math.matrix([x, y]), screenVerticies[0], screenVerticies[1], screenVerticies[2])) {
            const currentShade = shadeASCII[Math.round(brightness * (shadeASCII.length - 1))];
            newBuffer[y][x] = currentShade;
          }
        }
      }
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
