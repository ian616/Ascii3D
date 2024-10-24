import { useEffect, useRef, useState } from "react";
import { create, all, Matrix } from "mathjs";
import useObject3D from "./object3D";

export default function useASCII3DRenderer(width: number, height: number) {
  const frameBuffer = useRef<string[][]>();
  const object3D = useObject3D();

  const renderingChars = [".", ";", "o", "x", "%", "@"];

  const math = create(all);

  useEffect(() => {
    frameBuffer.current = Array.from(Array(height), () =>
      Array(width).fill("_")
    );

    const transformedVertex = object3D.transform(math.matrix([2, 6, 7]));
    console.log(transformedVertex);
    projectTo2D(transformedVertex);
  }, []);

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

    // console.log(screenX, screenY);
    if (frameBuffer.current) {
      console.log(math.floor(screenX), math.floor(screenY));
      frameBuffer.current[math.floor(screenY)][math.floor(screenX)] = "*";
    }
  };

  const convertFrameBufferToString = () => {
    let resultString = "";

    frameBuffer.current?.forEach((row) => {
      row.forEach((char) => {
        resultString += char;
      });
      resultString += "<br/>";
    });

    return resultString;
  };

  return { frameBuffer, convertFrameBufferToString };
}
