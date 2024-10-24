import { create, all, Matrix } from "mathjs";
import useLoader from "./loader";
import type { Polygon } from "../model/polygon";
import { useEffect, useRef, useState } from "react";

export default function useObject3D() {
  const math = create(all);
  const loader = useLoader();

  let mesh: Polygon[];
  const position = useRef<Matrix>(math.matrix([0, 0, 0])); // position vector
  const rotation = useRef<Matrix>(math.matrix([30, 10, 60])); // rotation angle for x, y, z axis

  useEffect(() => {
    const wrapper = async () => {
      mesh = await loader.parseObjtoPolygons();
    };
    wrapper();
  }, []);

  // z->y->x rotation 먼저 적용후 transition 적용하는 순서 지켜야함
  const transform = (vertex: Matrix) => {
    const theta = rotation.current.map((angle) =>
      math.unit(angle, "deg").toNumber("rad")
    );
    const step1 = math.multiply(
      rotateZ(theta.get([2])),
      rotateY(theta.get([1]))
    );
    const step2 = math.multiply(step1, rotateX(theta.get([0])));
    const step3 = math.multiply(step2, translate);
    const step4 = math.multiply(step3, convertToHomogenius(vertex));
    
    return step4; // vector 형태가 아니라 homogenius matrix형태로 반환
  };

  // to use homogenius matrix, add additional dimension to vector and make into column vector
  const convertToHomogenius = (vector: Matrix) => {
    return math.transpose(
      math.matrix([[vector.get([0]), vector.get([1]), vector.get([2]), 1]])
    );
  };

  const translate = math.matrix([
    [1, 0, 0, position.current.get([0])],
    [0, 1, 0, position.current.get([1])],
    [0, 0, 1, position.current.get([2])],
    [0, 0, 0, 1],
  ]);

  const rotateX = (theta: number) => {
    return math.matrix([
      [1, 0, 0, 0],
      [0, Math.cos(theta), -Math.sin(theta), 0],
      [0, Math.sin(theta), Math.cos(theta), 0],
      [0, 0, 0, 1],
    ]);
  };
  const rotateY = (theta: number) => {
    return math.matrix([
      [Math.cos(theta), 0, Math.sin(theta), 0],
      [0, 1, 0, 0],
      [-Math.sin(theta), 0, Math.cos(theta), 0],
      [0, 0, 0, 1],
    ]);
  };
  const rotateZ = (theta: number) => {
    return math.matrix([
      [Math.cos(theta), -Math.sin(theta), 0, 0],
      [Math.sin(theta), Math.cos(theta), 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);
  };

  return { position, rotation, transform };
}
