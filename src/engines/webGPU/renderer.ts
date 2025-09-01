import { useEffect, useRef, useState } from "react";

import useObject3D from "../webGPU/object3D";
import useCamera from "../webGPU/camera";
import useProjection from "../webGPU/projection";

import { WebGPUEngine } from "./webGPU_engine";

export default function useWebGPUASCII3DRenderer(
    device: GPUDevice,
    width: number,
    height: number
) {
    const [frameBuffer, setFrameBuffer] = useState<string[][]>(
        Array.from(Array(height), () => Array(width).fill("_"))
    );
    const [actualFPS, setActualFPS] = useState(0);

    const fps = 60;

    const object3D = useObject3D(device, "/objects/cow.ts");
    const camera = useCamera();
    const projection = useProjection(width, height);

    const previousTimeRef = useRef(0);
    const requestRef = useRef<number | null>(null);
    const running = useRef<boolean>(false);

    const updatePosition = () => {
        /*** Z축 translation ***/
        // object3D.setPosition((prev) =>
        //   prev.map((value, index) => {
        //     if (index[0] === 2) {
        //       return value - 0.1;
        //     }
        //     return value;
        //   })
        // );

        /*** X, Y축 rotation ***/
        object3D.setRotation((prev) =>
            prev.map((value, index) => {
                if (index[0] === 1) {
                    return value - 2;
                } else if (index[0] === 0) {
                    return value - 0.4;
                }
                return value;
            })
        );
    };

    const processRender = async () => {
        // WGSL 모듈 로드
        const engine = await WebGPUEngine.init(device, "/mvp_light.wgsl");

        // mesh 연결 (입력/출력 버퍼 바인딩 준비)
        engine.attachMesh(object3D.mesh!);

        const model = object3D.worldTransform();
        const view = camera.viewTransform();
        const proj = projection.projectionTransform();

        const MV = new Float32Array(16);
        {
            const a = view,
                b = model;
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    let s = 0;
                    for (let k = 0; k < 4; k++)
                        s += a[r * 4 + k] * b[k * 4 + c];
                    MV[r * 4 + c] = s;
                }
            }
        }
        const w = Math.max(1, Math.floor(width));
        const h = Math.max(1, Math.floor(height));
        const L = new Float32Array([0, 0, -1]);
        engine.updateUniforms(MV, proj, w, h, L);

        // 실행 + readback
        const { outScreen, triBright } = await engine.runAndRead();

        const frameBuffer = Array.from(Array(height), () =>
            Array(width).fill("_")
        );
        const depthBuffer = Array.from(Array(height), () =>
            Array(width).fill(1e9)
        ); // 초기값은 far로 설정

        const shadeASCII = ".;ox#%@";
        const EXPOSE = 1.0; // 1.0~1.4 사이 권장
        const BIAS = 0.05; // 0.05~0.12 사이 권장
        const GAMMA = 0.6; // 0.5보다 살짝 낮추면 더 밝아짐

        const shadeFromB = (b: number) => {
            // 0..1 범위 → 노출/바이어스 → 감마 → 다시 0..1 클램프
            const t0 = Math.min(Math.max(b, 0), 1);
            const t1 = Math.min(Math.max(t0 * EXPOSE + BIAS, 0), 1);
            const t2 = Math.pow(t1, GAMMA);

            const s = shadeASCII.length - 1;
            const idx = s - Math.floor(t2 * s);
            return shadeASCII[idx];
        };

        const { indexArray, indexCount } = object3D.mesh!;
        const triCount = Math.floor(indexCount / 3);

        // 바리센트릭 래스터 스케치 (실전은 스캔라인/타일로 최적화 권장)
        const putPixel = (x: number, y: number, z: number, ch: string) => {
            if (x < 0 || x >= w || y < 0 || y >= h) return;
            if (z < depthBuffer[y][x]) {
                depthBuffer[y][x] = z;
                frameBuffer[y][x] = ch;
            }
        };

        const getVS = (i: number) => ({
            x: outScreen[4 * i + 0],
            y: outScreen[4 * i + 1],
            z: outScreen[4 * i + 2],
        });

        for (let t = 0; t < triCount; t++) {
            const i0 = indexArray[3 * t + 0],
                i1 = indexArray[3 * t + 1],
                i2 = indexArray[3 * t + 2];
            const v0 = getVS(i0),
                v1 = getVS(i1),
                v2 = getVS(i2);

            // triBright는 per-tri 하나씩 저장되어 있음
            const b = triBright[4 * t + 0];
            const ch = shadeFromB(b);

            // 화면 bounding box
            const minX = Math.max(0, Math.floor(Math.min(v0.x, v1.x, v2.x)));
            const maxX = Math.min(w - 1, Math.ceil(Math.max(v0.x, v1.x, v2.x)));
            const minY = Math.max(0, Math.floor(Math.min(v0.y, v1.y, v2.y)));
            const maxY = Math.min(h - 1, Math.ceil(Math.max(v0.y, v1.y, v2.y)));

            const area =
                (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x);
            if (area === 0) continue;

            for (let py = minY; py <= maxY; py++) {
                for (let px = minX; px <= maxX; px++) {
                    const w0 =
                        ((v1.x - v0.x) * (py - v0.y) -
                            (v1.y - v0.y) * (px - v0.x)) /
                        area;
                    const w1 =
                        ((v2.x - v1.x) * (py - v1.y) -
                            (v2.y - v1.y) * (px - v1.x)) /
                        area;
                    const w2 = 1 - w0 - w1;

                    if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                        // 깊이 보간 (depth01)
                        const z = w0 * v2.z + w1 * v0.z + w2 * v1.z;
                        putPixel(px, py, z, ch);
                    }
                }
            }
        }
        // 화면에 FPS 표시
        const fpsString = `FPS: ${actualFPS}`;

        for (let i = 0; i < fpsString.length; i++) {
            if (i < width) {
                frameBuffer[0][i] = fpsString[i];
            }
        }

        setFrameBuffer(frameBuffer);
    };

    const animate = (time: number) => {
        if (!running.current) return;

        const deltaTime = time - previousTimeRef.current;
        if (deltaTime >= 1000 / fps) {
            previousTimeRef.current = time;
            updatePosition();
            processRender();
            const currentFPS = Math.round(1000 / deltaTime);
            setActualFPS(currentFPS);
        }

        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        running.current = true;
        previousTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(animate);

        return () => {
            running.current = false;
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [object3D]);

    const convertFrameBufferToString = () => {
        let resultString = "";

        frameBuffer?.forEach((row) => {
            row.forEach((char) => {
                resultString += char;
            });
            resultString += "<br/>";
        });

        return resultString;
    };

    return { frameBuffer, convertFrameBufferToString };
}
