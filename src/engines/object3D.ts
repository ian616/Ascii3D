import { create, all, Matrix } from "mathjs";
import type { Polygon } from "../model/polygon";

export default function object3D() {
  const math = create(all);

  const translate = () => {};
  const rotateX = (theta: number) => {
    math.matrix([
      [1, 0, 0, 0],
      [0, Math.cos(theta), -Math.sin(theta), 0],
      [0, Math.sin(theta), Math.cos(theta), 0],
      [0, 0, 0, 1],
    ]);
  };
  const rotateY = (theta: number) => {
    math.matrix([
      [Math.cos(theta), 0, Math.sin(theta), 0],
      [0, 1, 0, 0],
      [-Math.sin(theta), 0, Math.cos(theta), 0],
      [0, 0, 0, 1],
    ]);
  };
  const rotateZ = (theta: number) => {
    math.matrix([
      [Math.cos(theta), -Math.sin(theta), 0, 0],
      [Math.sin(theta), Math.cos(theta), 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);
  };

  return { translate, rotateX, rotateY, rotateZ };
}
