#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform vec2  uRes;
uniform float uTime;
uniform float uTemp;   // 0..1 temperature
uniform float uSeed;

// hash / noise
uint hash_uvec2(uvec2 x){
  x = x*1664525u + 1013904223u;
  x.x += x.y*1664525u;
  x.y += x.x*1013904223u;
  x ^= (x>>16);
  return x.x ^ x.y;
}
float hash12(vec2 p){
  uvec2 k = uvec2(floatBitsToUint(p.x), floatBitsToUint(p.y));
  return float(hash_uvec2(k)) / 4294967296.0;
}
vec2 hash22(vec2 p){
  float n = hash12(p);
  float m = hash12(p+13.37);
  return vec2(n,m);
}

// Brownian-ish particle cloud with central hot zone
float cloud(vec2 p, float temp){
  float r = length(p);
  float center = exp(-2.5 * r*r);          // hot core
  float ring = exp(-12.0 * abs(r-0.35));   // subtle shell
  float f = center + 0.35*ring;
  // jitter with temp-dependent drift
  vec2 drift = vec2(
    sin(p.x*7.3 + uTime*(0.5+temp)) * 0.05*temp,
    cos(p.y*5.7 + uTime*(0.7+temp)) * 0.05*temp
  );
  vec2 q = p + drift;
  float n = 0.0;
  // cheap multi-sample noise accumulation
  for (int j=-1;j<=1;j++){
    for (int i=-1;i<=1;i++){
      vec2 s = q + vec2(float(i),float(j))*0.12;
      n += hash12(s + uSeed*0.123);
    }
  }
  n /= 9.0;
  return f * (0.7 + 0.6*n);
}

void main(){
  vec2 uv = vUV;
  vec2 p = (uv * uRes) / min(uRes.x,uRes.y);
  p -= 0.5;
  // temperature and exposure
  float temp = clamp(uTemp, 0.0, 1.0);
  float dyn = mix(0.05, 1.0, temp);

  // density higher at early times (temp high)
  float density = mix(0.35, 1.0, temp);
  float s = 0.0;
  s += cloud(p*1.0, temp) * density;
  s += cloud(p*2.0, temp) * 0.6*density;
  s += cloud(p*3.5, temp) * 0.35*density;

  // color: hotter → warmer tint
  vec3 cold = vec3(0.55,0.75,1.00);
  vec3 warm = vec3(0.95,0.80,1.00);
  vec3 tint = mix(cold, warm, temp*0.6 + 0.2);
  vec3 col = s * tint;

  // early universe should be bright
  float exposure = mix(0.45, 1.25, temp);
  col = vec3(1.0) - exp(-col * (2.2*exposure));

  // vignette
  col *= smoothstep(1.2, 0.2, distance(uv, vec2(0.5)));

  fragColor = vec4(col, 1.0);
}


