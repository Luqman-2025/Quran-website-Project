/* Nur al-Quran — vanilla JS SPA
 * Data: https://api.alquran.cloud
 * Audio: https://cdn.islamic.network
 */

const API = "https://api.alquran.cloud/v1";
const AUDIO_CDN = "https://cdn.islamic.network/quran/audio/128";
const CONTINUE_KEY = "quran-continue";
const THEME_KEY = "quran-theme";

const RECITERS = [
  { id: "ar.alafasy", name: "Mishary Alafasy" },
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit (Murattal)" },
  { id: "ar.husary", name: "Mahmoud Al-Husary" },
  { id: "ar.minshawi", name: "Mohamed Al-Minshawi" },
  { id: "ar.hudhaify", name: "Ali Al-Hudhaify" },
  { id: "ar.saoodshuraym", name: "Saud Al-Shuraym" },
];

/* ===== Utilities ===== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
};

async function api(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const body = await res.json();
  if (body.code !== 200) throw new Error(body.status || "API error");
  return body.data;
}

/* ===== Caching ===== */
const cache = new Map();
async function cached(key, loader) {
  if (cache.has(key)) return cache.get(key);
  const p = loader();
  cache.set(key, p);
  try { return await p; } catch (e) { cache.delete(key); throw e; }
}

const getAllSurahs = () => cached("surahs", () => api("/surah"));
const getSurah = (n) => cached(`surah:${n}`, () =>
  api(`/surah/${n}/editions/quran-uthmani,ur.jalandhry`)
);
const getRandomAyah = () => {
  const n = Math.floor(Math.random() * 6236) + 1;
  return api(`/ayah/${n}/editions/quran-uthmani,ur.jalandhry`);
};
const searchQuran = (q) => api(`/search/${encodeURIComponent(q)}/all/en`);

/* ===== Continue reading ===== */
const saveContinue = (data) => localStorage.setItem(CONTINUE_KEY, JSON.stringify(data));
const loadContinue = () => {
  try { return JSON.parse(localStorage.getItem(CONTINUE_KEY) || "null"); }
  catch { return null; }
};

/* ===== Theme ===== */
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const isDark = saved ? saved === "dark" : true;
  document.documentElement.classList.toggle("dark", isDark);
  $("#themeToggle").textContent = isDark ? "☀️" : "🌙";
}
$("#themeToggle").addEventListener("click", () => {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  $("#themeToggle").textContent = isDark ? "☀️" : "🌙";
});

/* ===== Router (hash-based) ===== */
const routes = {
  "/": renderHome,
  "/surahs": renderSurahs,
  "/surah/:n": renderSurah,
};

function parseHash() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [path, anchor] = hash.split("#");
  for (const pattern of Object.keys(routes)) {
    const pKeys = [];
    const regex = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => {
      pKeys.push(k); return "([^/]+)";
    }) + "$");
    const m = path.match(regex);
    if (m) {
      const params = {};
      pKeys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1]));
      return { handler: routes[pattern], params, anchor };
    }
  }
  return { handler: renderNotFound, params: {}, anchor: null };
}

async function router() {
  const { handler, params, anchor } = parseHash();
  const app = $("#app");
  app.innerHTML = "";
  window.scrollTo(0, 0);
  await handler(app, params);
  if (anchor) {
    setTimeout(() => {
      const t = document.getElementById(anchor);
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }
}

window.addEventListener("hashchange", router);

/* ===== Views ===== */
function surahCard(s) {
  return el("a", { href: `#/surah/${s.number}`, class: "surah-card" },
    el("div", { class: "surah-num" }, String(s.number)),
    el("div", { class: "surah-info" },
      el("div", { class: "name" }, s.englishName),
      el("div", { class: "sub" }, `${s.englishNameTranslation} · ${s.numberOfAyahs} ayahs · ${s.revelationType}`)
    ),
    el("div", { class: "surah-ar" }, s.name)
  );
}

async function renderHome(app) {
  const tpl = $("#tpl-home").content.cloneNode(true);
  app.appendChild(tpl);

  // Continue reading
  const cont = loadContinue();
  if (cont) {
    const sec = $("#continueSection");
    sec.classList.remove("hidden");
    sec.appendChild(el("h2", { class: "section-title" }, "▶ Continue reading"));
    sec.appendChild(el("a", {
      href: `#/surah/${cont.surahNumber}#ayah-${cont.ayahNumber}`,
      class: "continue-card"
    },
      el("div", { class: "badge" }, "📖"),
      el("div", { style: "flex:1;min-width:0" },
        el("div", { class: "sub dim", style: "font-size:.75rem;text-transform:uppercase;letter-spacing:.1em" }, "Where you left off"),
        el("div", { class: "display", style: "font-size:1.15rem;font-weight:600" },
          `${cont.englishName} · Ayah ${cont.ayahNumber} of ${cont.totalAyahs}`)
      ),
      el("div", { class: "gold" }, "→")
    ));
  }

  // Search
  $("#searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $("#searchInput").value.trim();
    if (!q) return;
    const sec = $("#searchResults");
    sec.classList.remove("hidden");
    sec.innerHTML = "";
    sec.appendChild(el("h2", { class: "section-title" }, "🔍 Search results"));
    sec.appendChild(el("p", { class: "dim" }, "Searching…"));
    try {
      const data = await searchQuran(q);
      const matches = (data.matches || []).slice(0, 20);
      sec.innerHTML = "";
      const header = el("h2", { class: "section-title" }, "🔍 Search results");
      const clear = el("button", {
        class: "btn", style: "margin-left:auto",
        onclick: () => { sec.classList.add("hidden"); sec.innerHTML = ""; $("#searchInput").value = ""; }
      }, "Clear");
      header.style.display = "flex"; header.style.alignItems = "center"; header.style.gap = ".5rem";
      header.appendChild(clear);
      sec.appendChild(header);
      if (matches.length === 0) {
        sec.appendChild(el("p", { class: "dim" }, "No matches found."));
      } else {
        const list = el("div", { class: "results" });
        matches.forEach((m) => {
          list.appendChild(el("a", {
            class: "result",
            href: `#/surah/${m.surah.number}#ayah-${m.numberInSurah}`
          },
            el("div", { class: "who" }, `${m.surah.englishName} · Ayah ${m.numberInSurah}`),
            el("p", {}, m.text)
          ));
        });
        sec.appendChild(list);
      }
    } catch {
      sec.innerHTML = "";
      sec.appendChild(el("p", { class: "error" }, "Search failed. Try again."));
    }
  });

  // Daily ayah
  renderDailyAyah();

  // Surah list
  const grid = $("#surahGrid");
  for (let i = 0; i < 12; i++) grid.appendChild(el("div", { class: "skeleton" }));
  try {
    const surahs = await getAllSurahs();
    const render = (filter = "") => {
      grid.innerHTML = "";
      const items = filter
        ? surahs.filter(s =>
            s.englishName.toLowerCase().includes(filter.toLowerCase()) ||
            s.englishNameTranslation.toLowerCase().includes(filter.toLowerCase()) ||
            String(s.number) === filter)
        : surahs;
      items.forEach(s => grid.appendChild(surahCard(s)));
    };
    render();
    $("#filterInput").addEventListener("input", (e) => render(e.target.value));
  } catch {
    grid.innerHTML = "";
    grid.appendChild(el("p", { class: "error" }, "Could not load surahs."));
  }
}

async function renderDailyAyah() {
  const box = $("#dailyAyah");
  try {
    const data = await getRandomAyah();
    const ar = data[0], ur = data[1];
    box.innerHTML = "";
    box.appendChild(el("p", { class: "arabic" }, ar.text));
    box.appendChild(el("p", { class: "urdu" }, ur.text));
    const meta = el("div", { class: "meta" },
      el("span", { class: "who" }, `${ar.surah.englishName} · Ayah ${ar.numberInSurah}`),
      el("div", {},
        el("button", { class: "btn", onclick: renderDailyAyah }, "New ayah"),
        " ",
        el("a", { class: "btn btn-gold", href: `#/surah/${ar.surah.number}#ayah-${ar.numberInSurah}` }, "Read in context")
      )
    );
    box.appendChild(meta);
  } catch {
    box.innerHTML = "";
    box.appendChild(el("p", { class: "error" }, "Could not load ayah."));
  }
}

async function renderSurahs(app) {
  const tpl = $("#tpl-surahs").content.cloneNode(true);
  app.appendChild(tpl);
  const grid = $("#surahGrid");
  for (let i = 0; i < 12; i++) grid.appendChild(el("div", { class: "skeleton" }));
  try {
    const surahs = await getAllSurahs();
    const render = (filter = "") => {
      grid.innerHTML = "";
      const items = filter
        ? surahs.filter(s =>
            s.englishName.toLowerCase().includes(filter.toLowerCase()) ||
            s.englishNameTranslation.toLowerCase().includes(filter.toLowerCase()) ||
            String(s.number) === filter)
        : surahs;
      items.forEach(s => grid.appendChild(surahCard(s)));
    };
    render();
    $("#filterInput").addEventListener("input", (e) => render(e.target.value));
  } catch {
    grid.innerHTML = "";
    grid.appendChild(el("p", { class: "error" }, "Could not load surahs."));
  }
}

async function renderSurah(app, { n }) {
  const tpl = $("#tpl-surah").content.cloneNode(true);
  app.appendChild(tpl);
  const header = $("#surahHeader");
  const bar = $("#audioBar");
  const list = $("#ayahList");
  list.appendChild(el("p", { class: "dim" }, "Loading Surah…"));

  let data;
  try {
    data = await getSurah(n);
  } catch {
    list.innerHTML = "";
    list.appendChild(el("p", { class: "error" }, "Could not load Surah."));
    return;
  }
  const arabic = data[0], urdu = data[1];

  // Header
  header.appendChild(el("div", { class: "ar" }, arabic.name));
  header.appendChild(el("h1", {}, `${arabic.englishName} — ${arabic.englishNameTranslation}`));
  header.appendChild(el("div", { class: "meta" },
    `Surah ${arabic.number} · ${arabic.numberOfAyahs} ayahs · ${arabic.revelationType}`));

  // Audio bar
  const select = el("select", {},
    ...RECITERS.map(r => el("option", { value: r.id }, r.name))
  );
  const audio = el("audio", { controls: "", preload: "none" });
  const savedReciter = localStorage.getItem("quran-reciter") || RECITERS[0].id;
  select.value = savedReciter;

  const playAyah = (globalNumber, ayahEl) => {
    audio.src = `${AUDIO_CDN}/${select.value}/${globalNumber}.mp3`;
    audio.play().catch(() => {});
    $$(".ayah.playing").forEach(x => x.classList.remove("playing"));
    if (ayahEl) ayahEl.classList.add("playing");
  };

  select.addEventListener("change", () => {
    localStorage.setItem("quran-reciter", select.value);
    if (audio.src) {
      const playing = $(".ayah.playing");
      if (playing) playAyah(playing.dataset.global, playing);
    }
  });

  bar.appendChild(el("span", { style: "font-size:.85rem;color:var(--muted-fg)" }, "🎧 Reciter:"));
  bar.appendChild(select);
  bar.appendChild(audio);

  // Ayahs
  list.innerHTML = "";
  arabic.ayahs.forEach((a, idx) => {
    const u = urdu.ayahs[idx];
    const ayahEl = el("div", {
      class: "ayah",
      id: `ayah-${a.numberInSurah}`,
      "data-global": String(a.number),
    });
    const top = el("div", { class: "top" },
      el("span", { class: "badge" }, String(a.numberInSurah)),
      el("div", { class: "tools" },
        el("button", {
          onclick: () => {
            playAyah(a.number, ayahEl);
            saveContinue({
              surahNumber: arabic.number,
              surahName: arabic.name,
              englishName: arabic.englishName,
              ayahNumber: a.numberInSurah,
              totalAyahs: arabic.numberOfAyahs,
            });
          }
        }, "▶ Play"),
        el("button", {
          onclick: () => {
            navigator.clipboard?.writeText(`${a.text}\n\n${u.text}\n— ${arabic.englishName} ${a.numberInSurah}`);
          }
        }, "Copy")
      )
    );
    ayahEl.appendChild(top);
    ayahEl.appendChild(el("p", { class: "arabic" }, a.text));
    ayahEl.appendChild(el("p", { class: "urdu" }, u.text));
    ayahEl.appendChild(el("p", { class: "juz-info" }, `Juz ${a.juz} · Page ${a.page} · Hizb Q${a.hizbQuarter}`));
    list.appendChild(ayahEl);
  });

  // Autoplay next ayah in order
  audio.addEventListener("ended", () => {
    const current = $(".ayah.playing");
    if (!current) return;
    const next = current.nextElementSibling;
    if (next && next.classList.contains("ayah")) {
      playAyah(next.dataset.global, next);
      saveContinue({
        surahNumber: arabic.number,
        surahName: arabic.name,
        englishName: arabic.englishName,
        ayahNumber: parseInt(next.id.replace("ayah-", ""), 10),
        totalAyahs: arabic.numberOfAyahs,
      });
    }
  });
}

function renderNotFound(app) {
  app.appendChild(el("div", { class: "container", style: "text-align:center;padding:5rem 1rem" },
    el("p", { class: "arabic gold big" }, "﷽"),
    el("h1", { class: "display", style: "font-size:3rem" }, "404"),
    el("p", { class: "dim" }, "The page you are seeking does not exist."),
    el("a", { href: "#/", class: "btn btn-gold", style: "margin-top:1rem;display:inline-block" }, "Return home")
  ));
}

/* ===== Boot ===== */
document.getElementById("year").textContent = new Date().getFullYear();
initTheme();
router();
