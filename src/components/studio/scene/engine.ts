// The studio scene: one lit squares board. Ported from the approved version 4 mockup.
// progress: 0 squares, 1 ball diamond, 2 empty board, 2.6 claimed, 3 winner.
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  DynamicDrawUsage,
  Euler,
  ExtrudeGeometry,
  FloatType,
  FrontSide,
  Group,
  HalfFloatType,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  NeutralToneMapping,
  NoBlending,
  OrthographicCamera,
  Path,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  RedFormat,
  Scene,
  ShaderMaterial,
  Shape,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

import type { SceneBoard, SceneFrame } from './boards';

export interface SceneEngine {
  /** Takes a new board and goes to the current progress. */
  update: (board: SceneBoard | null) => void;
  dispose: () => void;
}

interface SceneOptions {
  /** The canvas is added here and fills it. */
  parent: HTMLElement;
  progress: () => number;
  board: SceneBoard | null;
  onProgress: (value: number) => void;
  /** The first picture worth showing: settled, or already moving. */
  onReady: () => void;
  /** The browser took the GPU away. */
  onLost: () => void;
}

const { clamp, degToRad, lerp, smoothstep } = MathUtils;
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const seg = (t: number, a: number, b: number) => ease(clamp((t - a) / (b - a), 0, 1));

/* ---------- The board: which squares are claimed, which one wins ---------- */
const N = 10;
// x = claimed
const MAP = [
  '..xx......',
  '..xx......',
  '......xx..',
  '.......x..',
  '.x........',
  '.xx..x....',
  '.x..xxx...',
  '.....x..x.',
  '........x.',
  '..xx......',
];
const WIN = [6, 6]; // row, column
const WIN2 = [4, 4];
const FIRST = [0, 0]; // after the turn, home is nearest the camera and first is on the right
const PARK = [2.7, -7.2]; // where the lime square waits on the floor
const OPEN_Y = -0.03;
const CLAIM_Y = 0.6;
const BODY = 1.5;
const SLAB = 0.95;
const LIME_H = 0.56;

const LOOK = {
  tile: '#eeeeed',
  slab: '#e8e9e9',
  field: '#b9bcbc',
  lime: '#8fe52f',
  rough: 0.66,
  keyPos: [-9.5, 6.9, -4.2] as const,
  keyColor: '#fffefb',
  keyPower: 4.1,
  keySpread: 0.75,
  env: 0.4,
  floorShadow: 0.52,
  tint: '#2c2b2a',
};

const LENS = 0.16;
const FOV = 30;
const WIDE: SceneFrame[] = [
  { az: 0, el: 40, d: 19.6, spin: -33, x: 0.285, y: 0.16 },
  { az: 0, el: 41, d: 25, spin: -135, x: -0.17, y: -0.015 },
  { az: 0, el: 43, d: 25.5, spin: -203, x: 0.25, y: -0.03 },
];
const PHONE: SceneFrame[] = [
  { az: 0, el: 46, d: 43, spin: -33, x: 0.3, y: 0.045 },
  { az: 0, el: 44, d: 60, spin: -135, x: -0.03, y: 0.02 },
  { az: 0, el: 46, d: 48, spin: -203, x: 0.12, y: 0.15 },
];

// Steady pseudo-random numbers around 0, so the board looks set by hand and never changes.
const jitter = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s) - 0.5;
};

const place = ([row, col]: readonly number[]) => [col - 4.5, row - 4.5];

const roundedSquare = <T extends Path>(path: T, h: number, r: number): T => {
  path.moveTo(-h + r, -h);
  path.lineTo(h - r, -h);
  path.quadraticCurveTo(h, -h, h, -h + r);
  path.lineTo(h, h - r);
  path.quadraticCurveTo(h, h, h - r, h);
  path.lineTo(-h + r, h);
  path.quadraticCurveTo(-h, h, -h, h - r);
  path.lineTo(-h, -h + r);
  path.quadraticCurveTo(-h, -h, -h + r, -h);
  return path;
};

const CELLS = Array.from({ length: N * N }, (_, i) => {
  const r = Math.floor(i / N);
  const c = i % N;
  const edge = r === 0 || c === 0 || r === N - 1 || c === N - 1;
  const corner = (r === 0 || r === N - 1) && (c === 0 || c === N - 1);
  const mound = (r === 4 || r === 5) && (c === 4 || c === 5);
  const raised = CLAIM_Y + jitter(i, 3) * 0.02;
  const open = OPEN_Y + jitter(i, 4) * 0.012;
  return {
    i,
    r,
    c,
    edge,
    mound,
    raised,
    open,
    squares: MAP[r][c] === 'x' || (r === WIN[0] && c === WIN[1]) ? raised : open,
    diamond: corner ? 0.4 : edge ? 0 : mound ? -0.2 : -0.34,
    claimed: (r === WIN2[0] && c === WIN2[1]) || jitter(i, 9) < -0.1 ? raised : open,
    wait: Math.hypot(r - WIN[0], c - WIN[1]) / 13,
    order: Math.hypot(r - 9, c - 7) / 12,
  };
});

/** Builds the scene and starts drawing. Throws when WebGL can't start. */
export function createSceneEngine({ parent, progress, board, onProgress, onReady, onLost }: SceneOptions): SceneEngine {
  let custom = board;
  let W = 0;
  let H = 0;
  // A canvas of its own: once a context is thrown away, its canvas can't be used again.
  const canvas = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  parent.append(canvas);

  const isPhone = () => W < 700 || W / H < 0.85;
  const small = Math.min(innerWidth, screen.width) < 700;
  const rubbish: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(thing: T): T => {
    rubbish.push(thing);
    return thing;
  };

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(0, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 160);
  const slabGroup = new Group();
  scene.add(slabGroup);

  /* Soft room light: one large softbox overhead and a dim surround, no files */
  {
    const room = new Scene();
    const walls: Mesh<BoxGeometry, MeshBasicMaterial>[] = [];
    const add = (w: number, h: number, d: number, x: number, y: number, z: number, v: number) => {
      const wall = new Mesh(new BoxGeometry(w, h, d), new MeshBasicMaterial({ color: new Color(v, v, v) }));
      wall.position.set(x, y, z);
      room.add(wall);
      walls.push(wall);
    };
    const dim = 0.72;
    add(40, 0.2, 40, 0, 14, 0, 1.05);
    add(40, 0.2, 40, 0, -6, 0, dim * 0.75);
    add(0.2, 24, 40, -18, 4, 0, dim * 1.5);
    add(0.2, 24, 40, 18, 4, 0, dim * 0.55);
    add(40, 24, 0.2, 0, 4, -18, dim * 1.25);
    add(40, 24, 0.2, 0, 4, 18, dim * 0.5);
    add(16, 0.2, 12, -6, 13.5, -5, 5);
    const generator = new PMREMGenerator(renderer);
    scene.environment = keep(generator.fromScene(room, 0.05, 0.1, 60)).texture;
    scene.environmentIntensity = LOOK.env;
    generator.dispose();
    for (const wall of walls) {
      wall.geometry.dispose();
      wall.material.dispose();
    }
  }

  /* One key light, sampled as several points on its face so shadows soften with distance */
  const COUNT = small ? 4 : 7;
  const keyPos = new Vector3(...LOOK.keyPos);
  const keySide = new Vector3().crossVectors(keyPos, new Vector3(0, 1, 0)).normalize();
  const keyUp = new Vector3().crossVectors(keySide, keyPos).normalize();
  const lights = Array.from({ length: COUNT }, () => {
    const light = keep(new DirectionalLight(LOOK.keyColor, LOOK.keyPower / COUNT));
    scene.add(light.target);
    light.castShadow = true;
    light.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    light.shadow.radius = 2.2;
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.035;
    const view = light.shadow.camera;
    view.left = -10;
    view.right = 10;
    view.top = 9;
    view.bottom = -9;
    view.near = 2;
    view.far = 32;
    view.updateProjectionMatrix();
    scene.add(light);
    return light;
  });
  const aim = (turn: number) =>
    lights.forEach((light, i) => {
      const r = LOOK.keySpread * Math.sqrt(((i + 0.5 + turn * 0.754877) % COUNT) / COUNT);
      const a = (i + turn * 0.56984 * COUNT) * 2.39996;
      light.position
        .copy(keyPos)
        .addScaledVector(keySide, Math.cos(a) * r)
        .addScaledVector(keyUp, Math.sin(a) * r);
    });

  /* Heights, shared with the material so corners and gaps darken as they would in a room */
  const heights = new Float32Array(N * N);
  const heightMap = keep(new DataTexture(heights, N, N, RedFormat, FloatType));
  heightMap.minFilter = heightMap.magFilter = NearestFilter;
  const limePos = { value: new Vector3() };
  const boardInverse = { value: new Matrix4() };
  const withOcclusion = (material: MeshStandardMaterial, strength: number) => {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, { uH: { value: heightMap }, uInv: boardInverse, uLime: limePos });
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
        uniform mat4 uInv; varying vec3 vB; varying vec3 vBn;`
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
        vec4 bp = vec4(transformed, 1.0); vec3 bn = objectNormal;
        #ifdef USE_INSTANCING
          bp = instanceMatrix * bp; bn = mat3(instanceMatrix) * bn;
        #endif
        bp = modelMatrix * bp; vB = (uInv * bp).xyz; vBn = mat3(uInv) * mat3(modelMatrix) * bn;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
        uniform sampler2D uH; uniform vec3 uLime; varying vec3 vB; varying vec3 vBn;
        float hAt(vec2 c){ if(c.x<0.||c.y<0.||c.x>9.||c.y>9.) return 0.0; return texture2D(uH,(c+.5)/10.).r; }
        float boardAO(){
          vec2 g = vB.xz + 5.0; vec2 c = floor(g); float occ = 0.0;
          vec3 n = normalize(vBn);
          if(max(abs(vB.x),abs(vB.z))<5.25 || n.y>.4) for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
            if(i==0&&j==0) continue;
            vec2 cc = c + vec2(float(i),float(j));
            float rise = hAt(cc) - vB.y;
            if(rise<=0.0) continue;
            vec2 d = abs(g - (cc+.5)) - .483; float dist = length(max(d,0.0));
            vec2 dir = (cc+.5) - g; float facing = mix(1.0, clamp(dot(normalize(vec3(dir.x,0.0,dir.y)), n)+.55,0.0,1.0), clamp(1.0-n.y,0.0,1.0));
            float s = rise/(rise+dist*1.6+.05)*(1.0-smoothstep(.25,.95,dist));
            occ = 1.0-(1.0-occ)*(1.0-s*.38*facing);
          }
          { vec2 ld = abs(vB.xz-uLime.xz)-.45; float l = length(max(ld,0.0)); float bot = uLime.y-.28;
            float gap = max(bot-vB.y,0.0); float side = clamp((bot+.56-vB.y)/.56,0.0,1.0);
            float s = (vB.y<bot+.02) ? exp(-gap*1.6)*exp(-l*5.0)*.75 : side*.45*exp(-l*5.0);
            occ = 1.0-(1.0-occ)*(1.0-s); }
          return 1.0-occ*${strength.toFixed(2)};
        }`
        )
        .replace(
          '#include <aomap_fragment>',
          `float bAO = boardAO();
        reflectedLight.indirectDiffuse *= bAO; reflectedLight.indirectSpecular *= bAO*bAO;
        reflectedLight.directDiffuse *= mix(1.0,bAO,.35);`
        );
    };
    return material;
  };

  /* Slab */
  const outline = roundedSquare(new Shape(), 5.42, 0.34);
  outline.holes.push(roundedSquare(new Path(), 5.1, 0.16));
  const slabMaterial = keep(withOcclusion(new MeshStandardMaterial({ color: LOOK.slab, roughness: 0.72 }), 0.95));
  const slabGeometry = keep(
    new ExtrudeGeometry(outline, {
      depth: SLAB - 0.16,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 5,
      curveSegments: 10,
    })
  );
  slabGeometry.rotateX(Math.PI / 2);
  slabGeometry.translate(0, -0.08, 0);
  const slab = new Mesh(slabGeometry, slabMaterial);
  const bed = new Mesh(keep(new BoxGeometry(10.3, 0.06, 10.3)), slabMaterial);
  bed.position.y = -0.62;
  for (const part of [slab, bed]) {
    part.castShadow = part.receiveShadow = true;
    slabGroup.add(part);
  }

  /* Tiles */
  const tileMaterial = keep(withOcclusion(new MeshStandardMaterial({ color: '#ffffff', roughness: LOOK.rough }), 0.82));
  const tileGeometry = keep(new RoundedBoxGeometry(0.966, BODY, 0.966, small ? 3 : 5, 0.075));
  const tiles = keep(new InstancedMesh(tileGeometry, tileMaterial, N * N));
  tiles.instanceMatrix.setUsage(DynamicDrawUsage);
  const tileColors = new InstancedBufferAttribute(new Float32Array(N * N * 3), 3);
  tiles.instanceColor = tileColors;
  tiles.castShadow = tiles.receiveShadow = true;
  tiles.frustumCulled = false;
  slabGroup.add(tiles);

  const limeMaterial = keep(new MeshStandardMaterial({ color: LOOK.lime, roughness: 0.55 }));
  const lime = new Mesh(keep(new RoundedBoxGeometry(0.966, LIME_H, 0.966, 5, 0.075)), limeMaterial);
  lime.castShadow = lime.receiveShadow = true;
  slabGroup.add(lime);

  // Keeps shadows touching what casts them.
  for (const material of [tileMaterial, slabMaterial, limeMaterial]) material.shadowSide = FrontSide;

  /* Floor: only its shadows are drawn, over the page's own color */
  const contactOn = { value: 1 };
  const floorMaterial = keep(new MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true }));
  floorMaterial.envMapIntensity = 0;
  floorMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uInv: boardInverse,
      uFull: { value: (LOOK.keyPower * (keyPos.y / keyPos.length())) / Math.PI },
      uContact: contactOn,
      uTint: { value: new Color(LOOK.tint) },
      uMax: { value: LOOK.floorShadow },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uInv; varying vec2 vF;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvec4 wq = modelMatrix*vec4(transformed,1.); vF=(uInv*wq).xz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
      uniform float uFull,uMax,uContact; uniform vec3 uTint; varying vec2 vF;
      float box(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
      float contactShade(){ float d = max(box(vF, vec2(5.5), .4),0.); return uContact*(.6*exp(-d*3.4)+.16*exp(-d*1.1)); }`
      )
      .replace(
        '#include <opaque_fragment>',
        `
        float lit = dot(reflectedLight.directDiffuse, vec3(.2126,.7152,.0722))/(uFull*.95);
        float sh = 1.-clamp(lit,0.,1.);
        float a = 1.-(1.-sh*uMax)*(1.-contactShade()*.62);
        gl_FragColor = vec4(uTint, a);`
      );
  };
  const floor = new Mesh(keep(new PlaneGeometry(120, 120)), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -SLAB;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ---------- Pose for a moment t ---------- */
  const tileColor = new Color(LOOK.tile);
  const fieldColor = new Color(LOOK.field);
  const color = new Color();
  const matrix = new Matrix4();
  const turn = new Quaternion();
  const euler = new Euler();
  const v = new Vector3();
  const one = new Vector3(1, 1, 1);

  const pose = (t: number) => {
    const claimed = custom && new Set(custom.claimed);
    for (const cell of CELLS) {
      const h = seg(t, 0.06 + cell.wait * 0.42, 0.5 + cell.wait * 0.42);
      const h2 = seg(t - 1, 0.1 + cell.wait * 0.3, 0.6 + cell.wait * 0.3);
      const h3 = seg(t - 2, 0.1 + cell.order * 0.3, 0.24 + cell.order * 0.3);
      const story =
        h3 > 0
          ? lerp(cell.open, cell.claimed, h3)
          : h2 > 0
            ? lerp(cell.diamond, cell.open, h2)
            : lerp(cell.squares, cell.diamond, h);
      const y = claimed ? (claimed.has(cell.i) ? cell.raised : cell.open) : story;
      const tilt = 1 - h * (1 - h2);
      heights[cell.i] = y;
      euler.set(jitter(cell.i, 1) * 0.02 * tilt, jitter(cell.i, 2) * 0.03, jitter(cell.i, 5) * 0.02 * tilt);
      matrix.compose(v.set(cell.c - 4.5, y - BODY / 2, cell.r - 4.5), turn.setFromEuler(euler), one);
      tiles.setMatrixAt(cell.i, matrix);
      color.copy(tileColor);
      if (!cell.edge) color.lerp(fieldColor, h * (1 - h2) * (cell.mound ? 0.35 : 1));
      color.multiplyScalar(1 + jitter(cell.i, 6) * 0.03);
      tiles.setColorAt(cell.i, color);
    }

    // The lime square leaves the board and becomes the runner on first. It rests on whatever is under it.
    const go = seg(t, 0.3, 0.9);
    const [x0, z0] = place(WIN);
    const [x1, z1] = place(FIRST);
    const lx = lerp(x0, x1, go);
    const lz = lerp(z0, z1, go);
    let base = -0.4;
    for (const cell of CELLS) {
      const gap = Math.max(Math.abs(cell.c - 4.5 - lx), Math.abs(cell.r - 4.5 - lz)) - 0.96;
      const weight = 1 - smoothstep(gap, 0, 0.3);
      if (weight > 0) base = Math.max(base, lerp(-0.4, heights[cell.i], weight));
    }
    lime.position.set(lx, base + LIME_H / 2 + 0.002, lz);
    lime.rotation.set(0, lerp(0.09, 0, go) + (go * Math.PI) / 2, 0);
    if (t > 1) {
      // Off to the floor while the board empties, then up onto the winning square.
      const off = seg(t - 1, 0.12, 0.72);
      const on = seg(t - 2, 0.62, 0.92);
      const [x2, z2] = place(WIN2);
      const FLOOR = -SLAB + LIME_H / 2 + 0.002;
      const TOP = CLAIM_Y + LIME_H / 2 + 0.012;
      const p = lime.position;
      if (on > 0) {
        p.set(lerp(PARK[0], x2, on), lerp(FLOOR, TOP, on) + Math.sin(on * Math.PI) * 1.9, lerp(PARK[1], z2, on));
      } else {
        p.set(lerp(p.x, PARK[0], off), lerp(p.y, FLOOR, off) + Math.sin(off * Math.PI) * 1.5, lerp(p.z, PARK[1], off));
      }
      lime.rotation.y = Math.PI / 2 + lerp(lerp(0, 0.5, off), 0.07, on);
    }

    const solo = !!custom?.solo;
    lime.visible = !custom || !!custom.winner;
    slab.visible = bed.visible = !solo;
    tiles.count = solo ? 1 : N * N;
    contactOn.value = solo ? 0 : 1;
    if (solo) {
      heights.fill(-9);
      matrix.compose(v.set(0, -SLAB + 0.36, 0), turn.setFromEuler(euler.set(0, 0.02, 0)), new Vector3(1, 0.48, 1));
      tiles.setMatrixAt(0, matrix);
      lime.position.set(0.02, -SLAB + 0.72 + LIME_H / 2, 0.02);
    } else if (custom?.winner) {
      const [x, z] = place(custom.winner);
      lime.position.set(x, CLAIM_Y + LIME_H / 2 + 0.012, z);
      lime.rotation.y = 0.07;
    } else if (custom) {
      lime.position.set(0, 0.5, 0); // not drawn, but the lens still focuses here
    }
    limePos.value.copy(lime.position);
    if (!lime.visible) limePos.value.y = 99;
    tiles.instanceMatrix.needsUpdate = tileColors.needsUpdate = heightMap.needsUpdate = true;
  };

  /* ---------- Camera ---------- */
  const baseProjection = new Matrix4();
  const basePosition = new Vector3();
  const aimCamera = (t: number) => {
    const phone = isPhone();
    const set = phone ? PHONE : WIDE;
    const g = ease(t <= 1 ? t : clamp((t - 1) / 0.92, 0, 1));
    const [from, to] = t <= 1 ? set : [set[1], set[2]];
    const own = custom && (phone ? (custom.phoneFrame ?? custom.frame) : custom.frame);
    const mix = (key: keyof SceneFrame) => (own ? own[key] : lerp(from[key], to[key], g));
    const az = degToRad(mix('az'));
    const el = degToRad(mix('el'));
    // Hold the object's width steady on odd screen shapes; on short phones, lower and smaller.
    const aspect = W / H;
    const ref = phone ? 390 / 844 : 1440 / 900;
    const short = phone && !custom && t < 1 ? clamp((aspect - 0.5) / 0.14, 0, 1) : 0;
    const d = mix('d') * (1 + short * 0.2 * (1 - g)) * (aspect < ref ? ref / aspect : 1);
    camera.position.set(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(0, 0, 0);
    camera.aspect = aspect;
    const dx = -(mix('x') + short * (1 - g) * 0.06) * W;
    const dy = -(mix('y') + short * (1 - g) * 0.005) * H;
    camera.setViewOffset(W, H, dx, dy, W, H);
    camera.updateProjectionMatrix();
    baseProjection.copy(camera.projectionMatrix);
    basePosition.copy(camera.position);
    camera.updateMatrixWorld();
    slabGroup.rotation.y = degToRad(mix('spin'));
    slabGroup.updateMatrixWorld();
    boardInverse.value.copy(slabGroup.matrixWorld).invert();
  };

  /* Every frame goes through the same two passes. At rest, frames are averaged: the light, the lens and the
     pixel grid are sampled again each time, so shadows, focus and edges settle like a long exposure. */
  const frameTarget = keep(
    new WebGLRenderTarget(4, 4, { type: HalfFloatType, samples: 4, minFilter: LinearFilter, magFilter: LinearFilter })
  );
  const sumTarget = keep(new WebGLRenderTarget(4, 4, { type: HalfFloatType, depthBuffer: false }));
  const flatCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new Scene();
  const vertexShader = 'varying vec2 u; void main(){ u = uv; gl_Position = vec4(position.xy,0.,1.); }';
  const addMaterial = keep(
    new ShaderMaterial({
      vertexShader,
      fragmentShader:
        'uniform sampler2D t; varying vec2 u; void main(){ gl_FragColor = min(texture2D(t,u),vec4(40.)); }',
      uniforms: { t: { value: frameTarget.texture } },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      toneMapped: false,
      premultipliedAlpha: true,
      blending: AdditiveBlending,
    })
  );
  const outMaterial = keep(
    new ShaderMaterial({
      vertexShader,
      fragmentShader: `uniform sampler2D t; uniform float n; varying vec2 u;
    void main(){ vec4 c = texture2D(t,u)/n; float a = clamp(c.a,0.,1.); gl_FragColor = vec4(c.rgb/max(a,1e-4),a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float g = fract(52.9829189*fract(dot(gl_FragCoord.xy, vec2(.06711056,.00583715))))-.5;
      gl_FragColor.rgb = gl_FragColor.rgb*a + g/255.; gl_FragColor.a = a + g/255.; }`,
      uniforms: { t: { value: sumTarget.texture }, n: { value: 1 } },
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
    })
  );
  const quad = new Mesh<PlaneGeometry, ShaderMaterial>(keep(new PlaneGeometry(2, 2)), addMaterial);
  quad.frustumCulled = false;
  quadScene.add(quad);

  const REST = small ? 20 : 40;
  const right = new Vector3();
  const upward = new Vector3();
  const focus = new Vector3();
  let exposures = 0;
  const expose = () => {
    aim(exposures);
    camera.projectionMatrix.copy(baseProjection);
    camera.position.copy(basePosition);
    if (exposures > 0) {
      const angle = exposures * 2.39996;
      const radius = LENS * Math.sqrt((exposures - 0.5) / REST);
      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * radius;
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      upward.setFromMatrixColumn(camera.matrixWorld, 1);
      focus.copy(lime.position).applyMatrix4(slabGroup.matrixWorld).sub(basePosition);
      const distance = focus.dot(v.setFromMatrixColumn(camera.matrixWorld, 2).negate());
      camera.position.addScaledVector(right, ox).addScaledVector(upward, oy);
      const e = camera.projectionMatrix.elements;
      e[8] += (-e[0] * ox) / distance + ((((exposures * 0.754877) % 1) - 0.5) * 2) / frameTarget.width;
      e[9] += (-e[5] * oy) / distance + ((((exposures * 0.56984) % 1) - 0.5) * 2) / frameTarget.height;
    }
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    renderer.autoClear = true;
    renderer.setRenderTarget(frameTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(sumTarget);
    renderer.autoClear = exposures === 0;
    quad.material = addMaterial;
    renderer.render(quadScene, flatCamera);
    exposures++;
    renderer.autoClear = true;
    renderer.setRenderTarget(null);
    outMaterial.uniforms.n.value = exposures;
    quad.material = outMaterial;
    renderer.render(quadScene, flatCamera);
  };

  let cap = small ? 1.75 : 2;
  let slow = 0;
  let sized = false;
  const size = () => {
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    if (sized && width === W && height === H) return;
    sized = true;
    W = width;
    H = height;
    const ratio = Math.min(devicePixelRatio || 1, cap);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    frameTarget.setSize(Math.round(width * ratio), Math.round(height * ratio));
    sumTarget.setSize(Math.round(width * ratio), Math.round(height * ratio));
  };

  /* ---------- Only draws when something changed, the canvas is on screen and the tab is showing ---------- */
  let shown = -1;
  let raf = 0;
  let last = 0;
  let onScreen = true;
  let ready = false;
  let stale = true;
  const tick = (now: number) => {
    raf = 0;
    if (document.hidden || !onScreen || parent.clientWidth === 0 || parent.clientHeight === 0) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const goal = progress();
    const was = shown;
    shown = shown < 0 ? goal : lerp(shown, goal, 1 - Math.exp(-dt * 7));
    if (Math.abs(goal - shown) < 0.0004) shown = goal;
    const moved = was !== shown || stale;
    // A slow device gets fewer pixels while it moves, never fewer frames.
    slow = moved && dt > 0.024 ? slow + 1 : 0;
    if (slow > 10 && cap > 1) {
      cap = Math.max(1, cap * 0.75);
      slow = 0;
      sized = false;
    }
    if (moved) {
      stale = false;
      size();
      pose(shown);
      aimCamera(shown);
      exposures = 0;
      expose();
      onProgress(shown);
    } else if (exposures < REST) {
      expose();
    }
    if (!ready && (exposures >= REST || (was >= 0 && was !== shown))) {
      ready = true;
      onReady();
    }
    if (shown !== goal || exposures < REST) wake();
  };
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const redraw = () => {
    stale = true;
    sized = false;
    wake();
  };

  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) wake();
  });
  visibility.observe(parent);
  const sizes = new ResizeObserver(redraw);
  sizes.observe(parent);
  const handleLost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  addEventListener('scroll', wake, { passive: true });
  document.addEventListener('visibilitychange', wake);
  canvas.addEventListener('webglcontextlost', handleLost);
  wake();

  return {
    update: (next) => {
      if (next !== custom) {
        custom = next;
        stale = true;
      }
      wake();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      raf = -1; // wake() does nothing from here on
      visibility.disconnect();
      sizes.disconnect();
      removeEventListener('scroll', wake);
      document.removeEventListener('visibilitychange', wake);
      canvas.removeEventListener('webglcontextlost', handleLost);
      for (const thing of rubbish) thing.dispose();
      renderer.dispose();
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
