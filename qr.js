/*
  QR-Code-Erzeugung ohne externe Bibliothek (keine Daten an fremde Server).
  Byte-Modus, Fehlerkorrektur M, Version 1–20 (bis ca. 330 Zeichen).

  Nutzung:
    QR.svg("https://…", { modul: 6, rand: 4 })   → SVG-Text
    <div data-qr="../schueler/exit-05.html"></div> → wird beim Laden automatisch
                                                   als QR-Code mit absoluter Adresse gefüllt
*/
(function () {
  const ECC_M = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26];
  const BLOCKS_M = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];

  function rawModules(ver) {
    let r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const n = Math.floor(ver / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  const dataCodewords = ver => Math.floor(rawModules(ver) / 8) - ECC_M[ver - 1] * BLOCKS_M[ver - 1];

  function alignPos(ver) {
    if (ver === 1) return [];
    const n = Math.floor(ver / 7) + 2;
    const step = Math.floor((ver * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
    const r = [6];
    for (let i = 0, pos = ver * 4 + 10; i < n - 1; i++, pos -= step) r.splice(1, 0, pos);
    return r;
  }

  // ---------- Reed-Solomon über GF(256) ----------
  function mul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }
  function divisor(deg) {
    const r = new Array(deg).fill(0);
    r[deg - 1] = 1;
    let root = 1;
    for (let i = 0; i < deg; i++) {
      for (let j = 0; j < deg; j++) {
        r[j] = mul(r[j], root);
        if (j + 1 < deg) r[j] ^= r[j + 1];
      }
      root = mul(root, 0x02);
    }
    return r;
  }
  function remainder(data, div) {
    const r = div.map(() => 0);
    for (const b of data) {
      const f = b ^ r.shift();
      r.push(0);
      div.forEach((c, i) => (r[i] ^= mul(c, f)));
    }
    return r;
  }

  function utf8(text) {
    return Array.from(new TextEncoder().encode(text));
  }

  // ---------- Matrix bauen ----------
  function erzeuge(text) {
    const bytes = utf8(text);
    let ver = 1;
    for (; ver <= 20; ver++) {
      const lenBits = ver < 10 ? 8 : 16;
      if (4 + lenBits + bytes.length * 8 <= dataCodewords(ver) * 8) break;
    }
    if (ver > 20) throw new Error("Text zu lang für QR-Code");

    // Bitstrom
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4);
    put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(b => put(b, 8));
    const cap = dataCodewords(ver) * 8;
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));

    // Blöcke + Fehlerkorrektur, verschränken
    const nBlocks = BLOCKS_M[ver - 1], eccLen = ECC_M[ver - 1];
    const raw = Math.floor(rawModules(ver) / 8);
    const nShort = nBlocks - (raw % nBlocks);
    const shortLen = Math.floor(raw / nBlocks);
    const div = divisor(eccLen);
    const blocks = [];
    for (let i = 0, k = 0; i < nBlocks; i++) {
      const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
      k += dat.length;
      const ecc = remainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    const cw = [];
    for (let i = 0; i < blocks[0].length; i++)
      blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) cw.push(b[i]); });

    const size = ver * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const setF = (x, y, dark) => { m[y][x] = dark; fn[y][x] = true; };

    for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setF(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const ap = alignPos(ver), last = ap.length - 1;
    ap.forEach((ax, i) => ap.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
        setF(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));

    const formatBits = mask => {
      const d = (0 << 3) | mask; // Level M = 00
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412;
      const bit = i => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) setF(8, i, bit(i));
      setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
      for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i));
      setF(8, size - 8, true);
    };
    formatBits(0);
    if (ver >= 7) {
      let r = ver;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const b = (ver << 12) | r;
      for (let i = 0; i < 18; i++) {
        const dark = ((b >>> i) & 1) === 1, a = size - 11 + (i % 3), c = Math.floor(i / 3);
        setF(a, c, dark); setF(c, a, dark);
      }
    }

    // Daten einzeichnen (Zickzack)
    let idx = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
        if (!fn[y][x] && idx < cw.length * 8) {
          m[y][x] = ((cw[idx >>> 3] >>> (7 - (idx & 7))) & 1) === 1;
          idx++;
        }
      }
    }

    // Maske wählen (vereinfachte Strafpunkte)
    const MASKEN = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
      (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
    ];
    const anwenden = k => {
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
        if (!fn[y][x] && MASKEN[k](x, y)) m[y][x] = !m[y][x];
    };
    const strafe = () => {
      let p = 0, dunkel = 0;
      for (let y = 0; y < size; y++) {
        for (let dir = 0; dir < 2; dir++) {
          let lauf = 1;
          for (let x = 1; x < size; x++) {
            const a = dir ? m[x][y] : m[y][x], b = dir ? m[x - 1][y] : m[y][x - 1];
            if (a === b) { lauf++; if (lauf === 5) p += 3; else if (lauf > 5) p++; } else lauf = 1;
          }
        }
        for (let x = 0; x < size; x++) {
          if (m[y][x]) dunkel++;
          if (x < size - 1 && y < size - 1) {
            const c = m[y][x];
            if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
          }
        }
      }
      return p + Math.floor(Math.abs(dunkel * 20 - size * size * 10) / (size * size)) * 10;
    };
    let beste = 0, min = Infinity;
    for (let k = 0; k < 8; k++) {
      anwenden(k); formatBits(k);
      const s = strafe();
      if (s < min) { min = s; beste = k; }
      anwenden(k);
    }
    anwenden(beste); formatBits(beste);
    return m;
  }

  function svg(text, opt = {}) {
    const m = erzeuge(text), rand = opt.rand ?? 4, n = m.length + rand * 2;
    let pfad = "";
    m.forEach((zeile, y) => zeile.forEach((d, x) => { if (d) pfad += `M${x + rand},${y + rand}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="QR-Code">` +
      `<rect width="${n}" height="${n}" fill="#fff"/><path d="${pfad}" fill="#000"/></svg>`;
  }

  const QR = { matrix: erzeuge, svg };
  if (typeof module !== "undefined") module.exports = QR;
  if (typeof window !== "undefined") {
    window.QR = QR;
    const fuellen = () => document.querySelectorAll("[data-qr]").forEach(el => {
      const url = new URL(el.dataset.qr, location.href).href;
      el.innerHTML = svg(url);
      el.title = url;
    });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fuellen);
    else fuellen();
  }
})();
