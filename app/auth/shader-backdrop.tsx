"use client";

import { useEffect, useRef } from "react";

/**
 * The sign-in page's living background: a full-screen WebGL fragment shader (domain-warped noise, so the colour flows
 * like liquid light) painted in the brand tokens, with a glow that follows the pointer. Plain WebGL, no library.
 *
 * It is drawn at half resolution and scaled up (the image is smooth, so nothing is lost), pauses while the tab is
 * hidden, draws a single still frame when motion is reduced, and leaves the CSS gradient behind it showing when WebGL
 * is not available.
 */

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uMouseOn;
uniform vec3 cBase; uniform vec3 cDeep; uniform vec3 cAccent; uniform vec3 cViolet; uniform vec3 cLight;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}
void main(){
  float s = min(uRes.x, uRes.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / s;
  vec2 m = (uMouse * uRes - 0.5 * uRes) / s;
  float t = uTime * 0.06;
  vec2 q = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p * 1.4 + 3.0 * q + vec2(1.7, 9.2) + t * 1.3), fbm(p * 1.4 + 3.0 * q + vec2(8.3, 2.8) - t * 1.1));
  float f = fbm(p * 1.2 + 3.0 * r);
  float d = length(p - m);
  f += uMouseOn * 0.2 * exp(-d * 3.5);
  vec3 col = mix(cBase, cDeep, smoothstep(0.1, 0.5, f));
  col = mix(col, cViolet, smoothstep(0.4, 0.9, r.x) * 0.5);
  col = mix(col, cAccent, smoothstep(0.45, 0.85, f) * 0.9);
  col += cLight * pow(smoothstep(0.55, 0.95, f), 2.0) * 0.55;
  col += cLight * uMouseOn * 0.16 * exp(-d * 5.0);
  col *= mix(0.5, 1.0, 1.0 - smoothstep(0.2, 1.45, length(p)));
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.025;
  gl_FragColor = vec4(col, 1.0);
}`;

/** A brand token as 0–1 RGB, read from the page so the shader follows the design tokens (hex values only). */
function token(name: string, fallback: [number, number, number]): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(raw);
  if (!m) return fallback;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function ShaderBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes"), uTime = u("uTime"), uMouse = u("uMouse"), uMouseOn = u("uMouseOn");
    gl.uniform3fv(u("cBase"), token("--color-paper-ink", [0.11, 0.1, 0.11]));
    gl.uniform3fv(u("cDeep"), token("--color-accent-deep", [0.62, 0.09, 0.3]));
    gl.uniform3fv(u("cAccent"), token("--color-accent-fill", [0.89, 0, 0.45]));
    gl.uniform3fv(u("cViolet"), token("--color-cbe", [0.43, 0.17, 0.55]));
    gl.uniform3fv(u("cLight"), token("--color-accent-light", [1, 0.56, 0.77]));

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = { x: 0.5, y: 0.5, on: 0 };
    const cur = { x: 0.5, y: 0.5, on: 0 };
    let frame = 0;
    let running = false;
    const start = performance.now();

    const resize = () => {
      // Half the CSS size: the shader is smooth, so the browser's upscale is invisible and the GPU does a quarter of the work.
      const w = Math.max(2, Math.round(canvas.clientWidth * 0.5));
      const h = Math.max(2, Math.round(canvas.clientHeight * 0.5));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    const draw = (now: number) => {
      resize();
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      cur.on += (target.on - cur.on) * 0.06;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, still ? 12 : (now - start) / 1000);
      gl.uniform2f(uMouse, cur.x, cur.y);
      gl.uniform1f(uMouseOn, cur.on);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      draw(now);
      if (running) frame = requestAnimationFrame(loop);
    };
    const play = () => {
      if (still || running) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const move = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth;
      target.y = 1 - e.clientY / window.innerHeight;
      target.on = 1;
    };
    const leave = () => (target.on = 0);
    const visibility = () => (document.hidden ? pause() : play());

    draw(start);
    play();
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", visibility);
    const redraw = () => still && draw(performance.now());
    window.addEventListener("resize", redraw);
    return () => {
      pause();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("resize", redraw);
      document.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      // The context is left alone: React Strict Mode re-runs this effect on the same canvas, and a lost context cannot be revived.
    };
  }, []);

  return (
    // The gradient shows first, and stays if WebGL is missing.
    <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_20%,var(--color-accent-deep),var(--color-paper-ink)_70%)]">
      <canvas ref={ref} className="size-full" />
    </div>
  );
}
