import { create, all, Matrix } from "mathjs";
import { toF32 } from "../../utils/math";

export default function useProjection(width: number, height: number) {
  const math = create(all);

  const projectionTransform = () => {
    const FOV_DEGREE = 70;
    const FOV_RADIAN = math.unit(FOV_DEGREE, "deg").toNumber("rad");
    const aspectRatio = width / height;
    const near = 0.1;
    const far = 100;

    const projectionMatrix = math.matrix([
      [1 / (aspectRatio * Math.tan(FOV_RADIAN / 2)), 0, 0, 0],
      [0, 1 / Math.tan(FOV_RADIAN / 2), 0, 0],
      [0, 0, (far + near) / (far - near), 1],
      [0, 0, (-2 * far * near) / (far - near), 0],
    ]);

    return toF32(math.transpose(projectionMatrix));
  };
  return { projectionTransform };
}
