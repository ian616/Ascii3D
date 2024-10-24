import { create, all, Matrix } from "mathjs";
import useLoader from "./loader";
import type { Polygon } from "../model/polygon";
import { useEffect, useRef, useState } from "react";

export default function useCamera(eye: Matrix, look: Matrix, up: Matrix) {
  const math = create(all);

  const normalize = (vector: Matrix) => {
    const length = math.number(math.norm(vector)); // 벡터의 크기 계산
    return math.multiply(vector, 1 / length);
  };

  const viewTransform = (vertex: Matrix) => {
    const zAxis = math.matrix(math.subtract(eye, look)); // 카메라 방향
    const xAxis = math.matrix(math.cross(up, zAxis)); // 오른쪽 벡터
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

  return { viewTransform };
}
