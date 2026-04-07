// perturbation.js — Arbitrary precision reference orbit computation using BigInt
window.Perturbation = (function () {
  // High-precision number: value = mantissa * 2^(-scale)
  // scale is the number of fractional binary digits
  const PREC = 256; // bits of precision

  function HP(mantissa, scale) {
    this.m = mantissa; // BigInt
    this.s = scale;    // integer (number of fractional bits)
  }

  HP.fromNumber = function (n) {
    // Convert JS number to HP with PREC bits
    if (n === 0) return new HP(0n, PREC);
    const sign = n < 0 ? -1n : 1n;
    const abs = Math.abs(n);
    // Split into integer and fractional parts
    const intPart = Math.floor(abs);
    const fracPart = abs - intPart;
    // Convert integer part
    let m = BigInt(intPart) << BigInt(PREC);
    // Convert fractional part (use 53 bits of precision from float)
    m += BigInt(Math.round(fracPart * (2 ** 53))) << BigInt(PREC - 53);
    return new HP(sign * m, PREC);
  };

  // Create from two doubles: hi + lo (for double-double input)
  HP.fromDoubleDouble = function (hi, lo) {
    const a = HP.fromNumber(hi);
    const b = HP.fromNumber(lo);
    return a.add(b);
  };

  HP.prototype.add = function (b) {
    const maxS = Math.max(this.s, b.s);
    const am = this.m << BigInt(maxS - this.s);
    const bm = b.m << BigInt(maxS - b.s);
    return new HP(am + bm, maxS);
  };

  HP.prototype.sub = function (b) {
    const maxS = Math.max(this.s, b.s);
    const am = this.m << BigInt(maxS - this.s);
    const bm = b.m << BigInt(maxS - b.s);
    return new HP(am - bm, maxS);
  };

  HP.prototype.mul = function (b) {
    const prod = this.m * b.m;
    const totalS = this.s + b.s;
    // Truncate back to PREC
    if (totalS > PREC) {
      return new HP(prod >> BigInt(totalS - PREC), PREC);
    }
    return new HP(prod, totalS);
  };

  HP.prototype.mul2 = function () {
    return new HP(this.m << 1n, this.s);
  };

  HP.prototype.toNumber = function () {
    if (this.s <= 53) {
      return Number(this.m) * (2 ** (-this.s));
    }
    // Shift right to fit in 53 bits
    const shift = this.s - 53;
    return Number(this.m >> BigInt(shift)) * (2 ** (-53));
  };

  HP.prototype.gt = function (threshold) {
    // Check if |value| > threshold (float)
    return Math.abs(this.toNumber()) > threshold;
  };

  // Compute reference orbit for z^2 + c at high precision
  // Returns Float32Array of [re, im, 0, 0, ...] for each orbit point
  function computeReferenceOrbit(centerRe, centerIm, maxIter, bailout) {
    // centerRe, centerIm are {hi, lo} objects
    const cRe = HP.fromDoubleDouble(centerRe.hi, centerRe.lo);
    const cIm = HP.fromDoubleDouble(centerIm.hi, centerIm.lo);

    let zRe = new HP(0n, PREC);
    let zIm = new HP(0n, PREC);

    const bail2 = bailout * bailout;
    const points = [];
    let escaped = false;

    for (let i = 0; i < maxIter; i++) {
      const re = zRe.toNumber();
      const im = zIm.toNumber();
      points.push(re, im, 0, 0);

      if (re * re + im * im > bail2) {
        escaped = true;
        break;
      }

      // z = z^2 + c
      const zRe2 = zRe.mul(zRe);
      const zIm2 = zIm.mul(zIm);
      const zReIm = zRe.mul(zIm);

      const newRe = zRe2.sub(zIm2).add(cRe);
      const newIm = zReIm.mul2().add(cIm);

      zRe = newRe;
      zIm = newIm;
    }

    return {
      data: new Float32Array(points),
      length: points.length / 4,
      escaped: escaped,
    };
  }

  return {
    HP,
    computeReferenceOrbit,
  };
})();
