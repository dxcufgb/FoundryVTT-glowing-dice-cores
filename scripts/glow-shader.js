/**
 * The glowing core, injected into the three.js material Dice So Nice builds for each die.
 * Vertex: passes the object-space position and the camera position in object space.
 * Fragment: ray-marches a small light volume inside the die (gcVolume), darkens the die body but not its numbers
 * (gcLabel, from the face texture compared with the colourset's background and label colours), adds the glow and a
 * rim light to the emissive light, and adds them to Dice So Nice's bloom pass when realistic lighting is on.
 * No three.js import is needed: uniforms are plain {value} objects; colours are {r, g, b}.
 */

const VERTEX_HEAD = /* glsl */`
varying vec3 gcObjPos;
varying vec3 gcObjCam;
varying vec3 gcViewDir;
`;

const VERTEX_BODY = /* glsl */`
gcObjPos = position;
gcObjCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
gcViewDir = -mvPosition.xyz;
`;

const FRAGMENT_HEAD = /* glsl */`
uniform float gcTime, gcIntensity, gcCore, gcSpeed, gcRim, gcPulse, gcR, gcPattern, gcSeed, gcDark, gcBloom;
uniform vec3 gcC1, gcC2, gcBg, gcFg;
varying vec3 gcObjPos;
varying vec3 gcObjCam;
varying vec3 gcViewDir;
float gcPLS;

float gcHash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float gcNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(gcHash(i),gcHash(i+vec3(1,0,0)),f.x), mix(gcHash(i+vec3(0,1,0)),gcHash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(gcHash(i+vec3(0,0,1)),gcHash(i+vec3(1,0,1)),f.x), mix(gcHash(i+vec3(0,1,1)),gcHash(i+vec3(1,1,1)),f.x),f.y), f.z);
}
float gcFbm(vec3 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*gcNoise(p); p = p*2.03 + vec3(1.7,9.2,3.1); a *= 0.5; } return s; }
mat2 gcRot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }

float gcPulseF(float t){
  if(gcPulse < 0.5) return 1.0;
  if(gcPulse < 1.5) return 0.72 + 0.28*sin(t*1.7);
  if(gcPulse < 2.5){ float ph = fract(t*0.85); return 0.62 + 0.6*exp(-pow((ph-0.10)*20.0,2.0)) + 0.38*exp(-pow((ph-0.30)*20.0,2.0)); }
  return 0.82 + 0.12*sin(t*9.3)*sin(t*5.1) + 0.06*sin(t*31.0);
}

vec3 gcFire(float h){
  vec3 c = mix(gcC2*0.25, gcC2, smoothstep(0.0,0.5,h));
  c = mix(c, gcC1, smoothstep(0.45,1.0,h));
  return c + vec3(1.0)*smoothstep(0.95,1.5,h)*0.6;
}

/* Emission (rgb) and absorption (a) at q, the position in units of the die's inner radius. */
vec4 gcField(vec3 q, float t){
  float r = length(q);
  if(gcPattern < 0.5){ /* ember */
    vec3 w = q*2.4 + vec3(0.0,-t*1.1,0.0);
    float n = gcFbm(w + vec3(gcFbm(w*1.3 + t*0.2))*0.8);
    float shape = smoothstep(gcCore, gcCore*0.15, r);
    float h = shape*(0.25 + n*1.3);
    return vec4(gcFire(h)*h*1.6, 0.4*h);
  }
  if(gcPattern < 1.5){ /* vortex */
    vec3 p = q; p.xz = gcRot(t*0.8 + r*2.5)*p.xz;
    float ang = atan(p.z, p.x);
    float arms = pow(0.5 + 0.5*cos(ang*2.0 - log(r+0.05)*5.0), 4.0);
    float disk = exp(-p.y*p.y*28.0) * smoothstep(gcCore*1.1, 0.05, r);
    float core = exp(-r*r*40.0);
    float d = disk*(0.15 + arms*1.3)*(0.7 + 0.6*gcNoise(p*8.0)) + core*2.5;
    vec3 c = mix(gcC2, gcC1, clamp(arms*0.6 + core, 0.0, 1.0));
    return vec4(c*d, 0.0);
  }
  if(gcPattern < 2.5){ /* nebula */
    vec3 w = q*2.0 + vec3(t*0.12, t*0.05, -t*0.08);
    float c1 = gcFbm(w); float c2 = gcFbm(w*1.7 + 4.3);
    float shape = smoothstep(gcCore*1.1, 0.2, r);
    float d = smoothstep(0.42, 0.85, c1)*shape;
    vec3 col = mix(gcC2, gcC1, smoothstep(0.3, 0.7, c2));
    vec3 cell = floor(q*7.0); vec3 fr = fract(q*7.0) - 0.5; float h = gcHash(cell + gcSeed);
    float star = step(0.9, h)*exp(-dot(fr,fr)*40.0)*(0.55 + 0.45*sin(t*4.0 + h*60.0))*shape;
    return vec4(col*d*2.2 + vec3(1.0)*star*6.0, d*0.6);
  }
  if(gcPattern < 3.5){ /* storm */
    float shape = smoothstep(gcCore*1.05, 0.15, r);
    float tf = floor(t*5.0);
    vec3 w = q*2.2;
    float n1 = gcNoise(w + vec3(0.0, tf*1.7, tf*0.3));
    float n2 = gcNoise(w*2.1 + vec3(tf*0.9, 0.0, 0.0));
    float rid = (1.0 - abs(n1*2.0 - 1.0)) * (1.0 - abs(n2*2.0 - 1.0)*0.5);
    float bolt = pow(clamp(rid, 0.0, 1.0), 10.0);
    float fl = gcHash(vec3(tf, gcSeed, 3.0));
    float flash = 0.5 + 2.4*step(0.5, fl)*exp(-fract(t*5.0)*3.0);
    float cloud = gcFbm(q*2.5 + t*0.2)*0.4;
    vec3 col = gcC1*bolt*flash*3.0 + gcC2*cloud*(0.6 + 0.6*flash);
    return vec4(col*shape, 0.2*cloud);
  }
  if(gcPattern < 4.5){ /* heart */
    float s = gcCore*0.35*(0.85 + 0.25*gcPLS);
    float core = exp(-r*r/(s*s));
    float haze = exp(-r*3.5)*0.35;
    float veins = pow(1.0 - abs(gcNoise(q*4.0 + t*0.3)*2.0 - 1.0), 10.0)*smoothstep(gcCore, 0.0, r)*0.6;
    vec3 col = mix(gcC2, gcC1, core)*core*3.0 + vec3(1.0)*exp(-r*r/(s*s*0.12))*1.5 + gcC2*(haze + veins);
    return vec4(col, 0.0);
  }
  if(gcPattern < 5.5){ /* eclipse */
    float rc = gcCore*0.55;
    float ring = exp(-pow((r - rc)*9.0, 2.0));
    float n = gcFbm(q*3.0 + vec3(0.0, t*0.4, 0.0));
    float corona = exp(-max(r - rc, 0.0)*6.0)*step(rc, r)*n*1.2;
    vec3 col = gcC1*ring*2.5 + gcC2*corona*1.5;
    float absb = smoothstep(rc, rc*0.85, r)*40.0;
    return vec4(col, absb);
  }
  if(gcPattern < 6.5){ /* frost */
    vec3 w = q*3.2 + vec3(0.0, t*0.05, 0.0);
    vec3 ip = floor(w), fp = fract(w);
    float F1 = 8.0, F2 = 8.0; float id = 0.0;
    for(int z=-1; z<=1; z++) for(int y=-1; y<=1; y++) for(int x=-1; x<=1; x++){
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 o = vec3(gcHash(ip+g), gcHash(ip+g+11.3), gcHash(ip+g+27.1));
      vec3 dv = g + o - fp; float dd = dot(dv,dv);
      if(dd < F1){ F2 = F1; F1 = dd; id = gcHash(ip+g+5.0); } else if(dd < F2){ F2 = dd; }
    }
    float e = sqrt(F2) - sqrt(F1);
    float seam = pow(clamp(1.0 - e*2.2, 0.0, 1.0), 10.0);
    float shape = smoothstep(gcCore*1.05, 0.2, r);
    float glint = 0.5 + 0.5*sin(t*3.0 + id*30.0);
    vec3 col = mix(gcC2, gcC1, seam)*seam*(0.6 + glint)*2.0 + gcC2*0.12;
    return vec4(col*shape, 0.0);
  }
  if(gcPattern < 7.5){ /* lava */
  float f = 0.0;
  for(int i=0;i<5;i++){
    float fi = float(i);
    vec3 c = vec3(sin(t*0.6 + fi*1.9)*0.35, sin(t*0.4 + fi*2.7)*0.5, cos(t*0.5 + fi*1.3)*0.35)*gcCore;
    float rr = 0.16 + 0.05*sin(fi*3.0);
    vec3 dq = q - c;
    f += rr*rr/max(dot(dq,dq), 1e-4);
  }
  float blob = smoothstep(0.8, 1.4, f);
  float shape = smoothstep(1.05, 0.6, r);
  vec3 col = mix(gcC2, gcC1, clamp(q.y*0.6 + 0.5, 0.0, 1.0));
  return vec4(col*blob*2.2*shape + gcC2*0.08, blob*3.0*shape);
  }
  if(gcPattern < 8.5){ /* plasma globe */
    vec3 d = q/max(r, 1e-3);
    vec3 dd = d; dd.xz = gcRot(r*1.6 + t*0.35)*dd.xz;
    float rid = 1.0 - abs(gcNoise(dd*2.6 + vec3(0.0, t*0.5, 0.0))*2.0 - 1.0);
    float rid2 = 1.0 - abs(gcNoise(dd*4.1 - vec3(t*0.4, 0.0, 0.0))*2.0 - 1.0);
    float reach = step(r, gcCore*1.05)*(0.35 + 0.65*exp(-r*1.4));
    float bolts = (pow(rid, 12.0) + 0.6*pow(rid2, 16.0))*reach;
    float core = exp(-r*r*55.0);
    vec3 col = gcC2*bolts*2.2 + gcC1*pow(rid, 36.0)*reach*2.5 + gcC1*core*3.0 + gcC2*exp(-r*3.0)*0.12;
    return vec4(col, 0.0);
  }
  if(gcPattern < 9.5){ /* aurora */
    float c = q.x + 0.35*sin(q.z*3.0 + t*0.7) + 0.25*gcNoise(vec3(q.xz*2.0, t*0.3));
    float sheets = pow(0.5 + 0.5*sin(c*7.0 + t*0.5), 6.0);
    float rays = 0.55 + 0.45*gcNoise(vec3(c*22.0, 0.0, t*0.8));
    float hm = smoothstep(-0.7, -0.1, q.y)*smoothstep(0.9, 0.25, q.y);
    float shape = smoothstep(gcCore*1.1, 0.3, r);
    vec3 col = mix(gcC1, gcC2, smoothstep(-0.5, 0.7, q.y));
    return vec4(col*sheets*rays*hm*shape*2.4, 0.0);
  }
  if(gcPattern < 10.5){ /* will-o'-wisps */
    vec3 col = gcC2*exp(-r*2.5)*0.06;
    for(int i=0;i<3;i++){
      float fi = float(i);
      float ph = t*(0.8 + 0.25*fi) + fi*2.1;
      vec3 c = vec3(cos(ph), sin(ph*1.3 + fi)*0.45, sin(ph))*0.55*gcCore;
      float d = length(q - c);
      col += mix(gcC1, gcC2, fi*0.35)*(exp(-d*d*90.0)*3.0 + exp(-d*9.0)*0.3);
      for(int j=1;j<6;j++){
        float pj = ph - float(j)*0.13;
        vec3 cj = vec3(cos(pj), sin(pj*1.3 + fi)*0.45, sin(pj))*0.55*gcCore;
        float dj = length(q - cj);
        col += gcC2*exp(-dj*dj*160.0)*(1.0 - float(j)/6.0)*0.9;
      }
    }
    return vec4(col, 0.0);
  }
  if(gcPattern < 11.5){ /* arcane rings */
    vec3 col = vec3(0.0);
    for(int i=0;i<3;i++){
      float fi = float(i);
      vec3 p = q;
      p.xy = gcRot(t*(0.5 + 0.2*fi) + fi*1.1)*p.xy;
      p.yz = gcRot(t*(0.35 - 0.1*fi) + fi*2.0)*p.yz;
      float R = (0.42 + 0.17*fi)*gcCore;
      float dist = length(vec2(length(p.xz) - R, p.y));
      float ang = atan(p.z, p.x);
      float runes = 0.35 + 0.65*step(0.45, fract(ang*(5.0 + 2.0*fi)/6.2832 + t*0.3*(fi - 1.0)));
      col += gcC1*exp(-dist*dist*140.0)*runes*2.4 + gcC2*exp(-dist*9.0)*0.25;
    }
    col += gcC1*exp(-r*r*70.0)*2.0;
    return vec4(col, 0.0);
  }
  if(gcPattern < 12.5){ /* bubbling potion */
    float level = -0.1 + 0.08*sin(q.x*4.0 + t*1.5) + 0.06*sin(q.z*5.0 - t*1.2);
    float inside = step(r, gcCore*1.02);
    float liquid = smoothstep(level, level - 0.04, q.y)*inside;
    vec3 bq = q*5.0 + vec3(0.0, -t*1.3, 0.0);
    vec3 cell = floor(bq); vec3 fr = fract(bq) - 0.5; float h = gcHash(cell + gcSeed);
    float bubble = step(0.72, h)*exp(-pow((length(fr) - 0.16)*14.0, 2.0));
    float surface = exp(-pow((q.y - level)*22.0, 2.0))*inside;
    vec3 col = mix(gcC2, gcC1, exp(-(level - q.y)*3.0))*liquid*(0.5 + 0.9*exp(-(level - q.y)*3.0))
             + gcC1*bubble*liquid*2.5 + gcC1*surface*1.6 + gcC2*0.05*inside;
    return vec4(col, liquid*1.2);
  }
  if(gcPattern < 13.5){ /* twin helix */
    float a = q.y*5.0 + t*1.5;
    float R = 0.32*gcCore;
    vec2 c = vec2(cos(a), sin(a))*R;
    float d1 = length(q.xz - c), d2 = length(q.xz + c);
    float span = smoothstep(gcCore*1.0, gcCore*0.75, abs(q.y));
    float along = dot(q.xz, vec2(cos(a), sin(a)));
    float perp = dot(q.xz, vec2(-sin(a), cos(a)));
    float rung = exp(-perp*perp*300.0)*step(abs(along), R)*exp(-pow((fract(q.y*4.0) - 0.5)*7.0, 2.0));
    vec3 col = (gcC1*exp(-d1*d1*140.0)*2.6 + gcC2*exp(-d2*d2*140.0)*2.6 + mix(gcC1, gcC2, 0.5 + along/(2.0*R))*rung*1.4)*span;
    return vec4(col + gcC2*exp(-r*3.0)*0.05, 0.0);
  }
  if(gcPattern < 14.5){ /* radiant sun */
    vec3 d = q/max(r, 1e-3);
    float rn = gcNoise(d*5.0 + vec3(0.0, 0.0, t*0.25)) * 0.6 + gcNoise(d*11.0 - vec3(t*0.2))*0.4;
    float rays = smoothstep(0.5, 0.85, rn)*exp(-r*2.2/gcCore)*1.8;
    float core = exp(-r*r*20.0/(gcCore*gcCore));
    vec3 col = mix(gcC1, vec3(1.0), core)*core*3.0 + mix(gcC2, gcC1, rays)*rays + gcC2*exp(-r*4.0/gcCore)*0.6;
    return vec4(col, 0.0);
  }
  /* fairy lights */
  vec3 bq = q*3.5 + vec3(sin(t*0.3)*0.6, t*0.25, cos(t*0.2)*0.6);
  vec3 cell = floor(bq); vec3 fr = fract(bq) - 0.5; float h = gcHash(cell + gcSeed);
  vec3 o = (vec3(gcHash(cell + 1.0), gcHash(cell + 2.0), gcHash(cell + 3.0)) - 0.5)*0.5;
  float d = length(fr - o);
  float mote = step(0.4, h)*exp(-d*d*22.0)*(0.5 + 0.5*sin(t*3.0 + h*40.0));
  float shape = smoothstep(gcCore*1.1, 0.3, r);
  vec3 col = mix(gcC1, gcC2, gcHash(cell + 7.0))*mote*5.5*shape + gcC2*exp(-r*2.5)*0.05;
  return vec4(col, 0.0);
}

/* March from this point on the die's surface through a sphere of the inner radius. */
vec3 gcVolume(){
  float tt = gcTime*gcSpeed;
  vec3 ro = gcObjPos;
  vec3 rd = normalize(gcObjPos - gcObjCam);
  float Rv = gcR*1.12;
  float b = dot(ro, rd); float c = dot(ro, ro) - Rv*Rv;
  float disc = b*b - c;
  vec3 acc = vec3(0.0);
  if(disc <= 0.0) return acc;
  float sq = sqrt(disc);
  float t0 = max(-b - sq, 0.0), t1 = -b + sq;
  if(t1 <= t0) return acc;
  float dt = (t1 - t0)/float(GC_STEPS);
  float jit = fract(52.9829189*fract(0.06711056*gl_FragCoord.x + 0.00583715*gl_FragCoord.y));
  float T = 1.0;
  for(int i=0;i<GC_STEPS;i++){
    vec3 p = ro + rd*(t0 + (float(i) + jit)*dt);
    vec4 f = gcField(p/gcR, tt);
    float dq = dt/gcR;
    acc += T*f.rgb*dq;
    T *= exp(-f.a*dq);
    if(T < 0.02) break;
  }
  return acc;
}
`;

const MAP_PATCH = /* glsl */`
gcPLS = gcPulseF(gcTime*gcSpeed);
float gcLabel = 0.0;
#ifdef USE_MAP
{
  float gcDB = distance(sampledDiffuseColor.rgb, gcBg);
  float gcDF = distance(sampledDiffuseColor.rgb, gcFg);
  gcLabel = smoothstep(0.3, 0.7, gcDB/(gcDB + gcDF + 1e-4));
}
#endif
diffuseColor.rgb = mix(diffuseColor.rgb*(1.0 - gcDark), diffuseColor.rgb, gcLabel);
`;

const EMISSIVE_PATCH = /* glsl */`
vec3 gcEmit;
{
  vec3 gcN = normalize(normal);
  float gcFres = pow(1.0 - clamp(dot(gcN, normalize(gcViewDir)), 0.0, 1.0), 3.0);
  gcEmit = gcVolume()*gcIntensity*gcPLS*(1.0 - 0.8*gcLabel) + gcC2*gcFres*gcRim*0.6*gcPLS;
}
totalEmissiveRadiance += gcEmit;
`;

const BLOOM_PATCH = /* glsl */`
if (globalBloom > 0.5) { gl_FragColor.rgb += gcEmit*gcBloom; }
`;

const MARKERS = {
  vertex: "#include <project_vertex>",
  map: "#include <map_fragment>",
  emissive: "#include <emissivemap_fragment>"
};

/**
 * Patch a Dice So Nice material's shader. Returns false (and leaves the shader alone) when the material's shader
 * doesn't have the parts the glow needs.
 * @param {object} shader     three.js onBeforeCompile shader {vertexShader, fragmentShader, uniforms}
 * @param {object} uniforms   the material's {name: {value}} glow uniforms
 * @param {number} steps      ray-march samples
 */
export function injectGlow(shader, uniforms, steps) {
  const vs = shader.vertexShader, fs = shader.fragmentShader;
  if (!vs.includes(MARKERS.vertex) || !fs.includes(MARKERS.map) || !fs.includes(MARKERS.emissive)) return false;

  shader.vertexShader = VERTEX_HEAD + vs.replace(MARKERS.vertex, `${MARKERS.vertex}\n${VERTEX_BODY}`);

  let out = `#define GC_STEPS ${steps}\n` + FRAGMENT_HEAD + fs;
  out = out.replace(MARKERS.map, `${MARKERS.map}\n${MAP_PATCH}`);
  out = out.replace(MARKERS.emissive, `${MARKERS.emissive}\n${EMISSIVE_PATCH}`);
  // Dice So Nice's bloom pass (realistic lighting) replaces the colour with the emissive light; add the glow to it.
  if (shader.uniforms.globalBloom && fs.includes("globalBloom")) out = out.replace(/\}\s*$/, `${BLOOM_PATCH}\n}`);
  shader.fragmentShader = out;

  Object.assign(shader.uniforms, uniforms);
  return true;
}
