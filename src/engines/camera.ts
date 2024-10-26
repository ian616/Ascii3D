import { create, all, Matrix } from "mathjs";
import useLoader from "./loader";
import type { Polygon } from "../model/polygon";
import { useEffect, useRef, useState } from "react";

export default function useCamera() {
  const math = create(all);

  const normalize = (vector: Matrix)=>{
    const magnitude:number = math.number(math.norm(vector));
    return math.multiply(vector, (1/magnitude));
  };

  const [eye, setEye] = useState<Matrix>(math.matrix([0, 0, 0])); // 카메라 위치
  const [look, setLook] = useState<Matrix>(normalize(math.matrix([0, 0, 1]))); // 바라보는 방향
  const [up, setUp] = useState<Matrix>(normalize(math.matrix([0, 1, 0]))); // 업 벡터

  const viewTransform = (vertex: Matrix) => {
    const zAxis = normalize(math.matrix(math.subtract(eye, look))); // 카메라 방향
    const xAxis = normalize(math.matrix(math.cross(up, zAxis))); // 오른쪽 벡터
    const yAxis = math.matrix(math.cross(zAxis, xAxis)); // 수직 벡터

    // 뷰 행렬 구성
    const viewMatrix = math.matrix([
      [xAxis.get([0]), yAxis.get([0]), zAxis.get([0]), 0],
      [xAxis.get([1]), yAxis.get([1]), zAxis.get([1]), 0],
      [xAxis.get([2]), yAxis.get([2]), zAxis.get([2]), 0],
      [-math.dot(xAxis, eye), -math.dot(yAxis, eye), -math.dot(zAxis, eye), 1],
    ]);

    return math.multiply(viewMatrix, vertex);
  };

  return { viewTransform, setEye, setLook, setUp };
}
