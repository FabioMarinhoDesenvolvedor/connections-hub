import * as THREE from 'three';

/*
  Image-based light shared by every 3D piece of the site, so the brand object and the project
  plates read as the same material in the same room. Matte card only shows a light's shape
  as broad falloff, so the room is simple: one large softbox high on the left, a warm bounce
  from the paper below, a weak fill, a thin rim strip, dark elsewhere.
*/
export function studio() {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0.035, 0.035, 0.04);
  const panel = (w: number, h: number, [x, y, z]: number[], colour: string, power: number) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(power), side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    room.add(mesh);
  };
  panel(7, 7, [-5, 6, 6], '#ffffff', 5.5);
  panel(14, 4, [0, -6, 3], '#F8F1E6', 0.9);
  panel(4, 9, [7, 1, 4], '#EEF2F8', 0.9);
  panel(10, 2, [0, 7, -4], '#ffffff', 1.2);
  return room;
}

/** The studio as a prefiltered environment map; the room itself is released right away. */
export function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = studio();
  const environment = pmrem.fromScene(room, 0).texture;
  room.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); object.material.dispose(); } });
  pmrem.dispose();
  return environment;
}
