let seed = 0;
export const uid = (prefix = "el") => {
  seed += 1;
  return `${prefix}_${Date.now().toString(36).slice(-4)}${seed.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
};
