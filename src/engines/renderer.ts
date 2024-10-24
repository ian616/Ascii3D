import { useEffect, useRef, useState } from "react";
import { create, all, Matrix } from "mathjs";
import useObject3D from "./object3D";
import { Polygon } from "../model/polygon";

export default function useASCII3DRenderer(width: number, height: number) {
  const [frameBuffer, setFrameBuffer] = useState<string[][]>();
  const object3D = useObject3D();

  const renderingChars = [".", ";", "o", "x", "%", "@"];

  const math = create(all);

  useEffect(() => {
    setFrameBuffer(Array.from(Array(height), () => Array(width).fill("_")));
  }, []);

  useEffect(() => {
    console.log(object3D.mesh);
    object3D.mesh.forEach((polygon: Polygon) => {
      const transformedVertex1 = object3D.transform(polygon.vertices.x);
      console.log(transformedVertex1);
      projectTo2D(transformedVertex1);
      const transformedVertex2 = object3D.transform(polygon.vertices.y);
      console.log(transformedVertex2);
      projectTo2D(transformedVertex2);
      const transformedVertex3 = object3D.transform(polygon.vertices.z);
      console.log(transformedVertex3);
      projectTo2D(transformedVertex3);
    });
  }, [object3D.mesh]);

  const projectTo2D = (vertex: Matrix) => {
    const FOV_DEGREE = 60;
    const FOV_RADIAN = math.unit(FOV_DEGREE, "deg").toNumber("rad");
    const aspectRatio = width / height;
    const near = 0.1;
    const far = 1000;

    const projectionMatrix = math.matrix([
      [1 / (aspectRatio * Math.tan(FOV_RADIAN / 2)), 0, 0, 0],
      [0, 1 / Math.tan(FOV_RADIAN / 2), 0, 0],
      [0, 0, -(far + near) / (far - near), -(2 * far * near) / (far - near)],
      [0, 0, -1, 0],
    ]);

    const projectedVertex = math.multiply(projectionMatrix, vertex);
    console.log(projectedVertex);

    // normalize
    const normalizedX2D =
      projectedVertex.get([0, 0]) / -projectedVertex.get([2, 0]);
    const normalizedY2D =
      projectedVertex.get([1, 0]) / -projectedVertex.get([2, 0]);

    const screenX = (normalizedX2D + 1) * (width / 2);
    const screenY = (1 - normalizedY2D) * (height / 2); // Y축 반전

    if (frameBuffer) {
      console.log(math.floor(screenX), math.floor(screenY));
      // check if index is inside the size of window
      if (0 <= screenX && screenX < width && 0 <= screenY && screenY < height) {
        setFrameBuffer((prevBuffer) => {
          const newGrid = prevBuffer?.map((row) => [...row]);
          if (newGrid) {
            newGrid[math.floor(screenY)][math.floor(screenX)] = "*";
          }
          return newGrid;
        });
      }
    }
  };

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
