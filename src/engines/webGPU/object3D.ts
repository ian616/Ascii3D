import { create, all, Matrix } from "mathjs";
import { loadObjToGpuBuffers, type GpuMeshBuffers } from "./loader";
import { useEffect, useState } from "react";
import { toF32 } from "../../utils/math";

export default function useObject3D(device: GPUDevice, url: string) {
    const math = create(all);

    const [mesh, setMesh] = useState<GpuMeshBuffers | null>(null);

    const [position, setPosition] = useState<Matrix>(math.matrix([0, 0, 15])); // position vector
    const [rotation, setRotation] = useState<Matrix>(math.matrix([0, 0, 0])); // rotation angle for x, y, z axis
    const [scale, setScale] = useState<Matrix>(math.matrix([1, 1, 1]));

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const buf = await loadObjToGpuBuffers(device, url, {
                vertex: "mesh/vertices(vec4)",
                index: "mesh/indices(u32)",
            });
            if (!cancelled) setMesh(buf);
        })();
        return () => {
            cancelled = true;
        };
    }, [device, url]);

    // z->y->x rotation 후 scale transition 후 translation 적용하는 순서 지켜야함
    const worldTransform = () => {
        const theta = rotation.map((angle) =>
            math.unit(angle, "deg").toNumber("rad")
        );

        const step1 = math.multiply(
            rotateZ(theta.get([2])),
            rotateY(theta.get([1]))
        );
        const step2 = math.multiply(step1, rotateX(theta.get([0])));
        const step3 = math.multiply(step2, applyScale());
        const step4 = math.multiply(translate(), step3);

        return toF32(math.transpose(step4));
    };

    const translate = () => math.matrix([
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

    const applyScale = () => math.matrix([
        [scale.get([0]), 0, 0, 0],
        [0, scale.get([1]), 0, 0],
        [0, 0, scale.get([2]), 0],
        [0, 0, 0, 1],
    ]);

    return {
        mesh,
        position,
        rotation,
        scale,
        setPosition,
        setRotation,
        setScale,
        worldTransform,
    };
}
