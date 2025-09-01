import { create, all, Matrix } from "mathjs";
import { useEffect, useRef, useState } from "react";

export default function useLight() {
  const math = create(all);

  const [lightVector, setlightVector] = useState<Matrix>(math.matrix([0, 0, 1])); // 빛의 방향

  const normalize = (vector: Matrix) => {
    const magnitude: number = math.number(math.norm(vector));
    return math.multiply(vector, 1 / magnitude);
  };

  const homogeniusTo3DPoint = (vertex: Matrix) => {
    const w = vertex.get([3, 0]); 
    const x = vertex.get([0, 0]) / w;
    const y = vertex.get([1, 0]) / w;
    const z = vertex.get([2, 0]) / w;

    return math.matrix([x, y, z]);
  };

  const getBrightness = (v1: Matrix, v2: Matrix, v3: Matrix) => {
    const p1 = homogeniusTo3DPoint(v1);
    const p2 = homogeniusTo3DPoint(v2);
    const p3 = homogeniusTo3DPoint(v3);

    const edge1: Matrix = math.subtract(p2, p1);
    const edge2: Matrix = math.subtract(p3, p1);

    const normal = normalize(math.matrix(math.cross(edge1, edge2)));

    const cosAngle = math.dot(normal, lightVector);

    const brightness = Math.max(0, cosAngle);

    return brightness;
  };

  return { lightVector, setlightVector, getBrightness };
}
