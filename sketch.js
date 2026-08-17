let rayShader;

function preload() {
  rayShader = loadShader("shader.vert", "shader.frag");
}

function setup() {
  createCanvas(400, 225, WEBGL);
  noStroke();
}

function draw() {
  shader(rayShader);

  let aspect_ratio = width / height;
  let viewport_h = 2.0;
  let viewport_w = aspect_ratio * viewport_h;
  let focal_length = 1.0;

  let camera_center = [0, 0, 0];
  let horizontal = [viewport_w, 0, 0];
  let vertical = [0, -viewport_h, 0];

  let upper_left_corner = [
    camera_center[0] - horizontal[0] / 2 - vertical[0] / 2,
    camera_center[1] - horizontal[1] / 2 - vertical[1] / 2,
    camera_center[2] - horizontal[2] / 2 - vertical[2] / 2 - focal_length,
  ];
  
  let centers = [
    0, -100.5, -1,
    0, 0, -1.2,
    -1, 0, -1,
    -1, 0, -1,
    1, 0, -1
  ];
  let radii = [100, 0.5, 0.5, 0.3, 0.5]; 
  let materials = [1, 1, 2, 2, 1];
  let iors = [1, 1, 1.5, 1/1.5, 1];
  let colors = [
    0.8, 0.8, 0.0,
    0.1, 0.2, 0.5,
    0.8, 0.8, 0.8,
    0.8, 0.8, 0.8,
    0.8, 0.6, 0.2
  ];
  let fuzz = [0.0, 0.0, 0.0, 0.0, 0.0]; // Roughness: 0=mirror, 1=brushed
  let u_count = 5;

  rayShader.setUniform("resolution", [width, height]);
  rayShader.setUniform("u_sphere_centers", centers);
  rayShader.setUniform("u_sphere_radii", radii);
  rayShader.setUniform("u_sphere_materials", materials);
  rayShader.setUniform("u_sphere_colors", colors);
  rayShader.setUniform("u_sphere_fuzz", fuzz);
  rayShader.setUniform("u_sphere_ior", iors);
  rayShader.setUniform("u_count", u_count);
  rayShader.setUniform("u_camera_center", camera_center);
  rayShader.setUniform("u_horizontal", horizontal);
  rayShader.setUniform("u_vertical", vertical);
  rayShader.setUniform("u_upper_left", upper_left_corner);

  rect(-width / 2, -height / 2, width, height);
  noLoop();
}