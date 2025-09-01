// mvp_light.wgsl (기존 mvp_transform를 확장)

// ── Uniforms ─────────────────────────────────────────────
@group(0) @binding(0) var<uniform> uModelView : mat4x4<f32>; // 64B
@group(0) @binding(1) var<uniform> uProj      : mat4x4<f32>; // 64B
@group(0) @binding(2) var<uniform> uViewport  : vec2<u32>;   // 16B 슬롯 권장
@group(0) @binding(3) var<uniform> uLight     : vec4<f32>;   // (L.xyz, pad) 16B 정렬

// ── Storage buffers (runtime arrays must be last member) ─
struct VertBuf { data: array<vec4<f32>>, };  // 입력 정점: vec4(x,y,z,1)
struct OutBuf  { data: array<vec4<f32>>, };  // 출력:   vec4(...)
struct IdxBuf  { data: array<u32>, }; // 인덱스: 3개 = 1 tri

@group(0) @binding(4) var<storage, read>        verticesIn : VertBuf;
@group(0) @binding(5) var<storage, read_write>  outScreen  : OutBuf; // per-vertex: vec4(sx,sy,depth,0)
@group(0) @binding(6) var<storage, read_write>  outView    : OutBuf; // per-vertex: vec4(vx,vy,vz,1)

@group(0) @binding(7) var<storage, read>        indices    : IdxBuf; // u32 * (3 * triCount)
@group(0) @binding(8) var<storage, read_write>  triBright  : OutBuf; // per-tri: vec4(brightness,0,0,0)

// ── Helpers ──────────────────────────────────────────────
fn ndc_to_screen(ndc_xy: vec2<f32>, viewport: vec2<u32>) -> vec2<f32> {
  let vp = vec2<f32>(viewport);
  let uv = ndc_xy * 0.5 + 0.5;
  return vec2<f32>(uv.x * vp.x, (1.0 - uv.y) * vp.y); 
}

// ── Pass V: 정점 변환 (per-vertex) ───────────────────────
@compute @workgroup_size(256)
fn vert_transform(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  let vcount = arrayLength(&verticesIn.data);
  if (i >= vcount) { return; }

  let p4 = verticesIn.data[i];

  // view-space
  let v4 = uModelView * p4;
  outView.data[i] = v4;

  // clip -> ndc -> screen
  let clip = uProj * v4;
  let w = select(clip.w, 1e-8, clip.w == 0.0);
  let ndc = clip.xyz / w;

  let screen = ndc_to_screen(ndc.xy, uViewport);
  let depth01 = ndc.z * 0.5 + 0.5;

  outScreen.data[i] = vec4<f32>(screen, depth01, 0.0);
}

// ── Pass T: 삼각형 라이트 (Lambert, per-triangle) ────────
@compute @workgroup_size(256)
fn tri_lighting(@builtin(global_invocation_id) gid: vec3<u32>) {
  let tri = gid.x;
  let icount = arrayLength(&indices.data);
  let triCount = icount / 3u;
  if (tri >= triCount) { return; }

  let i0 = indices.data[3u*tri + 0u];
  let i1 = indices.data[3u*tri + 1u];
  let i2 = indices.data[3u*tri + 2u];

  // view-space positions (정렬 안정 위해 vec4 stride 16B 사용)
  let p1 = outView.data[i0].xyz;
  let p2 = outView.data[i1].xyz;
  let p3 = outView.data[i2].xyz;

  let N = normalize(cross(p2 - p1, p3 - p1));
  let L = normalize(uLight.xyz);

  let b = max(0.0, dot(N, L)); // Lambert
  triBright.data[tri] = vec4<f32>(b, 0.0, 0.0, 0.0);
}