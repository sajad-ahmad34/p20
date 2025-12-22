let state = { data: null, current: null, html: "" };

function toSlug(s) {
    return String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

async function loadData() {
    const res = await fetch("../games.json", { cache: "no-store" });
    const json = await res.json();
    state.data = json;
    document.getElementById("field-baseurl").value = json.baseUrl || "";
    const sel = document.getElementById("select-game");
    sel.innerHTML = "";
    json.games.forEach((g) => {
        const o = document.createElement("option");
        o.value = g.slug;
        o.textContent = g.title + " (" + g.slug + ")";
        sel.appendChild(o);
    });
    const tagsSel = document.getElementById("field-tags");
    const catSel = document.getElementById("field-categories");
    tagsSel.innerHTML = "";
    catSel.innerHTML = "";
    (json.tags || []).forEach((t) => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = t;
        tagsSel.appendChild(o);
    });
    (json.categories || []).forEach((c) => {
        const o = document.createElement("option");
        o.value = c;
        o.textContent = c;
        catSel.appendChild(o);
    });
    const relSel = document.getElementById("field-related");
    const popSel = document.getElementById("field-popular");
    relSel.innerHTML = "";
    popSel.innerHTML = "";
    json.games.forEach((g) => {
        const o1 = document.createElement("option");
        o1.value = g.slug;
        o1.textContent = g.title;
        relSel.appendChild(o1);
        const o2 = document.createElement("option");
        o2.value = g.slug;
        o2.textContent = g.title;
        popSel.appendChild(o2);
    });
}

function fillForm(g) {
    state.current = JSON.parse(JSON.stringify(g));
    document.getElementById("field-title").value = g.title || "";
    document.getElementById("field-slug").value = g.slug || "";
    document.getElementById("field-description").value = g.description || "";
    document.getElementById("field-keywords").value = g.keywords || "";
    document.getElementById("field-image").value = g.image || "";
    document.getElementById("field-icon").value = g.icon || "";
    document.getElementById("field-embed").value = g.embed_url || "";
    document.getElementById("field-created").value = (g.created_at || "").slice(0, 10);
    document.getElementById("field-plays").value = g.plays || 0;
    document.getElementById("field-long").value = g.long_description || "";
    selectMulti("field-tags", g.tags || []);
    selectMulti("field-categories", g.categories || []);
    selectMulti("field-related", g.related || []);
    selectMulti("field-popular", g.popular || []);
}

function selectMulti(id, values) {
    const el = document.getElementById(id);
    Array.from(el.options).forEach((o) => {
        o.selected = values.includes(o.value);
    });
}

function readForm() {
    const getMulti = (id) => Array.from(document.getElementById(id).selectedOptions).map((o) => o.value);
    const g = {
        title: document.getElementById("field-title").value.trim(),
        slug: document.getElementById("field-slug").value.trim() || toSlug(document.getElementById("field-title").value),
        description: document.getElementById("field-description").value.trim(),
        keywords: document.getElementById("field-keywords").value.trim(),
        image: document.getElementById("field-image").value.trim(),
        icon: document.getElementById("field-icon").value.trim(),
        embed_url: document.getElementById("field-embed").value.trim(),
        created_at: document.getElementById("field-created").value,
        plays: parseInt(document.getElementById("field-plays").value || "0", 10),
        long_description: document.getElementById("field-long").value,
        tags: getMulti("field-tags"),
        categories: getMulti("field-categories"),
        related: getMulti("field-related"),
        popular: getMulti("field-popular")
    };
    return g;
}

function upsertGame(g) {
    let idx = -1;
    // If we are editing an existing game (tracked by state.current), find it by its original slug
    if (state.current && state.current.slug) {
        idx = state.data.games.findIndex((x) => x.slug === state.current.slug);
    }
    // Fallback: try to find by the new slug (in case it's a new game or match not found)
    if (idx === -1) {
        idx = state.data.games.findIndex((x) => x.slug === g.slug);
    }

    if (idx >= 0) state.data.games[idx] = g;
    else state.data.games.push(g);

    // Update state.current to match the new state (so subsequent edits track this new slug)
    state.current = JSON.parse(JSON.stringify(g));

    // Refresh the select list to reflect changes (title/slug updates)
    const sel = document.getElementById("select-game");
    const currentVal = sel.value;
    sel.innerHTML = "";
    state.data.games.forEach((game) => {
        const o = document.createElement("option");
        o.value = game.slug;
        o.textContent = game.title + " (" + game.slug + ")";
        sel.appendChild(o);
    });
    // Try to preserve selection if possible, otherwise select the updated game
    if (g.slug) {
        sel.value = g.slug;
    }
}

function downloadFile(name, content, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function getRootDir() {
    if (state.rootHandle) {
        return state.rootHandle;
    }
    const dir = await window.showDirectoryPicker();
    state.rootHandle = dir;
    return dir;
}

async function saveJsonFS() {
    try {
        const dir = await getRootDir();
        const fh = await dir.getFileHandle("games.json", { create: true });
        const ws = await fh.createWritable();
        await ws.write(JSON.stringify(state.data, null, 2));
        await ws.close();
    } catch {}
}

async function writeHtmlFS(html, slug) {
    try {
        const dir = await getRootDir();
        const jsonHandle = await dir.getFileHandle("games.json", { create: true });
        const jsonWs = await jsonHandle.createWritable();
        await jsonWs.write(JSON.stringify(state.data, null, 2));
        await jsonWs.close();
        const sub = await dir.getDirectoryHandle(slug, { create: true });
        const fh = await sub.getFileHandle("index.html", { create: true });
        const ws = await fh.createWritable();
        await ws.write(html);
        await ws.close();
    } catch {}
}

function formatNumber(n) {
    try {
        return (n || 0).toLocaleString("en-US");
    } catch {
        return String(n || 0);
    }
}

function buildGameCard(g) {
    return (
        '<a href="/' +
        g.slug +
        '/"><div class="group relative aspect-square rounded-lg overflow-hidden bg-card border border-card-border hover-elevate active-elevate-2 transition-all duration-200 hover:scale-105" data-testid="game-card-' +
        g.slug +
        '"><img src="https://p2o.io/assets/icon/' +
        (g.icon || "") +
        '" alt="' +
        (g.title || "") +
        '" class="w-full h-full object-contain bg-muted" loading="lazy" /><div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 group-hover:opacity-90 transition-opacity"></div><div class="absolute bottom-0 left-0 right-0 p-4"><h3 class="font-heading text-lg font-semibold text-white mb-2 line-clamp-2">' +
        (g.title || "") +
        '</h3><div class="flex items-center gap-3 text-sm text-white/80"><div class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play h-4 w-4"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg><span>' +
        formatNumber(g.plays) +
        "</span></div></div></div><div class=\"absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity\"><div class=\"bg-primary/90 backdrop-blur-sm rounded-full p-4\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-play h-8 w-8 text-primary-foreground fill-current\"><polygon points=\"6 3 20 12 6 21 6 3\"></polygon></svg></div></div></div></a>"
    );
}

function buildPopularItem(g) {
    return (
        '<a href="/' +
        g.slug +
        '"><div class="flex gap-3 p-3 rounded-md border bg-card hover-elevate active-elevate-2 cursor-pointer transition-colors" data-testid="popular-game-' +
        g.slug +
        '"><img src="https://p2o.io/assets/icon/' +
        (g.icon || g.image || "") +
        '" alt="' +
        (g.title || "") +
        '" class="w-16 h-16 object-cover rounded" /><div class="flex-1 min-w-0"><h4 class="font-semibold text-sm truncate">' +
        (g.title || "") +
        '</h4><div class="flex items-center gap-1 text-xs text-muted-foreground mt-1"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play h-3 w-3"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg><span>' +
        formatNumber(g.plays) +
        "</span></div></div></div></a>"
    );
}

function buildChips(items, kind) {
    return items
        .map(function(name) {
            const id = kind === "category" ? "game-category-" + toSlug(name) : "game-tag-" + toSlug(name);
            const cls =
                kind === "category" ?
                "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover-elevate border-transparent bg-primary text-primary-foreground shadow-xs cursor-pointer" :
                "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover-elevate border-transparent bg-secondary text-secondary-foreground cursor-pointer";
            const href = kind === "category" ? "/category/" + toSlug(name) : "/tag/" + toSlug(name);
            return '<a href="' + href + '"><div class="' + cls + '" data-testid="' + id + '">' + name + "</div></a>";
        })
        .join("");
}

function buildHtml(g, baseUrl, data) {
    const canonical = (baseUrl || "").replace(/\/+$/, "") + "/";
    const related = (g.related || [])
        .map((s) => data.games.find((x) => x.slug === s))
        .filter(Boolean);
    const popular = (g.popular || [])
        .map((s) => data.games.find((x) => x.slug === s))
        .filter(Boolean);
    const tags = buildChips(g.tags || [], "tag");
    const cats = buildChips(g.categories || [], "category");
    const created = g.created_at || "";
    const plays = formatNumber(g.plays || 0);
    const metaKeywords = g.keywords ? '<meta name="keywords" content="' + g.keywords + '" />' : "";
    return (
        '<!DOCTYPE html><html class="dark" lang="en"><head><link rel="stylesheet" href="../assets/site.css"><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>' +
        g.title +
        '</title><meta name="description" content="' +
        g.description +
        '" /><meta name="robots" content="index, follow" />' +
        metaKeywords +
        '<link rel="canonical" href="' +
        canonical +
        '" /><meta property="og:title" content="' +
        g.title +
        '" /><meta property="og:description" content="' +
        g.description +
        '" /><meta property="og:image" content="https://p2o.io/assets/img/' +
        (g.image || "") +
        '" /><meta property="og:type" content="website" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="' +
        g.title +
        '" /><meta name="twitter:description" content="' +
        g.description +
        '" /><meta name="twitter:image" content="https://p2o.io/assets/img/' +
        (g.image || "") +
        '" /><link rel="icon" href="/favicon.png" type="image/png" /></head><body class="flex flex-col min-h-screen dark"><div class="flex-1"><div class="min-h-screen flex flex-col"><header class="border-b bg-background"> <div class="container mx-auto px-4"> <div class="flex items-center justify-between h-16"> <a href="/" class="flex flex-col items-center text-center no-underline"> <img src="../assets/p2-io-UnblockedGames6x-logo.webp" alt="UnblockedGames6x - Play Unblocked Games Online" width="140" height="140" loading="eager" fetchpriority="high" decoding="async" class="block"> <span class="text-sm md:text-base text-gray-600">UnblockedGames6x – Play Unblocked Games</span> </a> <nav class="hidden md:flex items-center gap-6"> <a class="hover-elevate px-3 py-2 rounded-md" href="/browse/">Browse</a> <a class="hover-elevate px-3 py-2 rounded-md" href="/categories/">Categories</a> </nav> <a href="/browse/" class="browse-games-mobile inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition">Browse Games</a> </div> </div> </header><main class="flex-1"><div class="container mx-auto px-4 md:px-6 lg:px-8 py-8"><div class="grid grid-cols-1 lg:grid-cols-3 gap-8"><div class="lg:col-span-2"><div class="mb-6"><div class="relative aspect-video rounded-lg overflow-hidden bg-card border flex flex-col items-center justify-center gap-4"><button class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2 bg-primary text-primary-foreground border border-primary-border min-h-10 rounded-md px-6 py-3 text-lg" data-testid="button-play-game" aria-label="Play game" title="Play game" data-embed-url="' +
        (g.embed_url || "") +
        '"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play h-4 w-4 mr-2" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>Play Game</button></div></div><div class="flex items-start gap-4 mb-4"><img src="https://p2o.io/assets/icon/' +
        (g.icon || "") +
        '" alt="' +
        g.title +
        '" class="w-24 h-32 object-cover rounded border flex-shrink-0" data-testid="game-thumbnail" /><h1 class="font-heading text-4xl md:text-5xl font-bold flex-1" data-testid="game-title">' +
        g.title +
        '</h1></div><div class="flex flex-wrap gap-2 mb-6">' +
        cats +
        tags +
        '</div><div class="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground"><div class="flex items-center gap-1" data-testid="game-play-count"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye h-4 w-4"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg><span>' +
        plays +
        " plays</span></div><div class=\"flex items-center gap-1\" data-testid=\"game-created-at\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-calendar h-4 w-4\"><path d=\"M8 2v4\"></path><path d=\"M16 2v4\"></path><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"></rect><path d=\"M3 10h18\"></path></svg><span>" +
        (created || "") +
        '</span></div></div><div class="mb-8"><h2 class="font-heading text-2xl font-bold mb-4">About this Game</h2><div class="max-w-none max-h-64 overflow-y-auto border border-border rounded-md p-4 bg-card text-foreground mb-4"><div class="mt-4 whitespace-pre-wrap">' +
        (g.long_description || "") +
        '</div></div><div><h3 class="font-heading text-lg font-semibold mb-2">Share this game</h3><div class="flex flex-wrap gap-2"><button class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2 border [border-color:var(--button-outline)] shadow-xs active:shadow-none min-h-8 rounded-md px-3 text-xs" data-testid="button-share-facebook"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-facebook h-4 w-4 mr-2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>Facebook</button><button class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2 border [border-color:var(--button-outline)] shadow-xs active:shadow-none min-h-8 rounded-md px-3 text-xs" data-testid="button-share-twitter"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-twitter h-4 w-4 mr-2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>Twitter</button><button class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2 border [border-color:var(--button-outline)] shadow-xs active:shadow-none min-h-8 rounded-md px-3 text-xs" data-testid="button-share-whatsapp"><svg class="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"></path></svg>WhatsApp</button><button class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2 border [border-color:var(--button-outline)] shadow-xs active:shadow-none min-h-8 rounded-md px-3 text-xs" data-testid="button-share-copy"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-share2 h-4 w-4 mr-2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"></line><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"></line></svg>Copy Link</button></div></div></div><div><h3 class="font-heading text-2xl font-bold mb-4">Related Games</h3><div class="grid grid-cols-2 sm:grid-cols-3 gap-4">' +
        related.map((x) => buildGameCard(x)).join("") +
        '</div></div></div><div class="space-y-6"><div class="sticky top-24" data-testid="popular-games-section"><h3 class="font-heading text-xl font-bold mb-4" data-testid="heading-popular-games">Popular Games</h3><div class="space-y-4">' +
        popular.map((x) => buildPopularItem(x)).join("") +
        '</div></div></div></div></div></main></div></div><footer class="border-t bg-card mt-24"><div class="container mx-auto px-4 md:px-6 lg:px-8 py-12"><div class="grid grid-cols-1 md:grid-cols-3 gap-8"><div><div class="flex items-center gap-2 font-heading text-xl font-bold mb-4">Unblocked6xGames | Play Free Games Online</div><p class="text-sm text-muted-foreground">Your ultimate destination for free online games. Play instantly without downloads.</p></div><div><h3 class="font-semibold mb-4">Quick Links</h3><ul class="space-y-2 text-sm"><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/">Home</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/categories/">Categories</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/browse/">Browse Games</a></li></ul></div><div><h3 class="font-semibold mb-4">Legal</h3><ul class="space-y-2 text-sm"><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/privacy-policy/">Privacy Policy</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/terms-of-use/">Terms of use</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/contact-us/">Contact us</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/about-us/">About us</a></li></ul></div></div><div class="mt-8 pt-8 border-t"><div class="text-center text-sm text-muted-foreground"><p>© 2025 P2O.io Unblocked Games | Play Free Games Online . All rights reserved.</p></div></div></div></footer><script src="../assets/app.js" defer></script></body></html>'
    );
}

function updatePreview() {
    const g = readForm();
    // upsertGame(g); // REMOVED: Do not save to state on every keystroke/preview update
    const base = document.getElementById("field-baseurl").value || state.data.baseUrl || "";
    const html = buildHtml(g, base, state.data);
    state.html = html;
    document.getElementById("preview-html").value = html;
}

function attachEvents() {
    document.getElementById("select-game").addEventListener("change", function(e) {
        const slug = e.target.value;
        const g = state.data.games.find((x) => x.slug === slug);
        if (g) fillForm(g);
        updatePreview();
    });
    document.getElementById("btn-new").addEventListener("click", function() {
        fillForm({
            title: "",
            slug: "",
            description: "",
            keywords: "",
            image: "",
            icon: "",
            embed_url: "",
            created_at: "",
            plays: 0,
            long_description: "",
            tags: [],
            categories: [],
            related: [],
            popular: []
        });
        state.current = null; // Explicitly clear current state to ensure new game creation
        document.getElementById("select-game").value = ""; // Clear selection
        updatePreview();
    });
    ["field-title", "field-slug", "field-description", "field-keywords", "field-image", "field-icon", "field-embed", "field-created", "field-plays", "field-long", "field-tags", "field-categories", "field-related", "field-popular", "field-baseurl"].forEach(
        function(id) {
            const el = document.getElementById(id);
            el.addEventListener("input", updatePreview);
            el.addEventListener("change", updatePreview);
        }
    );
    document.getElementById("btn-save-json").addEventListener("click", function() {
        const g = readForm();
        upsertGame(g);
        downloadFile("games.json", JSON.stringify(state.data, null, 2), "application/json");
    });
    document.getElementById("btn-save-json-fs").addEventListener("click", function() {
        const g = readForm();
        upsertGame(g);
        saveJsonFS();
    });
    document.getElementById("btn-generate").addEventListener("click", updatePreview);
    document.getElementById("btn-download-html").addEventListener("click", function() {
        const g = readForm();
        upsertGame(g);
        state.data.baseUrl = document.getElementById("field-baseurl").value || state.data.baseUrl || "";
        const base = document.getElementById("field-baseurl").value || state.data.baseUrl || "";
        const html = buildHtml(g, base, state.data);
        downloadFile(g.slug + ".html", html, "text/html");
        downloadFile("games.json", JSON.stringify(state.data, null, 2), "application/json");
    });
    document.getElementById("btn-write-html-fs").addEventListener("click", function() {
        const g = readForm();
        upsertGame(g);
        state.data.baseUrl = document.getElementById("field-baseurl").value || state.data.baseUrl || "";
        const base = document.getElementById("field-baseurl").value || state.data.baseUrl || "";
        const html = buildHtml(g, base, state.data);
        writeHtmlFS(html, g.slug);
    });
}

document.addEventListener("DOMContentLoaded", function() {
    loadData().then(function() {
        attachEvents();
        const first = state.data.games[0];
        if (first) fillForm(first);
        updatePreview();
    });
});

function sortByCreatedDesc(list) {
    return list.slice().sort(function(a, b) {
        var ad = new Date(a.created_at || 0).getTime();
        var bd = new Date(b.created_at || 0).getTime();
        return bd - ad;
    });
}

function sortByPlaysDesc(list) {
    return list.slice().sort(function(a, b) {
        return (b.plays || 0) - (a.plays || 0);
    });
}

function buildSimpleCard(g) {
    return (
        '<a class="group bg-card rounded-lg overflow-hidden hover-elevate active-elevate-2" href="/' +
        g.slug +
        '/"><div class="aspect-square"><img src="https://p2o.io/assets/icon/' +
        (g.icon || "") +
        '" alt="' +
        (g.title || "") +
        '" class="w-full h-full object-contain bg-muted" /></div><div class="p-3"><h3 class="font-heading font-semibold truncate">' +
        (g.title || "") +
        '</h3><p class="text-sm text-muted-foreground">' +
        formatNumber(g.plays || 0) +
        " plays</p></div></a>"
    );
}

function assets(depth) {
    var prefix = "";
    if (depth === 1) prefix = "../";
    else if (depth === 2) prefix = "../../";
    return {
        css: prefix + "assets/site.css",
        js: prefix + "assets/app.js"
    };
}

function buildListPage(title, description, canonicalPath, games, depth) {
    var a = assets(depth);
    var canonical = (document.getElementById("field-baseurl").value || state.data.baseUrl || "").replace(/\/+$/, "") + "/" + canonicalPath.replace(/\/+$/, "");
    var grid = '<div id="list-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">' + games.map(buildSimpleCard).join("") + "</div>";
    return (
        '<!DOCTYPE html><html class="dark" lang="en"><head><link rel="stylesheet" href="' +
        a.css +
        '"><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>' +
        title +
        '</title><meta name="description" content="' +
        description +
        '" /><meta name="robots" content="index, follow" /><link rel="canonical" href="' +
        canonical +
        '" /><meta property="og:title" content="' +
        title +
        '" /><meta property="og:description" content="' +
        description +
        '" /><meta property="og:type" content="website" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="' +
        title +
        '" /><meta name="twitter:description" content="' +
        description +
        '" /><link rel="icon" href="/favicon.png" type="image/png" /></head><body class="flex flex-col min-h-screen dark"><div class="flex-1"><div class="min-h-screen"><header class="border-b bg-background"><div class="container mx-auto px-4"><div class="flex items-center justify-between h-16"><a class="text-xl md:text-2xl font-heading font-bold" href="/">Unblocked6xGames | Play Free Games Online</a><nav class="hidden md:flex items-center gap-6"><a class="hover-elevate px-3 py-2 rounded-md" href="/browse/">Browse</a><a class="hover-elevate px-3 py-2 rounded-md" href="/categories/">Categories</a><form class="relative flex items-center gap-2"><input type="search" class="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm w-64" placeholder="Search games..." value="" /><button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-transparent h-9 w-9" type="submit" aria-label="Search" title="Search"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search h-4 w-4" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg></button></form></nav><button class="inline-flex items-center justify-center gap-2 rounded-md text-sm border border-transparent h-9 w-9 md:hidden" aria-label="Open menu" title="Open menu" aria-expanded="false" aria-controls="site-header-mobile-menu"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu" aria-hidden="true"><line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line></svg></button></div></div></header><main class="container mx-auto px-4 py-8 space-y-8"><h1 class="text-3xl font-heading font-bold mb-6">' +
        title +
        '</h1>' +
        grid +
        '</main></div></div><footer class="border-t bg-card mt-24"><div class="container mx-auto px-4 md:px-6 lg:px-8 py-12"><div class="grid grid-cols-1 md:grid-cols-3 gap-8"><div><div class="flex items-center gap-2 font-heading text-xl font-bold mb-4">Unblocked6xGames | Play Free Games Online</div><p class="text-sm text-muted-foreground">Your ultimate destination for free online games. Play instantly without downloads.</p></div><div><h3 class="font-semibold mb-4">Quick Links</h3><ul class="space-y-2 text-sm"><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/">Home</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/categories/">Categories</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/browse/">Browse Games</a></li></ul></div><div><h3 class="font-semibold mb-4">Legal</h3><ul class="space-y-2 text-sm"><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/privacy-policy/">Privacy Policy</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/terms-of-use/">Terms of use</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/contact-us/">Contact us</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/about-us/">About us</a></li></ul></div></div><div class="mt-8 pt-8 border-t"><div class="text-center text-sm text-muted-foreground"><p>© 2025 P2O.io Unblocked Games | Play Free Games Online . All rights reserved.</p></div></div></div></footer><script src="' +
        a.js +
        '" defer></script></body></html>'
    );
}

function buildTagsIndex(depth) {
    var a = assets(depth);
    var canonical = (document.getElementById("field-baseurl").value || state.data.baseUrl || "").replace(/\/+$/, "") + "/tags";
    var chips = (state.data.tags || [])
        .map(function(t) {
            return '<a href="/tag/' + toSlug(t) + '"><div class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground cursor-pointer">' + t + "</div></a>";
        })
        .join("");
    return (
        '<!DOCTYPE html><html class="dark" lang="en"><head><link rel="stylesheet" href="' +
        a.css +
        '"><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Tags</title><meta name="description" content="Browse games by tags." /><link rel="canonical" href="https://p2o.io/browse/" /><meta property="og:title" content="Tags" /><meta property="og:description" content="Browse games by tags." /><meta property="og:type" content="website" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="Tags" /><meta name="twitter:description" content="Browse games by tags." /><link rel="icon" href="/favicon.png" type="image/png" /></head><body class="flex flex-col min-h-screen dark"><div class="flex-1"><div class="min-h-screen"><header class="border-b bg-background"><div class="container mx-auto px-4"><div class="flex items-center justify-between h-16"><a class="text-xl md:text-2xl font-heading font-bold" href="/">Unblocked6xGames | Play Free Games Online</a></div></div></header><main class="container mx-auto px-4 py-8 space-y-8"><h1 class="text-3xl font-heading font-bold mb-6">Tags</h1><div id="tags-grid" class="flex flex-wrap gap-2">' +
        chips +
        '</div></main></div></div><footer class="border-t bg-card mt-24"><div class="container mx-auto px-4 md:px-6 lg:px-8 py-12"><div class="text-center text-sm text-muted-foreground"><p>© 2025 P2O.io Unblocked Games | Play Free Games Online . All rights reserved.</p></div></div></footer><script src="' +
        a.js +
        '" defer></script></body></html>'
    );
}

function buildCategoriesIndex(depth) {
    var a = assets(depth);
    var canonical = (document.getElementById("field-baseurl").value || state.data.baseUrl || "").replace(/\/+$/, "") + "/categories";
    var chips = (state.data.categories || [])
        .map(function(c) {
            return '<a href="/category/' + toSlug(c) + '"><div class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-primary text-primary-foreground cursor-pointer">' + c + "</div></a>";
        })
        .join("");
    return (
        '<!DOCTYPE html><html class="dark" lang="en"><head><link rel="stylesheet" href="' +
        a.css +
        '"><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Categories</title><meta name="description" content="Browse games by categories." /><link rel="canonical" href="' +
        canonical +
        '" /><meta property="og:title" content="Categories" /><meta property="og:description" content="Browse games by categories." /><meta property="og:type" content="website" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="Categories" /><meta name="twitter:description" content="Browse games by categories." /><link rel="icon" href="/favicon.png" type="image/png" /></head><body class="flex flex-col min-h-screen dark"><div class="flex-1"><div class="min-h-screen"><header class="border-b bg-background"><div class="container mx-auto px-4"><div class="flex items-center justify-between h-16"><a class="text-xl md:text-2xl font-heading font-bold" href="/">Unblocked6xGames | Play Free Games Online</a></div></div></header><main class="container mx-auto px-4 py-8 space-y-8"><h1 class="text-3xl font-heading font-bold mb-6">Categories</h1><div id="categories-grid" class="flex flex-wrap gap-2">' +
        chips +
        '</div></main></div></div><footer class="border-t bg-card mt-24"><div class="container mx-auto px-4 md:px-6 lg:px-8 py-12"><div class="text-center text-sm text-muted-foreground"><p>© 2025 P2O.io Unblocked Games | Play Free Games Online . All rights reserved.</p></div></div></footer><script src="' +
        a.js +
        '" defer></script></body></html>'
    );
}

function buildListPagesMap() {
    var base = document.getElementById("field-baseurl").value || state.data.baseUrl || "";
    var all = state.data.games.slice();
    var createdDesc = sortByCreatedDesc(all);
    var playsDesc = sortByPlaysDesc(all);
    var pages = {};
    pages["browse/index.html"] = buildListPage("Browse Games", "Browse all unblocked games.", "browse", createdDesc, 1);
    pages["new-games/index.html"] = buildListPage("New Games - Unblocked Games 6x", "Play the latest unblocked games added to the site.", "new-games", createdDesc, 1);
    pages["popular-games/index.html"] = buildListPage("Popular Games - Unblocked Games 6x", "Play the most popular unblocked games.", "popular-games", playsDesc, 1);
    pages["tags/index.html"] = buildTagsIndex(1);
    pages["categories/index.html"] = buildCategoriesIndex(1);
    (state.data.tags || []).forEach(function(t) {
        var slug = toSlug(t);
        var tg = all.filter(function(g) {
            return (g.tags || []).map(toSlug).includes(slug);
        });
        pages["tag/" + slug + "/index.html"] = buildListPage("Tag: " + t, "Games tagged " + t + ".", "tag/" + slug, sortByCreatedDesc(tg), 2);
    });
    (state.data.categories || []).forEach(function(c) {
        var slug = toSlug(c);
        var cg = all.filter(function(g) {
            return (g.categories || []).map(toSlug).includes(slug);
        });
        pages["category/" + slug + "/index.html"] = buildListPage("Category: " + c, "Games in category " + c + ".", "category/" + slug, sortByCreatedDesc(cg), 2);
    });
    return pages;
}

function buildHomepage(popularList, newList) {
    var a = assets(0);
    var popularGrid =
        '<div id="popular-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">' +
        popularList.map(buildSimpleCard).join("") +
        "</div>";
    var newGrid =
        '<div id="new-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">' +
        newList.map(buildSimpleCard).join("") +
        "</div>";
    var canonical =
        (document.getElementById("field-baseurl").value || state.data.baseUrl || "").replace(/\/+$/, "") || "";
    return (
        '<!DOCTYPE html><html class="dark" lang="en"><head><link rel="stylesheet" href="' +
        a.css +
        '"><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Unblocked6xGames | Play Free Games Online</title><meta name="description" content="Play popular unblocked games online with us, we are providing access to a variety of games that are typically restricted in school or work" /><meta name="keywords" content="unblocked6xgames,unblocked games g+,unblocked games 6x,unbanned g+,unblocked games wtf" /><meta name="robots" content="index, follow" /><link rel="canonical" href="' +
        canonical +
        '" /><meta property="og:title" content="Unblocked6xGames | Play Free Games Online" /><meta property="og:description" content="Play popular unblocked games online with us, we are providing access to a variety of games that are typically restricted in school or work" /><meta property="og:site_name" content="Unblocked6xGames | Play Free Games Online" /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="Unblocked6xGames | Play Free Games Online" /><meta name="twitter:description" content="Play popular unblocked games online with us, we are providing access to a variety of games that are typically restricted in school or work" /><link rel="icon" href="/favicon.png" type="image/png" /></head><body class="flex flex-col min-h-screen dark"><div class="flex-1"><div class="min-h-screen"><header class="border-b bg-background"><div class="container mx-auto px-4"><div class="flex items-center justify-between h-16"><a href="/" class="flex flex-col items-center text-center no-underline"><img src="../assets/p2-io-UnblockedGames6x-logo.webp" alt="UnblockedGames6x - Play Unblocked Games Online" width="140" height="140" loading="eager" fetchpriority="high" decoding="async" class="block" /><span class="text-sm md:text-base text-gray-600">UnblockedGames6x – Play Unblocked Games</span></a><nav class="hidden md:flex items-center gap-6"><a class="hover-elevate px-3 py-2 rounded-md" href="/browse/">Browse</a><a class="hover-elevate px-3 py-2 rounded-md" href="/categories/">Categories</a></nav><a href="/browse/" class="browse-games-mobile inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition">Browse Games</a></div></div></header><main class="container mx-auto px-4 py-8 space-y-12"><h1 class="text-4xl font-heading font-bold mb-4 text-center">Unblocked6xGames</h1><section><h2 class="text-3xl font-heading font-bold mb-6">Popular Games</h2>' +
        popularGrid +
        '<div class="mt-6 flex items-center justify-center"><a data-testid="link-popular-more" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground border border-primary-border min-h-9 px-4 py-2" href="/popular-games/">Load More</a></div></section><section><h2 class="text-3xl font-heading font-bold mb-6">New Games</h2>' +
        newGrid +
        '<div class="mt-6 flex items-center justify-center"><a data-testid="link-new-more" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground border border-primary-border min-h-9 px-4 py-2" href="/new-games/">Load More</a></div></section><section data-testid="homepage-rich-content"><div class="border rounded-md p-4 bg-card">Unblocked6xGames is your trusted online platform to play free unblocked games instantly, without downloads, sign-ups, or restrictions.<h2 class="font-bold text-3xl mt-5 mb-5">Why Prefer UnblockedGames6x</h2>We offer a large and regularly updated collection of action games, arcade games, puzzle games, running games, sports games, car games, and many more popular categories. If you&#x27;re searching for classic titles, trending school games, or new unblocked releases, Unblocked6xGames makes it easy to find and enjoy them directly in your browser.</div></section></main></div></div><footer class="border-t bg-card mt-24"><div class="container mx-auto px-4 md:px-6 lg:px-8 py-12"><div class="grid grid-cols-1 md:grid-cols-3 gap-8"><div><div class="flex items-center gap-2 font-heading text-xl font-bold mb-4">Unblocked6xGames | Play Free Games Online</div><p class="text-sm text-muted-foreground">Your ultimate destination for free online games. Play instantly without downloads.</p></div><div><h3 class="font-semibold mb-4">Quick Links</h3><ul class="space-y-2 text-sm"><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/">Home</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/categories/">Categories</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/browse/">Browse Games</a></li></ul></div><div><h3 class="font-semibold mb-4">Legal</h3><ul class="space-y-2 text-sm"><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/privacy-policy/">Privacy Policy</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/terms-of-use/">Terms of use</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/contact-us/">Contact us</a></li><li><a class="text-muted-foreground hover:text-primary transition-colors" href="/page/about-us/">About us</a></li></ul></div></div><div class="mt-8 pt-8 border-t"><div class="text-center text-sm text-muted-foreground"><p>© 2025 P2O.io Unblocked Games | Play Free Games Online . All rights reserved.</p></div></div></div></footer><script src="' +
        a.js +
        '" defer></script></body></html>'
    );
}

async function updateFileContent(fileHandle, newHtml, configs) {
    try {
        const file = await fileHandle.getFile();
        const existingText = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(existingText, "text/html");
        const newDoc = parser.parseFromString(newHtml, "text/html");

        let modified = false;
        configs.forEach(cfg => {
            const newEl = newDoc.getElementById(cfg.id);
            if (!newEl) return;

            let oldEl = doc.getElementById(cfg.id);
            if (!oldEl && cfg.cls) {
                // Fallback: try to find by class and index
                const found = doc.getElementsByClassName(cfg.cls);
                if (found && found[cfg.index || 0]) {
                    oldEl = found[cfg.index || 0];
                    // oldEl.id = cfg.id; // Optional: Enforce ID for next time?
                }
            }

            if (oldEl) {
                oldEl.innerHTML = newEl.innerHTML;
                modified = true;
            }
        });

        if (modified) {
            return "<!DOCTYPE html>" + doc.documentElement.outerHTML;
        }
        return newHtml;
    } catch (e) {
        return newHtml;
    }
}

async function writeListPagesFS() {
    try {
        var dir = await getRootDir();
        var pages = buildListPagesMap();
        for (var path in pages) {
            var parts = path.split("/");
            var current = dir;
            for (var i = 0; i < parts.length - 1; i++) {
                current = await current.getDirectoryHandle(parts[i], { create: true });
            }
            var fileHandle = await current.getFileHandle(parts[parts.length - 1], { create: true });

            var configs = [];
            if (path.includes("tags/index.html")) {
                configs.push({ id: "tags-grid", cls: "flex flex-wrap gap-2", index: 0 });
            } else if (path.includes("categories/index.html")) {
                configs.push({ id: "categories-grid", cls: "flex flex-wrap gap-2", index: 0 });
            } else {
                // Browse, New, Popular, Tag/Cat pages
                configs.push({ id: "list-grid", cls: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", index: 0 });
            }

            var content = await updateFileContent(fileHandle, pages[path], configs);

            var ws = await fileHandle.createWritable();
            await ws.write(content);
            await ws.close();
        }
        var jsonHandle = await dir.getFileHandle("games.json", { create: true });
        var jsonWs = await jsonHandle.createWritable();
        await jsonWs.write(JSON.stringify(state.data, null, 2));
        await jsonWs.close();
    } catch (e) { console.error(e); }
}

async function writeEverythingFS() {
    try {
        const g = readForm();
        upsertGame(g);

        // Ensure base URL is set
        state.data.baseUrl = document.getElementById("field-baseurl").value || state.data.baseUrl || "";
        const base = state.data.baseUrl;

        // 1. Write the current game page
        const html = buildHtml(g, base, state.data);
        await writeHtmlFS(html, g.slug);

        // 2. Write Homepage
        var dir = await getRootDir();
        var all = state.data.games.slice();
        var popular = sortByPlaysDesc(all).slice(0, 8);
        var created = sortByCreatedDesc(all).slice(0, 8);
        var homeHtml = buildHomepage(popular, created);
        var fh = await dir.getFileHandle("index.html", { create: true });

        var homeContent = await updateFileContent(fh, homeHtml, [
            { id: "popular-grid", cls: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", index: 0 },
            { id: "new-grid", cls: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", index: 1 }
        ]);

        var ws = await fh.createWritable();
        await ws.write(homeContent);
        await ws.close();

        // 3. Write List Pages (includes saving games.json)
        await writeListPagesFS();

        alert("All pages and games.json updated successfully!");
    } catch (e) {
        console.error(e);
        alert("Error updating files: " + e.message);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("btn-write-everything") &&
        document.getElementById("btn-write-everything").addEventListener("click", writeEverythingFS);

    document.getElementById("btn-write-lists-fs") &&
        document.getElementById("btn-write-lists-fs").addEventListener("click", function() {
            writeListPagesFS();
        });
    document.getElementById("btn-set-root") &&
        document.getElementById("btn-set-root").addEventListener("click", async function() {
            try {
                const dir = await window.showDirectoryPicker();
                // store handle in memory for this session
                state.rootHandle = dir;
                alert('Site folder set for this session: ' + (dir.name || 'selected folder'));
            } catch {}
        });
    document.getElementById("btn-write-home-fs") &&
        document.getElementById("btn-write-home-fs").addEventListener("click", async function() {
            try {
                var dir = state.rootHandle || (await window.showDirectoryPicker());
                // build homepage content (top 8 popular and top 8 new)
                var all = state.data.games.slice();
                var popular = sortByPlaysDesc(all).slice(0, 8);
                var created = sortByCreatedDesc(all).slice(0, 8);
                var html = buildHomepage(popular, created);
                var fh = await dir.getFileHandle("index.html", { create: true });

                var content = await updateFileContent(fh, html, [
                    { id: "popular-grid", cls: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", index: 0 },
                    { id: "new-grid", cls: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", index: 1 }
                ]);

                var ws = await fh.createWritable();
                await ws.write(content);
                await ws.close();
                // also update games.json
                var jh = await dir.getFileHandle("games.json", { create: true });
                var jw = await jh.createWritable();
                await jw.write(JSON.stringify(state.data, null, 2));
                await jw.close();
            } catch {}
        });
});