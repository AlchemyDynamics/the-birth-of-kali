export const FINAL_STARS=350;
// Discovery unfolds one complete group at a time: 1, 2, 3, 3, 4.
export function discoveryCount(food){return food<2?1:food<4?2:food<7?3:food<10?3:food<14?4:0;}
export function clusterCount(random=Math.random){const r=random();return r<.32?2:r<.60?3:r<.82?4:r<.94?5:6;}
