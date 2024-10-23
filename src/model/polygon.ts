import { Matrix } from "mathjs";

export interface Polygon {
  vertices: {
    x: Matrix;
    y: Matrix;
    z: Matrix;
  };
}
