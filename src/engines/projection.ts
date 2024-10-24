import { create, all, Matrix } from "mathjs";

export default function useProjection(width:number, height:number) {
  const math = create(all);

  const projectionTransform = (vertex: Matrix) => {
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

    // normalize
    const normalizedX2D =
      projectedVertex.get([0, 0]) / -projectedVertex.get([2, 0]);
    const normalizedY2D =
      projectedVertex.get([1, 0]) / -projectedVertex.get([2, 0]);

    console.log(normalizedX2D, normalizedY2D)
    const screenX = (normalizedX2D + 1) * (width / 2);
    const screenY = (1 - normalizedY2D) * (height / 2); // Y축 반전

    return [screenX, screenY];
  };
  return { projectionTransform };
}
