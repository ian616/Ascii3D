import type { Matrix } from "mathjs";

export function toF32(m: Matrix): Float32Array {
  // Matrix -> (중첩)배열 -> flat -> number 캐스팅
  const arr = (m.toArray() as unknown[])
    .flat(Infinity)
    .map((v) => Number(v as number));
  return new Float32Array(arr as number[]);
}