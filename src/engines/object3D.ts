import { create, all, Matrix } from "mathjs";
import useLoader from "./loader";
import useCamera from "./camera";
import type { Polygon } from "../model/polygon";
import { useEffect, useRef, useState } from "react";

export default function useObject3D() {
  const math = create(all);
  const loader = useLoader();

  const [mesh, setMesh] = useState<Polygon[]>([]);
  const [position, setPosition] = useState<Matrix>(math.matrix([0, 0, 15])); // position vector
  const [rotation, setRotation] = useState<Matrix>(math.matrix([0, 0, 0])); // rotation angle for x, y, z axis
  const [scale, setScale] = useState<Matrix>(math.matrix([1, 1, 1]));

  useEffect(() => {
    const wrapper = async () => {
      setMesh(await loader.parseObjtoPolygons());
    };
    wrapper();
  }, []);

  // z->y->x rotation 후 scale transition 후 translation 적용하는 순서 지켜야함
  const worldTransform = (vertex: Matrix) => {
    const theta = rotation.map((angle) =>
      math.unit(angle, "deg").toNumber("rad")
    );
    
    const step1 = math.multiply(
      rotateZ(theta.get([2])),
      rotateY(theta.get([1]))
    );
    const step2 = math.multiply(step1, rotateX(theta.get([0])));
    const step3 = math.multiply(step2, applyScale);
    const step4 = math.multiply(translate, step3);
    const step5 = math.multiply(step4, convertToHomogenius(vertex));

    return step5; // homogenius matrix 형태로 반환
  };

  // to use homogenius matrix, add additional dimension to vector and make into column vector
  const convertToHomogenius = (vector: Matrix) => {
    return math.transpose(
      math.matrix([[vector.get([0]), vector.get([1]), vector.get([2]), 1]])
    );
  };

  const translate = math.matrix([
    [1, 0, 0, position.get([0])],
    [0, 1, 0, position.get([1])],
    [0, 0, 1, position.get([2])],
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

  const applyScale = math.matrix([
    [scale.get([0]), 0, 0, 0],
    [0, scale.get([1]), 0, 0],
    [0, 0, scale.get([2]), 0],
    [0, 0, 0, 1],
  ]);

  return { mesh, position, rotation, scale, setPosition, setRotation, setScale, worldTransform };
}
