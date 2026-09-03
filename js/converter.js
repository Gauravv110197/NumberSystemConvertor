const BASE_RADIX = { BIN:2, OCT:8, HEX:16 };
const BASE_FULLNAME = { DEC:"Decimal", BIN:"Binary", OCT:"Octal", HEX:"Hex", BCD:"BCD", GRAY:"Gray code" };
const BASE_INDEX = { DEC:"01", BIN:"02", OCT:"03", HEX:"04", BCD:"05", GRAY:"06" };

let currentBase = "DEC";
const inputEl = document.getElementById("numInput");
const errorEl = document.getElementById("errorMsg");
const gridEl = document.getElementById("resultsGrid");
const switchesEl = document.getElementById("baseSwitches");

switchesEl.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if(!chip) return;
  [...switchesEl.children].forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  currentBase = chip.dataset.base;
  applyPlaceholder();
  compute();
});

inputEl.addEventListener("input", compute);

function applyPlaceholder(){
  const examples = { DEC:"156 or 156.375", BIN:"10011100 or 1001.011", OCT:"234 or 234.3", HEX:"9C or 9C.6", BCD:"0001 0101 0110", GRAY:"11101011" };
  inputEl.placeholder = "e.g. " + examples[currentBase];
}

function decToBaseSteps(intVal, radix){
  const steps = [], digits = [];
  let n = intVal;
  if(n === 0){ steps.push(`0 ÷ ${radix} → quotient 0, remainder 0`); digits.push("0"); }
  while(n > 0){
    const r = n % radix, q = Math.floor(n / radix);
    steps.push(`${n} ÷ ${radix} = ${q}, remainder ${r} → digit "${r.toString(radix).toUpperCase()}"`);
    digits.push(r.toString(radix).toUpperCase()); n = q;
  }
  digits.reverse();
  return { result: digits.join(""), steps };
}

function fracToBaseSteps(fracVal, radix, maxDigits = 8){
  const steps = [], digits = [];
  let f = fracVal, i = 0;
  while(f > 1e-9 && i < maxDigits){
    const prev = f; f = f * radix; const d = Math.floor(f + 1e-9);
    steps.push(`${prev.toFixed(6)} × ${radix} = ${f.toFixed(6)} → digit "${d.toString(radix).toUpperCase()}"`);
    digits.push(d.toString(radix).toUpperCase()); f = f - d; i++;
  }
  return { result: digits.join(""), steps };
}

function baseToDecimalSteps(str, radix){
  const steps = [], chars = str.split(""), parts = []; let val = 0;
  chars.forEach((ch, idx) => {
    const power = chars.length - 1 - idx, dv = parseInt(ch, radix), contrib = dv * Math.pow(radix, power);
    val += contrib;
    steps.push(`"${ch.toUpperCase()}" × ${radix}^${power} = ${dv} × ${Math.pow(radix,power)} = ${contrib}`); parts.push(contrib);
  });
  steps.push(`Add them up: ${parts.join(" + ")} = ${val}`);
  return { result: val, steps };
}

function fracBaseToDecimalSteps(str, radix){
  const steps = [], parts = []; let val = 0;
  str.split("").forEach((ch, idx) => {
    const power = -(idx + 1), dv = parseInt(ch, radix), contrib = dv * Math.pow(radix, power);
    val += contrib; steps.push(`"${ch.toUpperCase()}" × ${radix}^${power} = ${contrib.toFixed(6)}`); parts.push(contrib.toFixed(6));
  });
  steps.push(`Add them up: ${parts.join(" + ")} = ${val.toFixed(6)}`);
  return { result: val, steps };
}

function binToGraySteps(bin){
  const steps = []; let gray = bin[0]; steps.push(`First bit stays the same → ${bin[0]}`);
  for(let i = 1; i < bin.length; i++){
    const bit = (parseInt(bin[i-1]) ^ parseInt(bin[i])).toString();
    steps.push(`Compare bit ${i-1} and bit ${i}: ${bin[i-1]} vs ${bin[i]} → ${bit}`); gray += bit;
  }
  return { result: gray, steps };
}

function grayToBinSteps(gray){
  const steps = []; let bin = gray[0]; steps.push(`First bit stays the same → ${gray[0]}`);
  for(let i = 1; i < gray.length; i++){
    const bit = (parseInt(bin[i-1]) ^ parseInt(gray[i])).toString();
    steps.push(`Compare the last binary bit with this Gray bit: ${bin[i-1]} vs ${gray[i]} → ${bit}`); bin += bit;
  }
  return { result: bin, steps };
}

function decIntToBCDSteps(intStr){
  const steps = [], groups = [];
  intStr.split("").forEach(ch => { const b = parseInt(ch, 10).toString(2).padStart(4, "0"); steps.push(`Digit "${ch}" → ${b}`); groups.push(b); });
  return { result: groups.join(" "), steps };
}

function bcdToDecSteps(str){
  const clean = str.trim().split(/\s+/), steps = []; let digits = "";
  for(const grp of clean){
    if(!/^[01]{4}$/.test(grp)) return null;
    const val = parseInt(grp, 2); if(val > 9) return null;
    steps.push(`${grp} → ${val}`); digits += val;
  }
  steps.push(`Put the digits together → ${digits}`);
  return { result: parseInt(digits, 10), steps, digits };
}

const METHOD = {
  toDecFromBase: (radix) => `Multiply each digit by ${radix} raised to its position (counting from 0, right to left), then add everything up.`,
  toDecFrac: (radix) => `Same idea for the digits after the point — just use negative powers of ${radix}.`,
  fromDecToBase: (radix) => `Divide the number by ${radix} over and over, and read the remainders from bottom to top.`,
  fromDecFrac: (radix) => `Multiply the fraction by ${radix} again and again, keeping the whole-number part each time.`,
  grayFromBin: `Keep the first bit as it is. For every bit after that, compare it with the one before it — different gives 1, same gives 0.`,
  binFromGray: `Keep the first bit as it is. For every bit after that, compare it with the binary bit you just worked out.`,
  bcdFromDec: `Take each decimal digit on its own and write it as 4 bits (0000 to 1001).`,
  decFromBcd: `Split the bits into groups of 4, turn each group back into a digit, then read the digits in order.`
};

function validateInput(str, base){
  if(str === "") return { valid:false, message:"" };
  const s = str.trim();
  if(base === "DEC" && !/^\d+(\.\d+)?$/.test(s)) return { valid:false, message:"Just numbers 0–9, and one dot if it has a decimal part." };
  if(base === "BIN" && !/^[01]+(\.[01]+)?$/.test(s)) return { valid:false, message:"Only 0s and 1s, please." };
  if(base === "OCT" && !/^[0-7]+(\.[0-7]+)?$/.test(s)) return { valid:false, message:"Digits 0–7 only." };
  if(base === "HEX" && !/^[0-9A-Fa-f]+(\.[0-9A-Fa-f]+)?$/.test(s)) return { valid:false, message:"Digits 0–9 and letters A–F only." };
  if(base === "GRAY" && !/^[01]+$/.test(s)) return { valid:false, message:"Only 0s and 1s — Gray code doesn't use a decimal point here." };
  if(base === "BCD"){
    const groups = s.split(/\s+/), ok = groups.every(g => /^[01]{4}$/.test(g) && parseInt(g,2) <= 9);
    if(!ok) return { valid:false, message:"Groups of 4 bits (0000–1001), one group per digit, separated by spaces." };
  }
  return { valid:true, message:"" };
}

function compute(){
  const raw = inputEl.value.trim(), v = validateInput(raw, currentBase);
  inputEl.classList.toggle("invalid", raw !== "" && !v.valid); errorEl.textContent = v.valid ? "" : v.message;
  if(raw === "" || !v.valid){ gridEl.innerHTML = ""; return; }
  let decInt = 0, decFrac = 0, toDecSteps = [], toDecMethod = "", binIntStr = null;
  if(currentBase === "DEC"){
    const [i, f] = raw.split("."); decInt = parseInt(i, 10); decFrac = f ? parseFloat("0." + f) : 0;
  } else if(["BIN", "OCT", "HEX"].includes(currentBase)){
    const radix = BASE_RADIX[currentBase], [i, f] = raw.split("."), intStep = baseToDecimalSteps(i.toUpperCase(), radix);
    decInt = intStep.result; toDecSteps = [...intStep.steps]; toDecMethod = METHOD.toDecFromBase(radix);
    if(f){ const fracStep = fracBaseToDecimalSteps(f.toUpperCase(), radix); decFrac = fracStep.result; toDecSteps.push(`Now the part after the point:`, ...fracStep.steps); toDecMethod += " " + METHOD.toDecFrac(radix); }
    if(currentBase === "BIN") binIntStr = i;
  } else if(currentBase === "GRAY"){
    const g2b = grayToBinSteps(raw), b2d = baseToDecimalSteps(g2b.result, 2); binIntStr = g2b.result; decInt = b2d.result;
    toDecSteps = [...g2b.steps, `Now turn that binary "${binIntStr}" into decimal:`, ...b2d.steps]; toDecMethod = METHOD.binFromGray + " Then " + METHOD.toDecFromBase(2).toLowerCase();
  } else if(currentBase === "BCD"){
    const b2d = bcdToDecSteps(raw); decInt = b2d.result; toDecSteps = b2d.steps; toDecMethod = METHOD.decFromBcd;
  }
  const cards = [], decDisplay = decFrac > 0 ? `${decInt}.${decFrac.toFixed(6).split(".")[1].replace(/0+$/,'') || '0'}` : `${decInt}`;
  cards.push(buildResult("DEC", decDisplay, currentBase === "DEC" ? "" : toDecMethod, currentBase === "DEC" ? [] : toDecSteps, currentBase === "DEC"));
  [["BIN", 2], ["OCT", 8], ["HEX", 16]].forEach(([base, radix]) => {
    const intS = decToBaseSteps(decInt, radix); let steps = [...intS.steps], result = intS.result, method = METHOD.fromDecToBase(radix);
    if(decFrac > 0){ const fracS = fracToBaseSteps(decFrac, radix); steps.push(`Now the fractional part:`, ...fracS.steps); result += "." + fracS.result; method += " " + METHOD.fromDecFrac(radix); }
    if(base === "BIN") binIntStr = binIntStr || intS.result;
    cards.push(buildResult(base, result, currentBase === base ? "" : method, currentBase === base ? [] : steps, currentBase === base));
  });
  const bcdS = decIntToBCDSteps(String(decInt));
  cards.push(buildResult("BCD", bcdS.result, currentBase === "BCD" ? "" : METHOD.bcdFromDec, currentBase === "BCD" ? [] : bcdS.steps, currentBase === "BCD", decFrac > 0 ? "Shown for the whole-number part only — BCD doesn't have a standard way to write fractions." : null));
  const grayS = binToGraySteps(binIntStr);
  cards.push(buildResult("GRAY", grayS.result, currentBase === "GRAY" ? "" : METHOD.grayFromBin, currentBase === "GRAY" ? [] : [`Start from the binary version of the whole number: ${binIntStr}`, ...grayS.steps], currentBase === "GRAY", decFrac > 0 ? "Shown for the whole-number part only." : null));
  gridEl.innerHTML = ""; cards.forEach(c => gridEl.appendChild(c));
}

function buildResult(base, value, method, steps, isSource, note){
  const row = document.createElement("div"); row.className = "result" + (isSource ? " is-source" : "");
  const top = document.createElement("div"); top.className = "result-top";
  top.innerHTML = `<span class="result-index">${BASE_INDEX[base]}</span><div class="result-left"><div class="result-name">${BASE_FULLNAME[base]}</div><div class="result-value">${value}</div></div>${isSource ? `<span class="source-badge">You typed this</span>` : ``}`;
  row.appendChild(top);
  if(steps.length){
    const toggle = document.createElement("button"); toggle.className = "how-toggle"; toggle.innerHTML = `<span>How? (${steps.length} step${steps.length !== 1 ? "s" : ""})</span><span class="chev">›</span>`;
    const body = document.createElement("div"); body.className = "how-body"; const inner = document.createElement("div"); inner.className = "how-inner";
    if(method){ const m = document.createElement("p"); m.className = "how-method"; m.textContent = method; inner.appendChild(m); }
    const ol = document.createElement("ol"); steps.forEach(s => { const li = document.createElement("li"); li.textContent = s; ol.appendChild(li); }); inner.appendChild(ol);
    if(note){ const n = document.createElement("div"); n.className = "how-note"; n.textContent = note; inner.appendChild(n); }
    body.appendChild(inner); toggle.addEventListener("click", () => { toggle.classList.toggle("open"); body.classList.toggle("open"); });
    row.appendChild(toggle); row.appendChild(body);
  }
  return row;
}

applyPlaceholder();
inputEl.value = "156";
compute();