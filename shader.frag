precision highp float;

uniform vec2 resolution;
uniform vec3 u_camera_center;
uniform vec3 u_horizontal;
uniform vec3 u_vertical;
uniform vec3 u_upper_left;
uniform vec3 u_sphere_centers[100];
uniform float u_sphere_radii[100];
uniform int u_sphere_materials[100];
uniform vec3 u_sphere_colors[100];
uniform float u_sphere_fuzz[100]; // New: Individual fuzziness
uniform float u_sphere_ior[100];
uniform int u_count;

varying vec2 pos;

struct ray {
  vec3 origin;
  vec3 direction;
};

struct hit_record {
  vec3 p;
  vec3 normal;
  float t;
  bool front_face;
  int mat_id;
  vec3 color;
  float fuzz;
  float ior;
};

void set_face_normal(inout hit_record rec, ray r, vec3 outward_normal) {
  rec.front_face = dot(r.direction, outward_normal) < 0.;
  rec.normal = rec.front_face ? outward_normal : -outward_normal;
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 random_in_unit_sphere(vec2 seed) {
  float u = random(seed) * 2.0 - 1.0;
  float v = random(seed + 0.1) * 2.0 - 1.0;
  float w = random(seed + 0.2) * 2.0 - 1.0;
  return normalize(vec3(u, v, w)) * random(seed + 0.3);
}

vec3 random_on_hemisphere(vec3 normal, vec2 seed) {
  vec3 on_unit_sphere = normalize(random_in_unit_sphere(seed));
  return dot(on_unit_sphere, normal) > 0.0 ? on_unit_sphere : -on_unit_sphere;
}

float reflectance(float cosine, float ref_idx) {
  // Use Schlick's approximation for reflectance.
  float r0 = (1.0 - ref_idx) / (1.0 + ref_idx);
  r0 = r0 * r0;
  return r0 + (1.0 - r0) * pow((1.0 - cosine), 5.0);
}

bool hit_sphere_at(vec3 center, float radius, int mat_id, vec3 color, float fuzz, float ior, ray r, float t_min, float t_max, inout hit_record rec) {
  vec3 oc = r.origin - center;
  float a = dot(r.direction, r.direction);
  float half_b = dot(oc, r.direction);
  float c = dot(oc, oc) - radius * radius;
  float discriminant = half_b*half_b - a*c;

  if (discriminant < 0.0) return false;

  float sqrtd = sqrt(discriminant);
  float root = (-half_b - sqrtd) / a;

  if (root < t_min || t_max < root) {
    root = (-half_b + sqrtd) / a;
    if (root < t_min || t_max < root) return false;
  }
  
  rec.t = root;
  rec.p = r.origin + rec.t * r.direction;
  rec.mat_id = mat_id;
  rec.color = color;
  rec.fuzz = fuzz;
  rec.ior = ior;
  vec3 outward_normal = (rec.p - center) / radius;
  set_face_normal(rec, r, outward_normal);
  return true;
}

bool hit_world(ray r, float t_min, float t_max, out hit_record rec) {
  hit_record temp_rec;
  bool hit_anything = false;
  float closest_so_far = t_max;

  for (int i = 0; i < 100; i++) {
    if (i >= u_count) break;
    if (hit_sphere_at(u_sphere_centers[i], u_sphere_radii[i], u_sphere_materials[i], u_sphere_colors[i], u_sphere_fuzz[i], u_sphere_ior[i], r, t_min, closest_so_far, temp_rec)) {
      hit_anything = true;
      closest_so_far = temp_rec.t;
      rec = temp_rec;
    }
  }
  return hit_anything;
}

vec3 ray_color(ray r, vec2 seed) {
  vec3 accumulation = vec3(1.0);
  ray cur_ray = r;
  const int bounces = 50;
  
  for (int i = 0; i < bounces; i++) {
    hit_record rec;
    if (hit_world(cur_ray, 0.001, 1000.0, rec)) {
      vec2 bounce_seed = seed + float(i) * 0.618;
      
      if (rec.mat_id == 2) {
        float refraction_ratio = rec.front_face ? (1.0 / rec.ior) : rec.ior;
        
        vec3 unit_direction = normalize(cur_ray.direction);
        float cos_theta = min(dot(-unit_direction,rec.normal), 1.0);
        float sin_theta = sqrt(1.0 - cos_theta * cos_theta);
        
        // Total Internal Reflection check
        bool cannot_refract = refraction_ratio * sin_theta > 1.0;
        vec3 direction;
        
        if (cannot_refract || reflectance(cos_theta,
                                          refraction_ratio) >
            random(bounce_seed)) {
          // Ray must reflect
          direction = reflect(unit_direction, rec.normal);
        } else {
          // Ray can refract
          direction = refract(unit_direction, rec.normal, 
                              refraction_ratio);
        }
        
        cur_ray.origin = rec.p;
        cur_ray.direction = direction;
      } else if (rec.mat_id == 1) {
        // METAL
        vec3 reflected = reflect(
                         normalize(cur_ray.direction),
                         rec.normal
                         );
        cur_ray.origin = rec.p;
        // Apply individual fuzz from the hit_record
        cur_ray.direction = reflected + rec.fuzz *
                            random_in_unit_sphere(bounce_seed);
        
        if (dot(cur_ray.direction, rec.normal) <= 0.0) {
          return vec3(0.0);
        }
        accumulation *= rec.color;
      } else {
        // LAMBERTIAN
        cur_ray.origin = rec.p;
        cur_ray.direction = rec.normal + random_on_hemisphere(
                                         rec.normal,
                                         bounce_seed
                                         );
        accumulation *= rec.color;
      }
    } else {
      vec3 unit_direction = normalize(cur_ray.direction);
      float t = 0.5 * (unit_direction.y + 1.0);
      return accumulation * mix(vec3(1.0), vec3(0.5, 0.7, 1.0), t);
    }
  }
  return vec3(0.0);
}

void main() {
  vec3 total_color = vec3(0.0);
  const int samples_per_pixel = 100;
  
  for (int i = 0; i < samples_per_pixel; i++) {
    vec2 seed = pos + float(i) * 0.1234;
    float rx = (random(seed) - 0.5) / resolution.x;
    float ry = (random(seed + 0.5) - 0.5) / resolution.y;
    
    ray r;
    r.origin = u_camera_center;
    r.direction = u_upper_left + (pos.x + rx) * u_horizontal + (pos.y + ry) * u_vertical - u_camera_center;
    total_color += ray_color(r, seed);
  }

  vec3 final_color = total_color / float(samples_per_pixel);
  gl_FragColor = vec4(sqrt(final_color), 1.0);
}