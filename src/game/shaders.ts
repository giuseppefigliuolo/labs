// Iridescent bubble shell.
export const SHELL_V = `varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){ vec4 wp = modelMatrix*vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); vP = position; gl_Position = projectionMatrix*viewMatrix*wp; }`

export const SHELL_F = `uniform vec3 uTint; uniform float uTime; uniform float uAlpha; uniform float uDanger;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  vec3 irid(float t){ return 0.5+0.5*cos(6.2831*(t+vec3(0.0,0.33,0.67))); }
  void main(){
    vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
    vec3 V = normalize(vV);
    float ndv = clamp(dot(N,V),0.0,1.0);
    float fres = pow(1.0-ndv, 2.2);
    vec3 ir = irid(fres*1.3 + vP.y*0.3 + uTime*0.07);
    vec3 col = mix(uTint, ir, 0.18*(1.0-uDanger));
    vec3 L = normalize(vec3(-0.5,0.8,0.6));
    float spec = pow(max(dot(reflect(-L,N),V),0.0), 90.0);
    vec3 L2 = normalize(vec3(0.7,-0.5,0.4));
    float spec2 = pow(max(dot(reflect(-L2,N),V),0.0), 24.0)*0.25;
    float a = (0.14 + fres*0.8) + spec + spec2;
    gl_FragColor = vec4(col*(0.55+fres*0.9) + vec3(spec+spec2), clamp(a,0.0,1.0)*uAlpha);
  }`

// Logo plane inside the bubble; uSide/uCut/uH clip it to one side of the cut line (uH: its offset from the centre).
export const LOGO_V = `varying vec2 vUv; varying vec2 vL; void main(){ vUv=uv; vL=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`

export const LOGO_F = `uniform sampler2D uMap; uniform vec2 uCut; uniform float uSide; uniform float uH; uniform float uOpacity; varying vec2 vUv; varying vec2 vL;
  void main(){ if(uSide != 0.0 && (dot(vL,uCut)-uH)*uSide < 0.0) discard; vec4 c = texture2D(uMap, vUv); if(c.a < 0.01) discard; gl_FragColor = vec4(c.rgb, c.a*uOpacity); }`

// Opaque sliced half with the logo projected onto its skin.
// uMode: 0 solido, 1 lucido, 2 cartoon.
export const HALF_V = `uniform mat3 uRot; varying vec3 vN; varying vec3 vV; varying vec3 vG;
  void main(){ vec4 wp = modelMatrix*vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition-wp.xyz); vG = uRot*position; gl_Position = projectionMatrix*viewMatrix*wp; }`

export const HALF_F = `uniform vec3 uTint; uniform sampler2D uMap; uniform vec2 uLogo; uniform float uMode; uniform float uDanger; uniform float uTime;
  varying vec3 vN; varying vec3 vV; varying vec3 vG;
  vec3 irid(float t){ return 0.5+0.5*cos(6.2831*(t+vec3(0.0,0.33,0.67))); }
  void main(){
    vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N; vec3 V = normalize(vV);
    vec3 L = normalize(vec3(-0.5,0.8,0.6));
    float ndl = dot(N,L); float ndv = clamp(dot(N,V),0.0,1.0); float fres = pow(1.0-ndv,2.2);
    vec3 base = mix(uTint, vec3(0.08,0.02,0.03), uDanger);
    vec2 uv = vG.xy/uLogo + 0.5; vec4 lg = vec4(0.0);
    if(vG.z > 0.0 && uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) lg = texture2D(uMap, uv);
    float rv = max(dot(reflect(-L,N),V),0.0);
    vec3 col;
    if(uMode < 0.5){
      vec3 skin = mix(base, lg.rgb, lg.a);
      col = skin*(0.38+0.72*max(ndl,0.0)) + skin*fres*0.3 + vec3(pow(rv,60.0)*0.45);
    } else if(uMode < 1.5){
      vec3 rim = mix(uTint, irid(fres*1.3+vG.y*0.3+uTime*0.07), 0.3*(1.0-uDanger));
      vec3 skin = mix(base*0.62, rim*1.25, fres);
      skin = mix(skin, lg.rgb, lg.a*(1.0-fres*0.6));
      col = skin*(0.75+0.35*max(ndl,0.0)) + vec3(pow(rv,140.0)*1.2 + pow(rv,24.0)*0.2);
    } else {
      float band = ndl > 0.25 ? 1.0 : (ndl > -0.35 ? 0.72 : 0.52);
      vec3 skin = mix(base, lg.rgb, step(0.5, lg.a));
      col = skin*band + vec3(step(0.92, rv)*0.8);
    }
    gl_FragColor = vec4(col,1.0);
  }`

// Post-processing.
export const POST_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'

export const BRIGHT_F = `uniform sampler2D tMap; uniform float uTh; uniform vec2 uTx; varying vec2 vUv;
  vec3 bp(vec2 o){ vec3 c = texture2D(tMap, vUv + o).rgb; float l = max(c.r, max(c.g, c.b)); return c * smoothstep(uTh, uTh + 0.3, l); }
  void main(){ gl_FragColor = vec4((bp(vec2(-uTx.x, -uTx.y)) + bp(vec2(uTx.x, -uTx.y)) + bp(vec2(-uTx.x, uTx.y)) + bp(uTx)) * 0.25, 1.0); }`

export const BLUR_F = `uniform sampler2D tMap; uniform vec2 uDir; varying vec2 vUv;
  void main(){ vec3 c = texture2D(tMap, vUv).rgb * 0.227027;
    c += (texture2D(tMap, vUv + uDir * 1.3846).rgb + texture2D(tMap, vUv - uDir * 1.3846).rgb) * 0.3162162;
    c += (texture2D(tMap, vUv + uDir * 3.2308).rgb + texture2D(tMap, vUv - uDir * 3.2308).rgb) * 0.0702703;
    gl_FragColor = vec4(c, 1.0); }`

export const COMP_F = `uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uBloom; uniform float uCA; varying vec2 vUv;
  void main(){ vec2 d = vUv - 0.5; vec2 off = d * uCA * (0.4 + dot(d, d) * 2.5);
    vec4 g = texture2D(tScene, vUv); vec4 r = texture2D(tScene, vUv + off); vec4 b = texture2D(tScene, vUv - off);
    vec3 col = vec3(r.r, g.g, b.b) + texture2D(tBloom, vUv).rgb * uBloom;
    float a = clamp(max(max(g.a, max(r.a, b.a)), max(col.r, max(col.g, col.b))), 0.0, 1.0);
    gl_FragColor = vec4(min(col, vec3(a)), a); }`
