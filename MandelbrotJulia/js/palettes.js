// palettes.js — Color palette definitions and texture generation
window.Palettes = (function () {
  const list = [
    {
      name: 'Nebula',
      stops: [
        [0.0, 0, 7, 40],
        [0.16, 32, 107, 203],
        [0.42, 237, 255, 255],
        [0.6425, 255, 170, 0],
        [0.8575, 0, 2, 0],
        [1.0, 0, 7, 40],
      ],
    },
    {
      name: 'Inferno',
      stops: [
        [0.0, 0, 0, 4],
        [0.13, 40, 11, 84],
        [0.25, 101, 21, 110],
        [0.38, 159, 42, 99],
        [0.5, 212, 72, 66],
        [0.63, 245, 125, 21],
        [0.75, 250, 193, 39],
        [0.88, 252, 255, 164],
        [1.0, 0, 0, 4],
      ],
    },
    {
      name: 'Ocean',
      stops: [
        [0.0, 0, 0, 20],
        [0.2, 0, 40, 100],
        [0.4, 0, 120, 190],
        [0.55, 40, 200, 220],
        [0.7, 180, 240, 255],
        [0.85, 255, 255, 255],
        [1.0, 0, 0, 20],
      ],
    },
    {
      name: 'Twilight',
      stops: [
        [0.0, 10, 0, 30],
        [0.2, 80, 10, 120],
        [0.4, 180, 40, 150],
        [0.55, 255, 100, 100],
        [0.7, 255, 180, 50],
        [0.85, 255, 240, 150],
        [1.0, 10, 0, 30],
      ],
    },
    {
      name: 'Electric',
      stops: [
        [0.0, 0, 0, 0],
        [0.1, 20, 0, 80],
        [0.25, 0, 100, 255],
        [0.4, 0, 255, 200],
        [0.55, 100, 255, 0],
        [0.7, 255, 255, 0],
        [0.85, 255, 100, 0],
        [1.0, 0, 0, 0],
      ],
    },
    {
      name: 'Frost',
      stops: [
        [0.0, 255, 255, 255],
        [0.15, 200, 230, 255],
        [0.35, 100, 180, 255],
        [0.55, 20, 60, 180],
        [0.75, 5, 10, 60],
        [0.9, 0, 0, 0],
        [1.0, 255, 255, 255],
      ],
    },
    {
      name: 'Lava',
      stops: [
        [0.0, 0, 0, 0],
        [0.2, 100, 0, 0],
        [0.4, 200, 50, 0],
        [0.6, 255, 150, 0],
        [0.75, 255, 255, 100],
        [0.9, 255, 255, 255],
        [1.0, 0, 0, 0],
      ],
    },
    {
      name: 'Monochrome',
      stops: [
        [0.0, 0, 0, 0],
        [0.5, 255, 255, 255],
        [1.0, 0, 0, 0],
      ],
    },
    {
      name: 'Psychedelic',
      stops: [
        [0.0, 255, 0, 100],
        [0.14, 255, 0, 255],
        [0.28, 0, 0, 255],
        [0.42, 0, 255, 255],
        [0.57, 0, 255, 0],
        [0.71, 255, 255, 0],
        [0.85, 255, 100, 0],
        [1.0, 255, 0, 100],
      ],
    },
    {
      name: 'Emerald',
      stops: [
        [0.0, 0, 5, 0],
        [0.2, 0, 50, 20],
        [0.4, 0, 150, 60],
        [0.6, 50, 220, 100],
        [0.8, 180, 255, 200],
        [1.0, 0, 5, 0],
      ],
    },
  ];

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function generateTexture(palette, size) {
    size = size || 2048;
    const data = new Uint8Array(size * 4);
    const stops = palette.stops;
    for (let i = 0; i < size; i++) {
      const t = i / size;
      let j = 0;
      while (j < stops.length - 1 && stops[j + 1][0] <= t) j++;
      const s0 = stops[j];
      const s1 = stops[Math.min(j + 1, stops.length - 1)];
      const range = s1[0] - s0[0];
      const f = range > 0 ? (t - s0[0]) / range : 0;
      // Smooth interpolation
      const sf = f * f * (3 - 2 * f);
      data[i * 4 + 0] = Math.round(lerp(s0[1], s1[1], sf));
      data[i * 4 + 1] = Math.round(lerp(s0[2], s1[2], sf));
      data[i * 4 + 2] = Math.round(lerp(s0[3], s1[3], sf));
      data[i * 4 + 3] = 255;
    }
    return data;
  }

  return { list, generateTexture };
})();
