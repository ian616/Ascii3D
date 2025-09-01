export type GpuMeshBuffers = {
    vertexBuffer: GPUBuffer; // positions: vec4<f32> [x,y,z,1]
    indexBuffer: GPUBuffer; // indices: u32 (0-based)
    vertexCount: number;
    indexCount: number;
    indexArray: Uint32Array; 
};

type ObjArrays = {
    positionsV3: number[]; // x,y,z
    indices: number[]; // 0-based triangle indices
};

function createBuffer(
    device: GPUDevice,
    data: ArrayBufferView,
    usage: GPUBufferUsageFlags,
    label?: string
) {
    const buffer = device.createBuffer({
        label,
        size: (data.byteLength + 3) & ~3, // 4Byte 단위로 정렬
        usage,
        mappedAtCreation: false,
    });
    // gpu 명령 queue에 복사 명령 등록(submit때 실제 복사 실행)
    device.queue.writeBuffer(
        buffer,
        0,
        data.buffer,
        data.byteOffset,
        data.byteLength
    );
    return buffer;
}

function parseObj(objText: string): ObjArrays {
    const positionsV3: number[] = [];
    const indices: number[] = [];

    const lines = objText.split(/\r?\n/);
    for (const line of lines) {
        const s = line.trim();
        if (!s || s.startsWith("#")) continue;

        const parts = s.split(/\s+/);
        const tag = parts[0];

        if (tag === "v") {
            // v x y z [w]
            positionsV3.push(+parts[1], +parts[2], +parts[3]);
        } else if (tag === "f") {
            if (parts.length !== 4) throw new Error("Only triangular faces are supported");
            const a = parseInt(parts[1], 10) - 1;
            const b = parseInt(parts[2], 10) - 1;
            const c = parseInt(parts[3], 10) - 1;
            indices.push(a, b, c);
        }
    }

    return { positionsV3, indices };
}

/** OBJ를 불러 GPUBuffer로 변환 (positions는 vec4 패딩)
 *  - positions: Float32Array [x,y,z,1] * N
 *  - indices  : Uint32Array (0-based)
 */
export async function loadObjToGpuBuffers(
    device: GPUDevice,
    url: string,
    labels?: { vertex?: string; index?: string }
): Promise<GpuMeshBuffers> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch OBJ: ${url}`);
    const objText = await res.text();

    const { positionsV3, indices } = parseObj(objText);
    const vertexCount = positionsV3.length / 3;

    // homogeneous(vec4)로 패딩: [x,y,z,1]
    const positionsV4 = new Float32Array(vertexCount * 4);
    for (let i = 0, j = 0; i < positionsV3.length; i += 3, j += 4) {
        positionsV4[j + 0] = positionsV3[i + 0];
        positionsV4[j + 1] = positionsV3[i + 1];
        positionsV4[j + 2] = positionsV3[i + 2];
        positionsV4[j + 3] = 1.0;
    }

    const indexArray = new Uint32Array(indices);

    const vertexBuffer = createBuffer(
        device,
        positionsV4,
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        labels?.vertex ?? "vertices(vec4)"
    );

    const indexBuffer = createBuffer(
        device,
        indexArray,
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        labels?.index ?? "indices(u32)"
    );

    return {
        vertexBuffer,
        indexBuffer,
        vertexCount,
        indexCount: indexArray.length,
        indexArray
    };
}
