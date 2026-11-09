/** Named positions in the home set, shared by the scene scripts (kept in sync with Home.ts). */
export const HOME_SPOTS = {
  danielChair: { x: -1.0, z: -0.55, yaw: 0 },
  graceChair: { x: -1.0, z: 0.75, yaw: Math.PI },
  sideChair: { x: -1.95, z: 0.1, yaw: Math.PI / 2 },
  sideChair2: { x: -0.05, z: 0.1, yaw: -Math.PI / 2 },
  doorway: { x: 2.0, z: -2.2, yaw: 0 },
  doorOutside: { x: 2.0, z: -3.4, yaw: 0 },
  kitchen: { x: 1.2, z: 1.9, yaw: Math.PI },
  tableEnd: { x: -2.2, z: 0.1, yaw: Math.PI / 2 },
  centre: { x: 0.6, z: -0.6, yaw: Math.PI },
  laptopScreen: [-1.0, 0.95, -0.2] as [number, number, number],
};
