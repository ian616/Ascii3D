import type { GpuMeshBuffers } from "./loader";

const WG_SIZE = 256; // wgsl의 @workgroup_size와 동일

export class WebGPUEngine {
    private device: GPUDevice;
    private pipelineV!: GPUComputePipeline; // vert_transform
    private pipelineT!: GPUComputePipeline; // tri_lighting

    // uniforms
    private modelViewBuffer!: GPUBuffer; // 64B
    private projBuffer!: GPUBuffer; // 64B
    private viewportBuffer!: GPUBuffer; // 16B (vec2<u32> + 패딩)
    private lightBuffer!: GPUBuffer; // 16B (vec4<f32>)

    // mesh & outs
    private vertexBuffer!: GPUBuffer;
    private indexBuffer!: GPUBuffer;
    private vertexCount = 0;
    private indexCount = 0; // 3 * triCount

    private outScreen!: GPUBuffer; // vec4 per vertex (screenX,Y,depth01,_)
    private outView!: GPUBuffer; // vec4 per vertex (viewX,Y,Z,1)
    private triBright!: GPUBuffer; // vec4 per tri   (b,0,0,0)

    private outScreenBytes = 0;
    private outViewBytes = 0;
    private triBrightBytes = 0;

    // bind group (mesh/viewport 크기 바뀌면 재생성)
    private bindGroup!: GPUBindGroup;

    private constructor(device: GPUDevice) {
        this.device = device;
    }

    /** 엔진 초기화: WGSL 로드 + 파이프라인 생성 (entryPoint 2개) */
    static async init(
        device: GPUDevice,
        wgslUrl: string
    ): Promise<WebGPUEngine> {
        const engine = new WebGPUEngine(device);

        const code = await fetch(wgslUrl).then((r) => r.text());
        const module = device.createShaderModule({ code });

        const bgl = device.createBindGroupLayout({
            entries: [
                // 0: uModelView (mat4x4<f32> = 64B)
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform", minBindingSize: 64 },
                },
                // 1: uProj (64B)
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform", minBindingSize: 64 },
                },
                // 2: uViewport (vec2<u32> UBO는 16B 정렬 권장)
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform", minBindingSize: 16 },
                },
                // 3: uLight (vec4<f32> = 16B)
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "uniform", minBindingSize: 16 },
                },

                // 4: verticesIn (read-only storage, vec4 배열)
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage", minBindingSize: 16 },
                },
                // 5: outScreen (storage)
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage", minBindingSize: 16 },
                },
                // 6: outView (storage)
                {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage", minBindingSize: 16 },
                },

                // 7: indices (read-only storage, u32 배열)
                {
                    binding: 7,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage", minBindingSize: 4 },
                },
                // 8: triBright (storage)
                {
                    binding: 8,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage", minBindingSize: 16 },
                },
            ],
        });

        const pl = device.createPipelineLayout({ bindGroupLayouts: [bgl] });

        // 파이프라인 두 개 (각각 다른 entryPoint)
        engine.pipelineV = device.createComputePipeline({
            layout: pl ,
            compute: { module, entryPoint: "vert_transform" },
        });
        engine.pipelineT = device.createComputePipeline({
            layout: pl,
            compute: { module, entryPoint: "tri_lighting" },
        });
        // 참고: compute pass 안에서 setPipeline을 여러 번 호출해 서로 다른 파이프라인을 사용할 수 있음.  [oai_citation:2‡MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/GPUComputePassEncoder/setPipeline?utm_source=chatgpt.com)

        // 고정 크기 uniforms 생성
        engine.modelViewBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: "uModelView",
        });
        engine.projBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: "uProj",
        });
        engine.viewportBuffer = device.createBuffer({
            size: 16, 
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: "uViewport",
        });
        engine.lightBuffer = device.createBuffer({
            size: 16, // vec4<f32>
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: "uLight",
        });

        (engine as any)._bgl = bgl;
        return engine;
    }

    /** 로더가 만든 메쉬 버퍼를 연결하고, 출력 버퍼(outScreen/outView/triBright) 준비 */
    attachMesh(mesh: GpuMeshBuffers) {
        this.vertexBuffer = mesh.vertexBuffer;
        this.indexBuffer = mesh.indexBuffer;
        this.vertexCount = mesh.vertexCount >>> 0;
        this.indexCount = mesh.indexCount >>> 0;

        const triCount = Math.floor(this.indexCount / 3);

        // 출력 버퍼 크기 (모두 vec4 stride 16B로 통일)
        this.outScreenBytes =
            this.vertexCount * 4 * Float32Array.BYTES_PER_ELEMENT;
        this.outViewBytes =
            this.vertexCount * 4 * Float32Array.BYTES_PER_ELEMENT;
        this.triBrightBytes = triCount * 4 * Float32Array.BYTES_PER_ELEMENT;

        // 출력 버퍼 생성 (GPU → CPU 리드백을 위해 COPY_SRC 반드시 포함)
        this.outScreen = this.device.createBuffer({
            size: this.outScreenBytes,
            usage:
                GPUBufferUsage.STORAGE |
                GPUBufferUsage.COPY_SRC |
                GPUBufferUsage.COPY_DST,
            label: "outScreen(vec4)",
        });
        this.outView = this.device.createBuffer({
            size: this.outViewBytes,
            usage:
                GPUBufferUsage.STORAGE |
                GPUBufferUsage.COPY_SRC |
                GPUBufferUsage.COPY_DST,
            label: "outView(vec4)",
        });
        this.triBright = this.device.createBuffer({
            size: this.triBrightBytes,
            usage:
                GPUBufferUsage.STORAGE |
                GPUBufferUsage.COPY_SRC |
                GPUBufferUsage.COPY_DST,
            label: "triBright(vec4)",
        });

        const bgl = (this as any)._bgl as GPUBindGroupLayout;
        this.bindGroup = this.device.createBindGroup({
            layout: bgl,
            entries: [
                { binding: 0, resource: { buffer: this.modelViewBuffer } },
                { binding: 1, resource: { buffer: this.projBuffer } },
                { binding: 2, resource: { buffer: this.viewportBuffer } },
                { binding: 3, resource: { buffer: this.lightBuffer } },

                { binding: 4, resource: { buffer: this.vertexBuffer } },
                { binding: 5, resource: { buffer: this.outScreen } },
                { binding: 6, resource: { buffer: this.outView } },

                { binding: 7, resource: { buffer: this.indexBuffer } },
                { binding: 8, resource: { buffer: this.triBright } },
            ],
        });
    }
    /** 매 프레임 유니폼 업데이트 */
    updateUniforms(
        modelView16: Float32Array,
        proj16: Float32Array,
        width: number,
        height: number,
        light3: Float32Array | [number, number, number]
    ) {
        if (modelView16.length !== 16)
            throw new Error("modelView must be 16 f32");
        if (proj16.length !== 16) throw new Error("proj must be 16 f32");

        // mat4x4<f32> 2개
        this.device.queue.writeBuffer(
            this.modelViewBuffer,
            0,
            modelView16.buffer,
            modelView16.byteOffset,
            64
        );
        this.device.queue.writeBuffer(
            this.projBuffer,
            0,
            proj16.buffer,
            proj16.byteOffset,
            64
        );

        // vec2<u32> (정렬 16B 슬롯이지만 실제 8B만 씀)
        const vp = new Uint32Array([width >>> 0, height >>> 0]);
        this.device.queue.writeBuffer(
            this.viewportBuffer,
            0,
            vp.buffer,
            0,
            vp.byteLength
        );

        // vec4<f32> (L.xyz, 0)
        const L = Array.isArray(light3)
            ? light3
            : [light3[0], light3[1], light3[2]];
        const lv = new Float32Array([L[0], L[1], L[2], 0]);
        this.device.queue.writeBuffer(
            this.lightBuffer,
            0,
            lv.buffer,
            0,
            lv.byteLength
        );
    }
    /**
     * compute 디스패치 2개 실행:
     *  - Pass V: 정점 변환 → outScreen/outView
     *  - Pass T: 삼각형 밝기  → triBright
     * outScreen/triBright를 CPU로 readback.
     */
    async runAndRead(): Promise<{
        outScreen: Float32Array;
        triBright: Float32Array;
    }> {
        if (!this.bindGroup)
            throw new Error("BindGroup not ready. Call attachMesh() first.");
        if (this.vertexCount === 0 || this.indexCount < 3) {
            return {
                outScreen: new Float32Array(0),
                triBright: new Float32Array(0),
            };
        }

        const triCount = Math.floor(this.indexCount / 3);

        const enc = this.device.createCommandEncoder({
            label: "mvp+light-encoder",
        });
        const cpass = enc.beginComputePass({ label: "mvp+light-pass" });

        // Pass V: per-vertex transform
        cpass.setPipeline(this.pipelineV);
        cpass.setBindGroup(0, this.bindGroup);
        cpass.dispatchWorkgroups(Math.ceil(this.vertexCount / WG_SIZE));

        // Pass T: per-triangle lighting
        cpass.setPipeline(this.pipelineT);
        cpass.setBindGroup(0, this.bindGroup);
        cpass.dispatchWorkgroups(Math.ceil(triCount / WG_SIZE));

        cpass.end();

        // staging 버퍼 2개 (MAP_READ)
        const stagingScreen = this.device.createBuffer({
            size: this.outScreenBytes,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
            label: "staging-outScreen",
        });
        const stagingBright = this.device.createBuffer({
            size: this.triBrightBytes,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
            label: "staging-triBright",
        });

        // GPU → staging 복사
        enc.copyBufferToBuffer(
            this.outScreen,
            0,
            stagingScreen,
            0,
            this.outScreenBytes
        );
        enc.copyBufferToBuffer(
            this.triBright,
            0,
            stagingBright,
            0,
            this.triBrightBytes
        );

        this.device.queue.submit([enc.finish()]);

        // 완료 대기 후 매핑해서 읽기
        await stagingScreen.mapAsync(GPUMapMode.READ, 0, this.outScreenBytes);
        await stagingBright.mapAsync(GPUMapMode.READ, 0, this.triBrightBytes);

        const s0 = stagingScreen
            .getMappedRange(0, this.outScreenBytes)
            .slice(0);
        const s1 = stagingBright
            .getMappedRange(0, this.triBrightBytes)
            .slice(0);

        stagingScreen.unmap();
        stagingBright.unmap();

        return {
            outScreen: new Float32Array(s0), // [sx, sy, depth01, _] * vertexCount
            triBright: new Float32Array(s1), // [b, 0, 0, 0]       * triCount
        };
    }
}
