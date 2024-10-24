import { useEffect, useRef, useState } from "react";
import { create, all, Matrix } from "mathjs";
import useObject3D from "./object3D";
import useCamera from "./camera";
import { Polygon } from "../model/polygon";
import useProjection from "./projection";

export default function useASCII3DRenderer(width: number, height: number) {
  const math = create(all);

  const [frameBuffer, setFrameBuffer] = useState<string[][]>();

  const object3D = useObject3D();

  const eye = math.matrix([0, 0, 0]); // 카메라 위치
  const look = math.matrix([0, 0, 1]); // 바라보는 방향
  const up = math.matrix([0, 1, 0]); // 업 벡터
  const camera = useCamera(eye, look, up);

  const projection = useProjection(width, height);

  const renderingChars = [".", ";", "o", "x", "%", "@"];

  useEffect(() => {
    setFrameBuffer(Array.from(Array(height), () => Array(width).fill("_")));
  }, []);

  useEffect(() => {
    processRender();
  }, [object3D.mesh]);

  const processRender = () => {
    object3D.mesh.forEach((polygon: Polygon) => {
      // const transformedVertex1 = object3D.transform(polygon.vertices.x);
      // projectTo2D(transformedVertex1);
      const step1 = object3D.worldTransform(polygon.vertices.x);
      const step2 = camera.viewTransform(step1);
      const [screenX, screenY] = projection.projectionTransform(step2);

      if (frameBuffer) {
        console.log(math.floor(screenX), math.floor(screenY));
        // check if index is inside the size of window
        if (
          0 <= screenX &&
          screenX < width &&
          0 <= screenY &&
          screenY < height
        ) {
          setFrameBuffer((prevBuffer) => {
            const newGrid = prevBuffer?.map((row) => [...row]);
            if (newGrid) {
              newGrid[math.floor(screenY)][math.floor(screenX)] = "*";
            }
            return newGrid;
          });
        }
      }
    });
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
