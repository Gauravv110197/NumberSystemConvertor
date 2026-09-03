const BASES = ["DEC","BIN","OCT","HEX","BCD","GRAY"];
const BASE_RADIX = { BIN:2, OCT:8, HEX:16 };
const BASE_FULLNAME = {
  DEC:"Decimal", BIN:"Binary", OCT:"Octal", HEX:"Hexadecimal", BCD:"BCD (8421)", GRAY:"Gray Code"
};

let currentBase = "DEC";

const inputEl = document.getElementById("numInput");
const errorEl = document.getElementById("errorMsg");
const gridEl = document.getElementById("resultsGrid");
const switchesEl = document.getElementById("baseSwitches");
const stepsModal = document.getElementById("stepsModal");
const modalClose = document.getElementById("modalClose");
const modalSteps = document.getElementById("modalSteps");
const stepsTitle = document.getElementById("stepsTitle");
const stepsSubtitle = document.getElementById("stepsSubtitle");
const modalNote = document.getElementById("modalNote");

switchesEl.addEventListener("click", (e) => {
  const sw = e.target.closest(".switch");
  if(!sw) return;
  [...switchesEl.children].forEach(c => c.classList.remove("active"));
  sw.classList.add("active");
  currentBase = sw.dataset.base;
  applyPlaceholder();
  compute();
});

inputEl.addEventListener("input", compute);

function applyPlaceholder(){
  const examples = { DEC:"156 or 156.375", BIN:"10011100 or 1001.011", OCT:"234 or 234.3", HEX:"9C or 9C.6", BCD:"0001 0101 0110", GRAY:"11101011" };
  inputEl.placeholder = "e.g. " + examples[currentBase];
}

/* ---------------- Core conversion engine ---------------- */

function decToBaseSteps(intVal, radix){
  const steps = [];
  const digits = [];
  let n = intVal;
  if(n === 0){
    steps.push(`0 ÷ ${radix} → quotient 0, remainder 0`);
    digits.push("0");
  }
  while(n > 0){
    const r = n % radix;
    const q = Math.floor(n / radix);
    steps.push(`${n} ÷ ${radix} = ${q}, remainder ${r} → digit "${r.toString(radix).toUpperCase()}"`);
    digits.push(r.toString(radix).toUpperCase());
    n = q;
  }
  digits.reverse();
  return { result: digits.join(""), steps };
}

function fracToBaseSteps(fracVal, radix, maxDigits = 8){
  const steps = [];
  const digits = [];
  let f = fracVal;
  let i = 0;
  while(f > 1e-9 && i < maxDigits){
    const prev = f;
    f = f * radix;
    const d = Math.floor(f + 1e-9);
    steps.push(`${prev.toFixed(6)} × ${radix} = ${f.toFixed(6)} → digit "${d.toString(radix).toUpperCase()}"`);
    digits.push(d.toString(radix).toUpperCase());
    f = f - d;
    i++;
  }
  return { result: digits.join(""), steps };
}

function baseToDecimalSteps(str, radix){
  const steps = [];
  const chars = str.split("");
  const n = chars.length;
  let val = 0;
  const parts = [];
  chars.forEach((ch, idx) => {
    const power = n - 1 - idx;
    const dv = parseInt(ch, radix);
    const contrib = dv * Math.pow(radix, power);
    val += contrib;
    steps.push(`"${ch.toUpperCase()}" × ${radix}^${power} = ${dv} × ${Math.pow(radix,power)} = ${contrib}`);
    parts.push(contrib);
  });
  steps.push(`Sum: ${parts.join(" + ")} = ${val}`);
  return { result: val, steps };
}

function fracBaseToDecimalSteps(str, radix){
  const steps = [];
  let val = 0;
  const parts = [];
  str.split("").forEach((ch, idx) => {
    const power = -(idx + 1);
    const dv = parseInt(ch, radix);
    const contrib = dv * Math.pow(radix, power);
    val += contrib;
    steps.push(`"${ch.toUpperCase()}" × ${radix}^${power} = ${contrib.toFixed(6)}`);
    parts.push(contrib.toFixed(6));
  });
  steps.push(`Sum: ${parts.join(" + ")} = ${val.toFixed(6)}`);
  return { result: val, steps };
}

function binToGraySteps(bin){
  const steps = [];
  let gray = bin[0];
  steps.push(`MSB copied as-is → g0 = b0 = ${bin[0]}`);
  for(let i = 1; i < bin.length; i++){
    const bit = (parseInt(bin[i-1]) ^ parseInt(bin[i])).toString();
    steps.push(`g${i} = b${i-1} XOR b${i} = ${bin[i-1]} XOR ${bin[i]} = ${bit}`);
    gray += bit;
  }
  return { result: gray, steps };
}

function grayToBinSteps(gray){
  const steps = [];
  let bin = gray[0];
  steps.push(`MSB copied as-is → b0 = g0 = ${gray[0]}`);
  for(let i = 1; i < gray.length; i++){
    const bit = (parseInt(bin[i-1]) ^ parseInt(gray[i])).toString();
    steps.push(`b${i} = b${i-1} XOR g${i} = ${bin[i-1]} XOR ${gray[i]} = ${bit}`);
    bin += bit;
  }
  return { result: bin, steps };
}

function decIntToBCDSteps(intStr){
  const steps = [];
  const groups = [];
  intStr.split("").forEach(ch => {
    const b = parseInt(ch, 10).toString(2).padStart(4, "0");
    steps.push(`digit "${ch}" → ${b}`);
    groups.push(b);
  });
  return { result: groups.join(" "), steps };
}

function bcdToDecSteps(str){
  const clean = str.trim().split(/\s+/);
  const steps = [];
  let digits = "";
  for(const grp of clean){
    if(!/^[01]{4}$/.test(grp)) return null;
    const val = parseInt(grp, 2);
    if(val > 9) return null;
    steps.push(`${grp} → ${val}`);
    digits += val;
  }
  steps.push(`Digits combined → ${digits}`);
  return { result: parseInt(digits, 10), steps, digits };
}

/* ---------------- Validation ---------------- */

function validateInput(str, base){
  if(str === "") return { valid:false, message:"" };
  const s = str.trim();
  if(base === "DEC"){
    if(!/^\d+(\.\d+)?$/.test(s)) return { valid:false, message:"Decimal input can only contain digits 0–9 and one decimal point." };
  } else if(base === "BIN"){
    if(!/^[01]+(\.[01]+)?$/.test(s)) return { valid:false, message:"Binary input can only contain digits 0 and 1." };
  } else if(base === "OCT"){
    if(!/^[0-7]+(\.[0-7]+)?$/.test(s)) return { valid:false, message:"Octal input can only contain digits 0–7." };
  } else if(base === "HEX"){
    if(!/^[0-9A-Fa-f]+(\.[0-9A-Fa-f]+)?$/.test(s)) return { valid:false, message:"Hex input can only contain digits 0–9 and letters A–F." };
  } else if(base === "GRAY"){
    if(!/^[01]+$/.test(s)) return { valid:false, message:"Gray code input can only contain digits 0 and 1 (no fraction)." };
  } else if(base === "BCD"){
    const groups = s.split(/\s+/);
    const ok = groups.every(g => /^[01]{4}$/.test(g) && parseInt(g,2) <= 9);
    if(!ok) return { valid:false, message:"BCD input must be groups of 4 bits, each 0000–1001, separated by spaces." };
  }
  return { valid:true, message:"" };
}

/* ---------------- Main compute + render ---------------- */

function compute(){
  const raw = inputEl.value.trim();
  const v = validateInput(raw, currentBase);
  inputEl.classList.toggle("invalid", raw !== "" && !v.valid);
  errorEl.textContent = v.valid ? "" : v.message;

  if(raw === "" || !v.valid){
    gridEl.innerHTML = "";
    return;
  }

  // Step 1: get decimal value + binary string of integer part + steps to decimal
  let decInt = 0, decFrac = 0, toDecSteps = [], toDecTitle = "";
  let binIntStr = null; // reused for gray target

  if(currentBase === "DEC"){
    const [i, f] = raw.split(".");
    decInt = parseInt(i, 10);
    decFrac = f ? parseFloat("0." + f) : 0;
    toDecSteps = [`Already in decimal: ${raw}`];
    toDecTitle = "Already decimal";
  } else if(currentBase === "BIN" || currentBase === "OCT" || currentBase === "HEX"){
    const radix = BASE_RADIX[currentBase];
    const [i, f] = raw.split(".");
    const intStep = baseToDecimalSteps(i.toUpperCase(), radix);
    decInt = intStep.result;
    toDecSteps = [...intStep.steps];
    if(f){
      const fracStep = fracBaseToDecimalSteps(f.toUpperCase(), radix);
      decFrac = fracStep.result;
      toDecSteps.push(`Fractional part:`, ...fracStep.steps);
    }
    toDecTitle = `${BASE_FULLNAME[currentBase]} → Decimal (positional weights)`;
    if(currentBase === "BIN") binIntStr = i;
  } else if(currentBase === "GRAY"){
    const g2b = grayToBinSteps(raw);
    binIntStr = g2b.result;
    const b2d = baseToDecimalSteps(binIntStr, 2);
    decInt = b2d.result;
    toDecSteps = [...g2b.steps, `Now convert binary "${binIntStr}" to decimal:`, ...b2d.steps];
    toDecTitle = "Gray → Binary → Decimal";
  } else if(currentBase === "BCD"){
    const b2d = bcdToDecSteps(raw);
    decInt = b2d.result;
    toDecSteps = b2d.steps;
    toDecTitle = "BCD → Decimal (per nibble)";
  }

  // Step 2: from decimal, build every target
  const cards = [];

  // DEC card
  const decDisplay = decFrac > 0 ? `${decInt}.${decFrac.toFixed(6).split(".")[1].replace(/0+$/,'') || '0'}` : `${decInt}`;
  cards.push(buildCard("DEC", decDisplay, currentBase === "DEC" ? [`This is your input value.`] : toDecSteps, currentBase === "DEC"));

  // BIN card
  {
    const intS = decToBaseSteps(decInt, 2);
    let steps = [...intS.steps];
    let result = intS.result;
    if(decFrac > 0){
      const fracS = fracToBaseSteps(decFrac, 2);
      steps.push(`Fractional part (multiply by 2, take integer part):`, ...fracS.steps);
      result += "." + fracS.result;
    }
    binIntStr = binIntStr || intS.result;
    cards.push(buildCard("BIN", result, currentBase === "BIN" ? [`This is your input value.`] : steps, currentBase === "BIN"));
  }

  // OCT card
  {
    const intS = decToBaseSteps(decInt, 8);
    let steps = [...intS.steps];
    let result = intS.result;
    if(decFrac > 0){
      const fracS = fracToBaseSteps(decFrac, 8);
      steps.push(`Fractional part (multiply by 8, take integer part):`, ...fracS.steps);
      result += "." + fracS.result;
    }
    cards.push(buildCard("OCT", result, currentBase === "OCT" ? [`This is your input value.`] : steps, currentBase === "OCT"));
  }

  // HEX card
  {
    const intS = decToBaseSteps(decInt, 16);
    let steps = [...intS.steps];
    let result = intS.result;
    if(decFrac > 0){
      const fracS = fracToBaseSteps(decFrac, 16);
      steps.push(`Fractional part (multiply by 16, take integer part):`, ...fracS.steps);
      result += "." + fracS.result;
    }
    cards.push(buildCard("HEX", result, currentBase === "HEX" ? [`This is your input value.`] : steps, currentBase === "HEX"));
  }

  // BCD card (integer part only)
  {
    const bcdS = decIntToBCDSteps(String(decInt));
    let steps = [...bcdS.steps];
    let note = decFrac > 0 ? "BCD shown for the integer part only — fractional BCD isn't standard in intro courses." : null;
    cards.push(buildCard("BCD", bcdS.result, currentBase === "BCD" ? [`This is your input value.`] : steps, currentBase === "BCD", note));
  }

  // GRAY card (integer part only, from binary of integer part)
  {
    const grayS = binToGraySteps(binIntStr);
    let steps = [`Start from binary of the integer part: ${binIntStr}`, ...grayS.steps];
    let note = decFrac > 0 ? "Gray code shown for the integer part only." : null;
    cards.push(buildCard("GRAY", grayS.result, currentBase === "GRAY" ? [`This is your input value.`] : steps, currentBase === "GRAY", note));
  }

  gridEl.innerHTML = "";
  cards.forEach(c => gridEl.appendChild(c));
}

function openSteps(base, steps, note){
  stepsTitle.textContent = `${BASE_FULLNAME[base]} working`;
  stepsSubtitle.textContent = `${steps.length} step${steps.length !== 1 ? "s" : ""} shown clearly`;
  modalSteps.innerHTML = "";
  steps.forEach(step => {
    const li = document.createElement("li");
    li.textContent = step;
    modalSteps.appendChild(li);
  });
  modalNote.textContent = note || "";
  stepsModal.hidden = false;
  modalClose.focus();
}

function closeSteps(){
  stepsModal.hidden = true;
}

modalClose.addEventListener("click", closeSteps);
stepsModal.addEventListener("click", event => {
  if(event.target === stepsModal) closeSteps();
});
document.addEventListener("keydown", event => {
  if(event.key === "Escape" && !stepsModal.hidden) closeSteps();
});

function buildCard(base, value, steps, isSource, note){
  const card = document.createElement("div");
  card.className = "card" + (isSource ? " is-source" : "");

  const top = document.createElement("div");
  top.className = "card-top";
  top.innerHTML = `
    <div class="card-head">
      <span class="card-name">${BASE_FULLNAME[base]}</span>
      <span class="card-tag">${isSource ? "input" : base}</span>
    </div>
    <div class="card-value">${value}</div>
  `;
  card.appendChild(top);

  const toggle = document.createElement("button");
  toggle.className = "steps-toggle";
  toggle.innerHTML = `<span>Show working (${steps.length} step${steps.length !== 1 ? "s" : ""})</span><span class="chev">›</span>`;

  toggle.addEventListener("click", () => openSteps(base, steps, note));

  card.appendChild(toggle);
  return card;
}

applyPlaceholder();
inputEl.value = "156";
compute();