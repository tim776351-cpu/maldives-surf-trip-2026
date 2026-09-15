/* Maldives Surf Trip 2026 - crew site, v3 (surf first). Static, no build step.
   Content comes from assets/data.js (window.TRIP, from plan/trip-data.json) and
   assets/photos.js (window.TRIP_PHOTOS, from plan/photos.json; photos are hotlinked).
   Page order: map overview, then sections 1-8 in the organiser's order, then food, days, prep, sources.
   Two maps (the overview and the Surf spots module) share one Leaflet, the same pins and the same
   to-scale sketch fallback, drawn from the lat/lon in the data.
   Motion: transform/opacity only, loops pause off screen, nothing moves under prefers-reduced-motion. */
(function () {
  'use strict';

  var W = typeof window !== 'undefined' ? window : {};
  var TRIP = W.TRIP;
  var IS_BROWSER = typeof document !== 'undefined';

  /* ------------------------------------------------------------------ helpers */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function fmt(n) {
    var r = Math.round(Number(n) || 0);
    return String(r).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function hkd(lo, hi) {
    var a = Math.round(lo), b = Math.round(hi);
    return a === b ? 'HKD ' + fmt(a) : 'HKD ' + fmt(a) + '–' + fmt(b);
  }
  // Difference between two rounded totals, so it matches the totals shown next to it.
  function hkdDelta(a, b) { return hkd(Math.round(a.lo) - Math.round(b.lo), Math.round(a.hi) - Math.round(b.hi)); }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48); }
  function sentences(text) {
    var out = [], re = /[.!?]\)?\s+(?=[A-Z0-9])/g, last = 0, m;
    text = String(text || '');
    while ((m = re.exec(text))) {
      var before = text.slice(Math.max(0, m.index - 4), m.index + 1);
      if (/\b(e\.g|i\.e|approx|vs|St|Mt|no)\.$/i.test(before)) continue;
      out.push(text.slice(last, m.index + m[0].trimEnd().length));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out.map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function firstSentences(text, n) { return sentences(text).slice(0, n).join(' '); }
  function restSentences(text, n) { return sentences(text).slice(n).join(' '); }
  function fmtDate(iso) {
    var d = new Date(iso + 'T12:00:00Z');
    var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
    return d.getUTCDate() + ' ' + mon + ' ' + d.getUTCFullYear();
  }
  // Read again whenever the OS setting changes (see watchReducedMotion).
  var reduceMotion = !!(IS_BROWSER && W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ------------------------------------------------------ crew size, nights */
  // Everything about the crew size comes from meta.crew_size; the calculator lets it move 3 either way.
  var CREW_SPAN = 3;
  function crewBase() { return Math.max(1, Math.round(Number(TRIP && TRIP.meta && TRIP.meta.crew_size)) || 1); }
  function crewMin() { return Math.max(1, crewBase() - CREW_SPAN); }
  function crewMax() { return crewBase() + CREW_SPAN; }
  function clampCrew(n) { return Math.min(crewMax(), Math.max(crewMin(), n)); }
  function tripNights() {
    var a = Date.parse(TRIP.meta.trip_start + 'T00:00:00Z'), b = Date.parse(TRIP.meta.trip_end + 'T00:00:00Z');
    var n = Math.round((b - a) / 864e5);
    return n > 0 ? n : 1;
  }

  /* ------------------------------------------------------------ price status */
  function statusKind(s) {
    s = String(s || '').toLowerCase();
    if (s.indexOf('live') === 0) return 'live';
    if (s.indexOf('published') === 0) return 'published';
    if (s.indexOf('quote') === 0) return 'quote';
    if (s.indexOf('older') === 0) return 'older';
    if (s.indexOf('not checked') === 0 || s.indexOf('no price') === 0) return 'none';
    return 'estimate';
  }
  function chip(status) {
    if (!status) return '';
    return '<span class="status status--' + statusKind(status) + '">' + esc(cap(status)) + '</span>';
  }
  function parseStatus(text, fallback) {
    var m = /status:\s*([^.;]+)/i.exec(text || '');
    return m ? m[1].trim() : (fallback || 'estimate');
  }
  var STATUS_HELP = [
    ['live price 15 Sep 2026', 'Seen on a booking site for our exact dates on 15 Sep 2026.'],
    ['published 2026 rate', "The seller's own 2026 price, not a quote for our dates or group."],
    ['estimate', 'Worked out from guides, ranges or scaling. Could move either way.'],
    ['quote needed', 'No usable price yet. HKD 0 here means not priced, not free.'],
    ['older price', 'From an earlier year or undated. Expect it to be higher now.']
  ];
  function statusLegend() {
    return '<dl class="legend">' + STATUS_HELP.map(function (s) {
      return '<div><dt>' + chip(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>';
    }).join('') + '</dl>';
  }
  function srcLink(url, label) {
    var u = safeUrl(url);
    if (!u) return '';
    return '<a class="src" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(label || 'Source') + '</a>';
  }
  // Weakest first: a total is only as solid as its weakest line.
  var STATUS_RANK = { none: 0, quote: 0, older: 1, estimate: 2, published: 3, live: 4 };
  function statusRank(s) { return STATUS_RANK[statusKind(s)]; }
  function chipLabeled(prefix, status) {
    if (!status) return '';
    return '<span class="status status--' + statusKind(status) + '">' + esc(prefix + ': ' + status) + '</span>';
  }
  function shortHost(u) {
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'source'; }
  }
  // Data text sometimes ends in "(Status: X. Source: URL)" or holds a bare URL.
  // Turn that into escaped text + a status chip + real links, so no raw URL is shown.
  function richText(text) {
    var t = String(text == null ? '' : text), status = '', urls = [];
    var m = /\s*\(Status:\s*(.+?)\.\s+Sources?:\s*(.+)\)\s*$/i.exec(t);
    if (m) {
      status = m[1].trim();
      (m[2].match(/https?:\/\/[^\s)]+/g) || []).forEach(function (u) { urls.push(u.replace(/[.,;]+$/, '')); });
      t = t.slice(0, m.index);
    }
    var parts = t.split(/(https?:\/\/[^\s)]+)/g);
    var html = parts.map(function (p, i) {
      if (i % 2 === 0) return esc(p);
      var u = p.replace(/[.,;]+$/, ''), tail = p.slice(u.length);
      urls.push(u);
      return esc(shortHost(u) + tail);
    }).join('');
    var seen = [];
    var links = urls.filter(function (u) { if (seen.indexOf(u) !== -1) return false; seen.push(u); return !!safeUrl(u); })
      .map(function (u) { return srcLink(u, shortHost(u)); }).join('');
    return { html: html, status: status, links: links };
  }
  function richHtml(text, block) {
    var r = richText(text);
    var extra = (r.status ? ' ' + chip(r.status) : '') + (r.links ? '<span class="src-row src-row--inline">' + r.links + '</span>' : '');
    return block ? '<p>' + r.html + (r.status ? ' ' + chip(r.status) : '') + '</p>' + (r.links ? '<p class="src-row">' + r.links + '</p>' : '') : r.html + extra;
  }
  function stripStatusTail(s) {
    return String(s || '').replace(/\s+-\s+status:\s*[^.]*\./i, '.').replace(/\s*Status:\s*[^.]*\.\s*$/i, '').trim();
  }

  /* ------------------------------------------------------------------- plans */
  // Plan names come from the data ("Budget: shared guesthouse, boats per trip"): the short name is the part before the colon.
  function planById(id) { return (TRIP.plans || []).filter(function (p) { return p.id === id; })[0]; }
  function planShort(id) {
    var p = planById(id);
    return p ? String(p.name).split(':')[0].trim() : String(id);
  }
  function planDesc(id) {
    var p = planById(id);
    if (!p) return '';
    var i = String(p.name).indexOf(':');
    return i === -1 ? '' : String(p.name).slice(i + 1).trim();
  }
  function recPlan() { return (TRIP.plans || []).filter(function (p) { return p.recommended; })[0] || TRIP.plans[0]; }
  function appliesTo(plans, planId) {
    plans = plans || ['all'];
    return plans.indexOf('all') !== -1 || plans.indexOf(planId) !== -1;
  }

  /* ------------------------------------------------------------------ budget */
  var CATEGORY_ORDER = ['Flights', 'Stay', 'Transfers', 'Surf boats', 'Coaching', 'Food', 'Activities', 'Other'];
  var GROUPS = ['flight', 'coaching', 'food'];

  function choiceIds(group, planId) {
    var ids = [];
    TRIP.budget.lines.forEach(function (l) {
      if (l.choice === group && appliesTo(l.plans, planId) && ids.indexOf(l.choice_id) === -1) ids.push(l.choice_id);
    });
    return ids;
  }
  function choiceLines(group, id, planId) {
    return TRIP.budget.lines.filter(function (l) {
      return l.choice === group && l.choice_id === id && appliesTo(l.plans, planId);
    });
  }
  // Only used if budget.defaults is missing a group: fall back to the item flagged recommended.
  function fallbackChoice(group, ids) {
    var rec;
    if (group === 'flight') rec = (TRIP.flights.options || []).filter(function (o) { return o.recommended; })[0];
    else if (group === 'coaching') rec = (TRIP.coaching.packages || []).filter(function (k) { return k.recommended; })[0];
    else if (group === 'food') rec = (TRIP.food.daily_budget || []).filter(function (f) { return f.recommended; })[0];
    return rec && ids.indexOf(rec.id) !== -1 ? rec.id : ids[0];
  }
  // Each plan has exactly one default per choice group, from budget.defaults in trip-data.json.
  function defaultChoice(group, planId) {
    var ids = choiceIds(group, planId);
    if (!ids.length) return null;
    var d = ((TRIP.budget.defaults || {})[planId] || {})[group];
    return d && ids.indexOf(d) !== -1 ? d : fallbackChoice(group, ids);
  }
  function effectiveChoice(state, group, planId) {
    planId = planId || state.plan;
    var ids = choiceIds(group, planId);
    if (!ids.length) return null;
    return ids.indexOf(state[group]) !== -1 ? state[group] : defaultChoice(group, planId);
  }
  function defaultState(planId) {
    var p = planById(planId) || recPlan();
    return {
      plan: p.id,
      flight: defaultChoice('flight', p.id),
      coaching: defaultChoice('coaching', p.id),
      food: defaultChoice('food', p.id),
      addons: new Set(),
      crew: crewBase()
    };
  }
  // Switching plan loads that plan's own picks for flight, coaching and food; add-ons and crew size stay.
  function applyPlanDefaults(st, planId) {
    GROUPS.forEach(function (g) { st[g] = defaultChoice(g, planId); });
  }
  // What another plan would cost if you switched to it now.
  function stateForPlan(st, planId) {
    if (planId === st.plan) return st;
    var s2 = defaultState(planId);
    s2.addons = st.addons;
    s2.crew = st.crew;
    return s2;
  }
  function isDefaultState(st) {
    var d = defaultState(recPlan().id);
    return st.plan === d.plan && st.crew === d.crew && st.addons.size === 0 &&
      GROUPS.every(function (g) { return effectiveChoice(st, g) === d[g]; });
  }
  function computeBudget(state, planOverride) {
    var planId = planOverride || state.plan;
    var crew = Math.max(1, Math.round(Number(state.crew)) || crewBase());
    var eff = {};
    GROUPS.forEach(function (g) { eff[g] = effectiveChoice(state, g, planId); });
    var res = { plan: planId, crew: crew, eff: eff, lo: 0, hi: 0, cats: {}, counted: [], unpriced: [] };
    CATEGORY_ORDER.forEach(function (c) { res.cats[c] = { lo: 0, hi: 0, n: 0, quote: 0 }; });
    TRIP.budget.lines.forEach(function (l) {
      if (!appliesTo(l.plans, planId)) return;
      var on;
      if (l.choice) on = eff[l.choice] === l.choice_id;
      else if (l.optional) on = state.addons.has(l.id);
      else on = !!l.default_on;
      if (!on) return;
      var div = l.basis === 'per_group' ? crew : 1;
      var lo = Number(l.low_hkd) / div, hi = Number(l.high_hkd) / div;
      res.lo += lo; res.hi += hi;
      var c = res.cats[l.category] || (res.cats[l.category] = { lo: 0, hi: 0, n: 0, quote: 0 });
      c.lo += lo; c.hi += hi; c.n += 1;
      if (statusKind(l.status) === 'quote') c.quote += 1;
      res.counted.push({ line: l, lo: lo, hi: hi });
      if (Number(l.high_hkd) === 0 && statusKind(l.status) === 'quote') res.unpriced.push(l);
    });
    // Group = the exact per-person sum times the crew, rounded once at the end (so it is the true total of the lines,
    // and can differ by a few dollars from the rounded per-person figure times the crew).
    res.groupLo = Math.round(res.lo * crew);
    res.groupHi = Math.round(res.hi * crew);
    return res;
  }
  // "The crew's plan" for the recommended plan; any dearer plan is an optional upgrade.
  function planRole(id) {
    var rec = recPlan();
    if (id === rec.id) return "The crew's plan";
    var a = computeBudget(defaultState(id)), b = computeBudget(defaultState(rec.id));
    return a.hi >= b.hi && a.lo >= b.lo ? 'Optional upgrade' : 'Alternative';
  }
  // "Budget plan, Emirates, no coaching, budget food, no add-ons, crew of 11". Short form drops the plan and the crew.
  function picksText(state, short) {
    var r = computeBudget(state);
    var parts = short ? [] : [planShort(state.plan) + ' plan'];
    var fo = (TRIP.flights.options || []).filter(function (o) { return o.id === r.eff.flight; })[0];
    if (fo) parts.push(fo.airline);
    if (r.eff.coaching === 'none') parts.push('no coaching');
    else if (r.eff.coaching) {
      var pk = (TRIP.coaching.packages || []).filter(function (p) { return p.id === r.eff.coaching; })[0];
      parts.push((pk ? pk.name.split(' - ')[0] : r.eff.coaching) + ' coaching');
    }
    if (r.eff.food) {
      var fn = foodName(r.eff.food).toLowerCase();
      parts.push(/\s/.test(fn) ? fn : fn + ' food');
    }
    var n = 0;
    state.addons.forEach(function (id) {
      var l = TRIP.budget.lines.filter(function (x) { return x.id === id; })[0];
      if (l && appliesTo(l.plans, state.plan)) n++;
    });
    parts.push(n ? n + (n === 1 ? ' add-on' : ' add-ons') : 'no add-ons');
    if (!short) parts.push('crew of ' + r.crew);
    return parts.join(', ');
  }
  function foodName(id) {
    var f = (TRIP.food.daily_budget || []).filter(function (x) { return x.id === id; })[0];
    if (f) return f.style.replace(/^Local island - /i, '').replace(/^./, function (c) { return c.toUpperCase(); });
    return cap(id);
  }

  /* ------------------------------------------------------------ surf levels */
  function levelWords(level) {
    return String(level || '').replace(/^Int-Adv to /, 'Intermediate-advanced to ').replace(/Beginner-Int\b/g, 'Beginner to intermediate').replace(/Int-Adv\b/g, 'Intermediate to advanced');
  }
  function levelRange(level) {
    var l = String(level || '').toLowerCase();
    if (/expert/.test(l) && /int-adv/.test(l)) return [1, 3];
    if (/beginner-int/.test(l)) return [0, 1];
    if (/^int-adv$/.test(l)) return [1, 2];
    if (/^intermediate$/.test(l)) return [1, 1];
    if (/^advanced$/.test(l)) return [2, 2];
    if (/beginner/.test(l)) return [0, 0];
    return [1, 2];
  }

  /* ------------------------------------------------- map data (both maps) */
  // Places (islands, the airport) come from TRIP.places; spots from TRIP.spots. Everything is approximate.
  var KM_LAT = 110.57;
  function kmLon(lat) { return 111.32 * Math.cos(lat * Math.PI / 180); }
  function distKm(a, b) {
    var dy = (a.lat - b.lat) * KM_LAT, dx = (a.lon - b.lon) * kmLon((a.lat + b.lat) / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function spotById(id) { return (TRIP.spots || []).filter(function (s) { return s.id === id; })[0] || null; }
  function placeById(id) { return (TRIP.places || []).filter(function (p) { return p.id === id; })[0] || null; }
  // Every boat time in the data is "from Thulusdhoo", so that island is the base the boat routes start from.
  function basePlace() { return placeById('thulusdhoo') || { id: 'thulusdhoo', name: 'Thulusdhoo', kind: 'island', lat: 4.373, lon: 73.649 }; }
  function airportPlace() { return (TRIP.places || []).filter(function (p) { return p.kind === 'airport'; })[0] || null; }
  function islandName(s) { return String(s || '').split(',')[0].split('(')[0].trim(); }
  function isSouth(s) { return /south/i.test(s.region || ''); }
  // Where a plan sleeps: its stay options grouped by island, each island matched to a place pin by name.
  function staysForPlan(planId) {
    var p = planById(planId), out = [];
    if (!p) return out;
    (p.options || []).forEach(function (o) {
      var name = islandName(o.island).toLowerCase();
      var place = (TRIP.places || []).filter(function (x) { return x.kind === 'island' && String(x.name).toLowerCase() === name; })[0];
      if (!place) return;
      var g = out.filter(function (x) { return x.place === place; })[0];
      if (!g) { g = { place: place, options: [] }; out.push(g); }
      g.options.push(o);
    });
    return out;
  }
  function spotShort(s) { return String(s.name).split(' (')[0]; }
  function accessKind(s) { var a = String(s.access || '').toLowerCase(); return /resort/.test(a) ? 'resort' : /limited/.test(a) ? 'limited' : 'public'; }
  function isAdvanced(s) { return levelRange(s.level)[0] >= 2; }
  // Boat time from the base, read from the spot's own text ("boat time about 5-15 min", "About 20 min by boat").
  // Nothing is invented: no minutes in the text means "not confirmed".
  function boatTime(s) {
    var t = String(s.boat_from_thulusdhoo || '');
    var km = /about\s+([\d.]+)\s*km/i.exec(t);
    var out = { km: km ? Number(km[1]) : Math.round(distKm(s, basePlace()) * 10) / 10, kmFrom: km ? 'text' : 'pins' };
    if (/^no real boat trip/i.test(t)) { out.kind = 'paddle'; out.text = 'No boat needed: it breaks off the island'; out.short = 'paddle out, no boat'; return out; }
    if (/^not an option/i.test(t)) { out.kind = 'no'; out.text = 'Not an option from our base (resort guests only)'; out.short = 'guests only'; return out; }
    var m = /(\d+(?:\s*-\s*\d+)?)\s*min\b/i.exec(t);
    if (m) {
      var mins = m[1].replace(/\s+/g, ''), each = /each way/i.test(t) ? ' each way' : '';
      out.kind = 'time'; out.text = 'About ' + mins + ' min' + each + ' by boat'; out.short = 'about ' + mins + ' min by boat';
      return out;
    }
    out.kind = 'unknown'; out.text = 'Boat time not confirmed'; out.short = 'boat time not confirmed';
    return out;
  }
  // The points a map view has to show: North Malé (with the islands and the airport), South Malé, or everything.
  function viewPoints(view) {
    var spots = (TRIP.spots || []).filter(function (s) { return view === 'all' || (view === 'south' ? isSouth(s) : !isSouth(s)); });
    return view === 'south' ? spots : spots.concat(TRIP.places || []);
  }
  function geoBox(pts) {
    var b = { s: 90, n: -90, w: 180, e: -180 };
    pts.forEach(function (p) { b.s = Math.min(b.s, p.lat); b.n = Math.max(b.n, p.lat); b.w = Math.min(b.w, p.lon); b.e = Math.max(b.e, p.lon); });
    return b;
  }
  // To-scale projection of a lat/lon box into a W x H pixel box (equal km per pixel both ways).
  function projectBox(b, Wd, Ht, pad) {
    var lat0 = (b.s + b.n) / 2, kx = kmLon(lat0);
    var wKm = Math.max(1, (b.e - b.w) * kx), hKm = Math.max(1, (b.n - b.s) * KM_LAT);
    var sc = Math.max(1, Math.min((Wd - pad.l - pad.r) / wKm, (Ht - pad.t - pad.b) / hKm));
    var ox = pad.l + (Wd - pad.l - pad.r - wKm * sc) / 2, oy = pad.t + (Ht - pad.t - pad.b - hKm * sc) / 2;
    return {
      sc: sc,
      xy: function (lat, lon) { return { x: ox + (lon - b.w) * kx * sc, y: oy + (b.n - lat) * KM_LAT * sc }; }
    };
  }
  // Push pins apart until none is closer than `gap` px to another, or `fixedGap` px to a fixed point (a stay,
  // the airport). Pins are approximate (about 2-3 km) anyway; each nudge is capped at maxNudge px.
  function spreadPoints(pts, fixed, gap, fixedGap, maxNudge) {
    pts.forEach(function (p) { p.x = p.x0; p.y = p.y0; });
    for (var it = 0; it < 80; it++) {
      var moved = false, a, b, dx, dy, dist, push, ux, uy, i, j;
      for (i = 0; i < pts.length; i++) {
        for (j = i + 1; j < pts.length; j++) {
          a = pts[i]; b = pts[j];
          dx = b.x - a.x; dy = b.y - a.y; dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= gap) continue;
          if (dist < 0.01) { var ang = 0.6 + j * 2.4; ux = Math.cos(ang); uy = Math.sin(ang); dist = 0; }
          else { ux = dx / dist; uy = dy / dist; }
          push = (gap - dist) / 2 + 0.01;
          a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
          moved = true;
        }
        for (j = 0; j < fixed.length; j++) {
          a = pts[i];
          dx = a.x - fixed[j].x; dy = a.y - fixed[j].y; dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= fixedGap) continue;
          if (dist < 0.01) { ux = 0; uy = 1; dist = 0; } else { ux = dx / dist; uy = dy / dist; }
          push = fixedGap - dist + 0.01;
          a.x += ux * push; a.y += uy * push;
          moved = true;
        }
      }
      if (!moved) break;
    }
    pts.forEach(function (p) {
      var ox = p.x - p.x0, oy = p.y - p.y0, m = Math.sqrt(ox * ox + oy * oy);
      if (m > maxNudge) { p.x = p.x0 + ox / m * maxNudge; p.y = p.y0 + oy / m * maxNudge; }
    });
  }
  // Label placement. Each label tries 16 positions around its pin (the 8 directions, with the top, bottom and
  // side positions also slid to either side), right next to the pin, further out (joined to its pin by a thin
  // leader line) and pushed against the map edge. Covering a pin costs more than moving a little away, covering a
  // crew pick, a stay or the airport costs most, and a leader line should not cross a pin or another label.
  // Labels marked `must` (stays and crew picks) always show; others (the airport) shrink to their first line or
  // hide rather than cover things. Pins are drawn above labels on both maps, so no label can hide a pin.
  var LABEL_POS = [['right', 0], ['left', 0], ['bottom', 0], ['top', 0], ['br', 0], ['tr', 0], ['bl', 0], ['tl', 0],
    ['bottom', 1], ['bottom', -1], ['top', 1], ['top', -1], ['right', 1], ['right', -1], ['left', 1], ['left', -1]];
  var LABEL_REACH = [0, 12, 26, 44, 66, 92, 124, 160];
  function overlapArea(a, b) {
    var w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
    return w > 0 && h > 0 ? w * h : 0;
  }
  // slide: 0 centred on the pin; 1 or -1 slid so the label starts or ends next to the pin.
  function labelRect(dir, x, y, w, h, g, slide) {
    var d = g * 0.72, t;
    if (dir === 'right' || dir === 'left') {
      t = !slide ? y - h / 2 : slide > 0 ? y - 12 : y + 12 - h;
      return dir === 'right' ? [x + g, t, x + g + w, t + h] : [x - g - w, t, x - g, t + h];
    }
    if (dir === 'bottom' || dir === 'top') {
      t = !slide ? x - w / 2 : slide > 0 ? x - 14 : x + 14 - w;
      return dir === 'bottom' ? [t, y + g, t + w, y + g + h] : [t, y - g - h, t + w, y - g];
    }
    if (dir === 'br') return [x + d, y + d, x + d + w, y + d + h];
    if (dir === 'tr') return [x + d, y - d - h, x + d + w, y - d];
    if (dir === 'bl') return [x - d - w, y + d, x - d, y + d + h];
    return [x - d - w, y - d - h, x - d, y - d];
  }
  // The leader line: from the edge of the pin to the nearest point of the label.
  function leaderLine(x, y, r, pinR) {
    var nx = Math.max(r[0], Math.min(x, r[2])), ny = Math.max(r[1], Math.min(y, r[3]));
    var dx = nx - x, dy = ny - y, len = Math.sqrt(dx * dx + dy * dy);
    if (len < pinR + 8) return null;
    return { x1: x + dx / len * pinR, y1: y + dy / len * pinR, x2: nx, y2: ny };
  }
  function segPointDist(l, px, py) {
    var dx = l.x2 - l.x1, dy = l.y2 - l.y1, len2 = dx * dx + dy * dy;
    var t = len2 ? Math.max(0, Math.min(1, ((px - l.x1) * dx + (py - l.y1) * dy) / len2)) : 0;
    var qx = l.x1 + t * dx - px, qy = l.y1 + t * dy - py;
    return Math.sqrt(qx * qx + qy * qy);
  }
  // Does the segment cross the rectangle? (Liang-Barsky clipping.)
  function segHitsRect(l, r) {
    var t0 = 0, t1 = 1, dx = l.x2 - l.x1, dy = l.y2 - l.y1;
    var p = [-dx, dx, -dy, dy], q = [l.x1 - r[0], r[2] - l.x1, l.y1 - r[1], r[3] - l.y1];
    for (var i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; continue; }
      var t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return t1 - t0 > 0.02;
  }
  // Cost weights per square pixel for a stay or crew-pick label: on any pin, on a map button, on another label.
  // (v3 r2: the r1 weights 26-40/12/24 let a small break's pin or "Show South Malé too" sit on label text.)
  var W_PIN = 130, W_BLOCK = 200, W_PAIR = 60;
  // labels: [{id, x, y, g, w, h, cw, ch, prio, must, pinR}]; pins: [{id, x, y, r, key}]; blocks: [[x1, y1, x2, y2]]; Wd, Ht: map size.
  // Every label gets a list of candidate boxes, each with a fixed cost (off the map, over pins or map buttons, a
  // leader through a pin, distance from its pin, the short form). Labels then cost each other when boxes overlap or
  // a leader crosses another label. A greedy start is refined by five short annealing runs with fixed seeds (the
  // same map always gets the same layout), then each label and each pair of labels is polished in turn.
  // opts (checks only): { steps, seeds, stats } to run a longer search and read back its total cost.
  var labelMemo = [];   // the last few layouts: the maps ask again with unchanged inputs (fonts, tiles, card closes)
  function placeLabels(labels, pins, blocks, Wd, Ht, opts) {
    var edge = 4, out = {};
    opts = opts || {};
    var sig = opts.steps ? '' : JSON.stringify([Wd, Ht, labels.map(function (l) { return [l.id, Math.round(l.x), Math.round(l.y), l.w, l.h, l.cw || 0, l.ch || 0, l.must ? 1 : 0, l.prio]; }),
      pins.map(function (p) { return [Math.round(p.x), Math.round(p.y), p.r, p.key ? 1 : 0]; }), blocks.map(function (b) { return b.map(Math.round); })]);
    for (var mi = 0; sig && mi < labelMemo.length; mi++) if (labelMemo[mi].sig === sig) return labelMemo[mi].out;
    var result = placeLabelsNow(labels, pins, blocks, Wd, Ht, opts, edge, out);
    if (sig) { labelMemo.unshift({ sig: sig, out: result }); labelMemo.length = Math.min(labelMemo.length, 8); }
    return result;
  }
  function placeLabelsNow(labels, pins, blocks, Wd, Ht, opts, edge, out) {
    var list = labels.filter(function (lb) {
      var inside = lb.x >= 0 && lb.y >= 0 && lb.x <= Wd && lb.y <= Ht;
      if (!inside) out[lb.id] = null;
      return inside;
    }).sort(function (a, b) { return b.prio - a.prio; });
    if (!list.length) return out;
    // A stay or crew-pick label (must) treats every pin and every map button as a hard obstacle: pins are drawn
    // above labels, so any pin on a label would hide its text. The airport label avoids them more softly (it can hide).
    function fixedCost(r, lead, id, must) {
      var cost = 0, i, pn;
      var outX = Math.max(0, edge - r[0]) + Math.max(0, r[2] - (Wd - edge));
      var outY = Math.max(0, edge - r[1]) + Math.max(0, r[3] - (Ht - edge));
      cost += (outX * (r[3] - r[1] + outY) + outY * (r[2] - r[0])) * 90;
      for (i = 0; i < pins.length; i++) {
        pn = pins[i];
        if (pn.id === id) continue;
        cost += overlapArea(r, [pn.x - pn.r, pn.y - pn.r, pn.x + pn.r, pn.y + pn.r]) * (must ? W_PIN : pn.key ? 40 : 26);
        if (lead && segPointDist(lead, pn.x, pn.y) < pn.r - 2) cost += pn.key ? 24000 : 8000;
      }
      for (i = 0; i < blocks.length; i++) cost += overlapArea(r, blocks[i]) * (must ? W_BLOCK : 40);
      return cost;
    }
    function pairCost(a, b) {
      if (!a || !b || a.hidden || b.hidden) return 0;
      var cost = overlapArea(a.r, [b.r[0] - 4, b.r[1] - 4, b.r[2] + 4, b.r[3] + 4]) * W_PAIR;
      if (a.lead && segHitsRect(a.lead, [b.r[0] - 2, b.r[1] - 2, b.r[2] + 2, b.r[3] + 2])) cost += 14000;
      if (b.lead && segHitsRect(b.lead, [a.r[0] - 2, a.r[1] - 2, a.r[2] + 2, a.r[3] + 2])) cost += 14000;
      if (a.lead && b.lead && segCross(a.lead, b.lead)) cost += 6000;
      return cost;
    }
    // Candidates, cheapest first; the 220 cheapest are kept.
    var cands = list.map(function (lb) {
      var sizes = [[lb.w, lb.h, false]], cs = [];
      if (lb.cw) sizes.push([lb.cw, lb.ch, true]);
      var add = function (pos, pi, sz, reach) {
        var r = labelRect(pos[0], lb.x, lb.y, sz[0], sz[1], lb.g + reach, pos[1]);
        var lead = reach ? leaderLine(lb.x, lb.y, r, lb.pinR || 12) : null;
        var soft = reach * reach * 2 + (sz[2] ? 500 : 0) + pi * 2;
        var hard = fixedCost(r, lead, lb.id, lb.must);
        var out = Math.max(0, edge - r[0], r[2] - (Wd - edge), edge - r[1], r[3] - (Ht - edge));
        cs.push({ r: r, lead: lead, reach: reach, compact: sz[2], dir: pos[0], hard: hard, cost: hard + soft, out: out });
      };
      sizes.forEach(function (sz) {
        LABEL_POS.forEach(function (pos, pi) {
          LABEL_REACH.forEach(function (reach) { add(pos, pi, sz, reach); });
          // Also the box pushed out until it meets the map edge on that side (a label band along the edge).
          var d = pos[0], diag = d.length === 2, k = diag ? 0.72 : 1, room;
          if (d === 'top' || d === 'tl' || d === 'tr') room = (lb.y - edge - sz[1]) / k;
          else if (d === 'bottom' || d === 'bl' || d === 'br') room = (Ht - edge - sz[1] - lb.y) / k;
          else if (d === 'left') room = lb.x - edge - sz[0];
          else room = Wd - edge - sz[0] - lb.x;
          var snap = Math.floor(room - lb.g);
          if (snap > 0 && snap <= LABEL_REACH[LABEL_REACH.length - 1] && LABEL_REACH.indexOf(snap) === -1) add(pos, pi, sz, snap);
        });
      });
      cs.sort(function (a, b) { return a.cost - b.cost; });
      // A stay or crew-pick label never runs off the map (its text would be cut) while boxes inside the map exist.
      if (lb.must) { var inside = cs.filter(function (c) { return c.out <= 6; }); if (inside.length >= 8) cs = inside; }
      cs = cs.slice(0, 220);
      // A label that may hide (the airport) gives way sooner on a short map, where the pin and the key say enough.
      if (!lb.must) cs.push({ hidden: true, cost: Ht < 420 ? 6000 : Math.max(9000, lb.w * lb.h * 3), hard: 0 });
      return cs;
    });
    var n = list.length, pick = [], i, j, k;
    function labelTotal(idx, c) {
      var t = c.cost;
      for (var q = 0; q < n; q++) if (q !== idx && pick[q]) t += pairCost(c, pick[q]);
      return t;
    }
    // Greedy start in priority order.
    for (i = 0; i < n; i++) {
      var best = null, bt = Infinity;
      for (k = 0; k < cands[i].length; k++) {
        var t = labelTotal(i, cands[i][k]);
        if (t < bt) { bt = t; best = cands[i][k]; }
      }
      pick[i] = best;
    }
    function total() {
      var t = 0;
      for (var a = 0; a < n; a++) { t += pick[a].cost; for (var b = a + 1; b < n; b++) t += pairCost(pick[a], pick[b]); }
      return t;
    }
    var greedy = pick.slice(), bestTotal = total(), bestPick = pick.slice();
    if (n > 1 && bestTotal > 0) {
      // Five short annealing runs from the greedy start, each with its own fixed seed; the cheapest layout wins.
      (opts.seeds || [7919, 104729, 1299709, 15485863, 32452843]).forEach(function (seed) {
        var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        pick = greedy.slice();
        var cur = total(), steps = opts.steps || 2000;
        for (var st = 0; st < steps; st++) {
          var T = 14000 * Math.pow(0.002, st / steps);
          var li = Math.floor(rnd() * n), lc = cands[li], c = lc[Math.floor(Math.pow(rnd(), 1.5) * lc.length)];
          if (c === pick[li]) continue;
          var delta = labelTotal(li, c) - labelTotal(li, pick[li]);
          if (delta < 0 || rnd() < Math.exp(-delta / T)) {
            pick[li] = c; cur += delta;
            if (cur < bestTotal - 0.5) { bestTotal = cur; bestPick = pick.slice(); }
          }
        }
      });
      pick = bestPick;
      // Polish: each label takes its best box with the others fixed; then every pair of labels tries their 24
      // cheapest boxes together (one label making room for another), until nothing improves.
      for (var pass = 0; pass < 4; pass++) {
        var changed = false;
        for (i = 0; i < n; i++) {
          var b0 = labelTotal(i, pick[i]);
          for (k = 0; k < cands[i].length; k++) {
            var tk = labelTotal(i, cands[i][k]);
            if (tk < b0 - 0.5) { b0 = tk; pick[i] = cands[i][k]; changed = true; }
          }
        }
        for (i = 0; i < n; i++) {
          for (j = i + 1; j < n; j++) {
            var pi0 = pick[i], pj0 = pick[j];
            pick[j] = null;
            var base = labelTotal(i, pi0), bi = pi0, bj = pj0;
            pick[i] = pi0;
            base += labelTotal(j, pj0);
            var ci = cands[i].slice(0, 24), cj = cands[j].slice(0, 24);
            for (var a = 0; a < ci.length; a++) {
              pick[j] = null;
              var ti = labelTotal(i, ci[a]);   // without label j
              pick[i] = ci[a];
              for (var b = 0; b < cj.length; b++) {
                var tt = ti + labelTotal(j, cj[b]);   // j with i at its new box
                if (tt < base - 0.5) { base = tt; bi = ci[a]; bj = cj[b]; }
              }
            }
            pick[i] = bi; pick[j] = bj;
            if (bi !== pi0 || bj !== pj0) changed = true;
          }
        }
        if (!changed) break;
      }
    }
    if (opts.stats) opts.stats.total = total();
    for (i = 0; i < n; i++) out[list[i].id] = pick[i] && !pick[i].hidden ? pick[i] : null;
    return out;
  }
  function segCross(a, b) {
    var d = function (p, q, r) { return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x); };
    var A = { x: a.x1, y: a.y1 }, B = { x: a.x2, y: a.y2 }, C = { x: b.x1, y: b.y1 }, D = { x: b.x2, y: b.y2 };
    return d(A, B, C) * d(A, B, D) < 0 && d(C, D, A) * d(C, D, B) < 0;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeBudget: computeBudget, defaultState: defaultState, defaultChoice: defaultChoice, applyPlanDefaults: applyPlanDefaults, stateForPlan: stateForPlan, choiceIds: choiceIds, effectiveChoice: effectiveChoice, planShort: planShort, planRole: planRole, sentences: sentences, richText: richText, stripStatusTail: stripStatusTail, picksText: picksText, boatTime: boatTime, staysForPlan: staysForPlan, spreadPoints: spreadPoints, placeLabels: placeLabels, projectBox: projectBox, geoBox: geoBox, viewPoints: viewPoints };
  }
  if (!IS_BROWSER) return;

  /* =================================================================== BROWSER */
  var state;
  var listeners = [];
  function onChange(fn) { listeners.push(fn); }
  function emit(kind) { listeners.forEach(function (fn) { try { fn(kind); } catch (e) { reportError(e); } }); }
  function reportError(e) { if (W.console && console.warn) console.warn('[trip site]', e && e.message ? e.message : e); }

  function setPlan(id, source) {
    if (!planById(id) || state.plan === id) { syncPlanInputs(); return; }
    state.plan = id;
    applyPlanDefaults(state, id);
    savePlan(id);
    syncPlanInputs();
    emit('plan');
    if (source !== 'calc') {
      var r = computeBudget(state);
      toast(planShort(id) + ' (' + planRole(id).toLowerCase() + '): about ' + hkd(r.lo, r.hi) + ' each, estimate');
    }
  }
  function syncPlanInputs() {
    $$('input[data-plan-input]').forEach(function (inp) { inp.checked = inp.value === state.plan; });
    $$('[data-plan-choose]').forEach(function (b) {
      var on = b.getAttribute('data-plan-choose') === state.plan;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? 'Showing this plan' : 'Show this plan';
    });
    $$('[data-plan-tile]').forEach(function (b) {
      var on = b.getAttribute('data-plan-tile') === state.plan;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var st = $('[data-pick-state]', b);
      if (st) st.textContent = on ? 'The page is showing this plan' : 'Show this plan on the page';
    });
    document.documentElement.setAttribute('data-plan', state.plan);
  }

  // The plan you last looked at is remembered on this device. Old or unknown ids fall back to the crew's plan.
  var PLAN_KEY = 'maldives-surf-2026:plan';
  function savePlan(id) { store.set(PLAN_KEY, id); }
  function savedPlan() {
    var v = store.get(PLAN_KEY);
    if (v && planById(v)) return v;
    if (v) store.remove(PLAN_KEY);
    return null;
  }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 3200);
  }

  function renderInto(name, html) {
    var el = $('[data-render="' + name + '"]');
    if (el) el.innerHTML = html;
    return el;
  }
  function bind(name, text, asHtml) {
    $$('[data-bind="' + name + '"]').forEach(function (el) {
      if (asHtml) el.innerHTML = text; else el.textContent = text;
    });
  }

  /* ------------------------------------------------------- plan pickers, nav */
  // The organiser's order (15 Sep): the map overview first, sections 1-8, then the unnumbered extras.
  var SECTIONS = [
    ['top', 'Map overview', ''], ['overview', 'Overview', '1'], ['budget', 'Budget overall', '2'], ['flights', 'Flights', '3'],
    ['stay', 'Accommodation', '4'], ['spots', 'Surf spots', '5'], ['coaching', 'Surf coaching', '6'], ['transport', 'Local transport', '7'],
    ['activities', 'Other activities', '8'], ['food', 'Eat & drink', ''], ['itinerary', 'Day-by-day plan', ''], ['prep', 'Before you go', ''],
    ['sources', 'Sources & photo credits', '']
  ];
  // Old links from v2 (shared in the chat before the restructure) still land somewhere sensible.
  // (#vibe still exists as the gallery heading in 1 Overview, and #plan now lands on "The plan in 30 seconds".)
  var LEGACY_IDS = { surf: 'spots', plan: 'plan-title', 'heads-title': 'read-first', 'spots-title': 'spots' };

  function renderPlanPickers() {
    $$('[data-plan-group]').forEach(function (fs) {
      var g = fs.getAttribute('data-plan-group');
      var legend = fs.querySelector('legend');
      var html = TRIP.plans.map(function (p) {
        var inner = '<span class="seg-name">' + (p.recommended && g === 'top' ? '<span class="seg-pick" aria-hidden="true"></span>' : '') +
          esc(planShort(p.id)) + '<span class="vh">, ' + esc(planRole(p.id).toLowerCase()) + '</span></span>';
        if (g === 'rail') inner += '<span class="seg-role" aria-hidden="true">' + esc(planRole(p.id)) + '</span><span class="seg-est" data-plan-est="' + esc(p.id) + '"></span>';
        return '<label class="seg-opt"><input type="radio" name="plan-' + g + '" value="' + esc(p.id) + '" data-plan-input>' + inner + '</label>';
      }).join('');
      fs.innerHTML = '';
      if (legend) fs.appendChild(legend);
      fs.insertAdjacentHTML('beforeend', html);
      fs.addEventListener('change', function (e) {
        if (e.target && e.target.name === 'plan-' + g) setPlan(e.target.value, g);
      });
    });
  }
  function updatePlanEstimates() {
    // The desktop rail compares the plans as 2 Budget overall does: each at its own default picks (crew of 11, no
    // add-ons), labelled so. Only the calculator, its dock and the "Your picks" line follow the reader's changes.
    $$('[data-plan-est]').forEach(function (el) {
      var r = computeBudget(defaultState(el.getAttribute('data-plan-est')));
      el.textContent = hkd(r.lo, r.hi) + ' each, default picks (estimate)';
    });
    $$('[data-plan-total]').forEach(function (el) {
      var r = computeBudget(stateForPlan(state, el.getAttribute('data-plan-total')));
      el.textContent = hkd(r.lo, r.hi);
    });
  }

  function renderNav() {
    $$('[data-nav]').forEach(function (ul) {
      ul.innerHTML = SECTIONS.map(function (s) {
        var num = s[2] ? '<span class="nav-num">' + esc(s[2]) + '</span> ' :
          s[0] === 'top' ? '<span class="nav-num nav-num--map" aria-hidden="true"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M2.5 5.5l5-2 5 2 5-2v11l-5 2-5-2-5 2z M7.5 3.5v11 M12.5 5.5v11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></span>' :
          '<span class="nav-num nav-num--none" aria-hidden="true"></span>';
        return '<li><a href="#' + s[0] + '" data-nav-link="' + s[0] + '"' + (s[0] === 'spots' ? ' class="nav-spots"' : '') + '>' + num + '<span class="nav-label">' + esc(s[1]) + '</span></a></li>';
      }).join('');
    });
    if ('IntersectionObserver' in W) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var id = en.target.id;
          $$('[data-nav-link]').forEach(function (a) {
            if (a.getAttribute('data-nav-link') === id) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      SECTIONS.forEach(function (s) { var el = document.getElementById(s[0]); if (el) io.observe(el); });
    }
  }

  function initMenu() {
    var dlg = $('#menu'), open = $('#menu-open'), close = $('#menu-close');
    if (!dlg || !open) return;
    var supports = typeof dlg.showModal === 'function';
    function show() {
      var r = computeBudget(state);
      bind('menu-estimate', planShort(state.plan) + ' (' + planRole(state.plan).toLowerCase() + '): ' + hkd(r.lo, r.hi) + ' each, estimate');
      if (supports) dlg.showModal(); else dlg.setAttribute('open', '');
      document.body.classList.add('menu-open');
      open.setAttribute('aria-expanded', 'true');
    }
    function hide() {
      if (supports && dlg.open) dlg.close(); else dlg.removeAttribute('open');
      document.body.classList.remove('menu-open');
      open.setAttribute('aria-expanded', 'false');
    }
    open.setAttribute('aria-expanded', 'false');
    open.addEventListener('click', show);
    close.addEventListener('click', function () { hide(); open.focus(); });
    dlg.addEventListener('close', function () { document.body.classList.remove('menu-open'); open.setAttribute('aria-expanded', 'false'); });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) { hide(); return; }
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a) hide();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dlg.hasAttribute('open')) hide(); });
  }

  /* ------------------------------------------------------- jumps and scrolling */
  // Scroll without the page-wide smooth scrolling from the stylesheet.
  function scrollInstant(fn) {
    var de = document.documentElement, prev = de.style.scrollBehavior;
    de.style.scrollBehavior = 'auto';
    try { fn(); } finally { de.style.scrollBehavior = prev; }
  }
  function focusTarget(el) {
    if (!el) return;
    var native = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(el.tagName) && !(el.tagName === 'A' && !el.hasAttribute('href'));
    if (!native && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
  }
  // In-page links: a short hop scrolls smoothly; a jump of more than about 3 screens lands at once,
  // so nobody watches half the page fly past (and no blank frames on slow phones).
  var JUMP_SCREENS = 3;
  // The plate photo at the top of a section is lazy. When someone heads there from a link, start its download
  // at once (on touch-down, before the click), so the photo, not the placeholder, is what they land on.
  function warmTarget(a) {
    var id = a && a.getAttribute('href') ? a.getAttribute('href').slice(1) : '';
    var target = id && document.getElementById(id);
    if (!target) return;
    var sec = (target.closest && target.closest('section, footer')) || target;
    $$('.plate-media img', sec).forEach(function (img) {
      if (img.getAttribute('loading') === 'lazy') {
        img.setAttribute('fetchpriority', 'high');
        img.setAttribute('loading', 'eager');
      }
    });
  }
  function initJumps() {
    var warm = function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
      if (a) warmTarget(a);
    };
    document.addEventListener('pointerdown', warm, { passive: true });
    document.addEventListener('focusin', warm);
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = resolveId(a.getAttribute('href').slice(1));
      // "#spot-sultans": open the Surf spots module on that spot (map, card and details).
      if (/^spot-/.test(id) && spotById(id.slice(5))) {
        e.preventDefault();
        openSpotLink(id.slice(5), { push: true, focus: true });
        return;
      }
      var target = id && document.getElementById(id);
      if (!target) return;
      warmTarget(a);
      var screens = Math.abs(target.getBoundingClientRect().top) / (W.innerHeight || 800);
      if (id === 'spots') {
        e.preventDefault();
        startModuleMap();
        scrollToSpots(screens <= JUMP_SCREENS);
        try { if (W.history && history.pushState) history.pushState(null, '', '#spots'); } catch (err) { /* sandboxed or file:// */ }
        focusTarget(target);
        return;
      }
      if (screens <= JUMP_SCREENS && id === a.getAttribute('href').slice(1)) return;   // the stylesheet's smooth scroll handles short hops
      e.preventDefault();
      scrollInstant(function () { target.scrollIntoView({ block: 'start', behavior: 'auto' }); });
      try { if (W.history && history.pushState) history.pushState(null, '', '#' + id); } catch (err) { /* sandboxed or file:// */ }
      focusTarget(target);
    });
    W.addEventListener('hashchange', function () {
      var id = resolveId(W.location.hash.slice(1));
      if (/^spot-/.test(id) && spotById(id.slice(5))) openSpotLink(id.slice(5), { focus: true });
      else if (id === 'spots') { startModuleMap(); scrollToSpots(false); }
      else if (id !== W.location.hash.slice(1)) {
        var t = document.getElementById(id);
        if (t) scrollInstant(function () { t.scrollIntoView({ block: 'start', behavior: 'auto' }); });
      }
    });
  }
  // "5 Surf spots" lands with its heading just under the top bar. Scrolling to the section itself would leave the
  // module's top padding, its wave edge and the end of section 4 showing under the bar.
  function scrollToSpots(smooth) {
    var h = $('#spots-title') || $('#spots');
    if (!h) return;
    // Phones held sideways (under 500 px tall): the heading, intro and view chips would fill the screen and leave a
    // strip of map, so the jump puts the map box under the top bar, as a spot link does.
    if (sheetSide() && $('#map-box') && typeof W.scrollTo === 'function') { alignSpotMap(smooth); return; }
    if (typeof W.scrollTo !== 'function') { h.scrollIntoView({ block: 'start', behavior: 'auto' }); return; }
    var bar = $('#topbar'), barH = bar ? bar.offsetHeight || 0 : 0;
    var y = Math.max(0, h.getBoundingClientRect().top + (W.pageYOffset || document.documentElement.scrollTop || 0) - barH - 14);
    if (smooth && !reduceMotion) { try { W.scrollTo({ top: y, behavior: 'smooth' }); return; } catch (e) { /* older browsers */ } }
    scrollInstant(function () { W.scrollTo(0, y); });
  }
  function resolveId(id) {
    try { id = decodeURIComponent(String(id || '')); } catch (e) { id = String(id || ''); }
    return LEGACY_IDS[id] || id;
  }
  // A link shared from WhatsApp ("...#spots", "...#spot-jailbreaks") has to land on a page that JavaScript builds
  // after the browser's own jump, so the jump is done again once the page is built (and once the fonts are in),
  // unless the reader has already started moving around.
  function handleInitialHash() {
    var raw = W.location.hash ? W.location.hash.slice(1) : '';
    if (!raw) return;
    var id = resolveId(raw);
    var spot = /^spot-/.test(id) && spotById(id.slice(5)) ? id.slice(5) : null;
    var target = spot ? null : document.getElementById(id);
    if (!spot && !target) return;
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
    var moved = false;
    var stop = function () { moved = true; };
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) { W.addEventListener(ev, stop, { passive: true, once: true }); });
    var go = function () {
      if (moved) return;
      if (!spot && id === 'spots') { scrollToSpots(false); return; }
      if (spot) { scrollSpotModule(false); keepLinkSheet(spot); return; }
      if (target) scrollInstant(function () { target.scrollIntoView({ block: 'start', behavior: 'auto' }); });
    };
    if (spot) openSpotLink(spot, {});
    else { if (id === 'spots') startModuleMap(); go(); }
    if (W.requestAnimationFrame) W.requestAnimationFrame(go);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, function () { /* ignore */ });
    W.addEventListener('load', go, { once: true });
    setTimeout(go, 1200);
  }
  // A shared spot link on a phone: while the page is still settling and the reader has not touched anything, a sheet
  // closed by something other than the reader (a browser scroll or a layout shift moving the map out of view for a
  // moment) opens again with the re-jump. A tap, key or wheel stops the re-jumps, so a reader's own close stays closed.
  function keepLinkSheet(id) {
    var sh = $('#spot-sheet');
    if (!sh || !isSheetMode() || selectedSpot !== id || sh.classList.contains('is-open')) return;
    openSheet();
    if (mod.fallback) drawSchematic('mod');
  }

  /* ---------------------------------------------------- long lists on phones */
  // On phones a long list shows a few items and a "Show all N" button under it. The stylesheet only hides
  // clipped items below 900 px, so tablets and desktops always show everything.
  var clips = {};
  function listItems(list) {
    return Array.prototype.filter.call(list.children, function (el) { return !el.hidden && !el.hasAttribute('data-clip-btn'); });
  }
  function clipItems(c) {
    return c.lists.reduce(function (all, l) { return all.concat(listItems(l)); }, []);
  }
  // key: unique name; list: the element whose children are the items; noun: "places"; limit: items kept (0 = none);
  // keep(el, i): optional rule for which items stay (falls back to the first `limit` if it keeps none).
  // o.more: further lists counted under the same button (their items come after the first list's);
  // o.after: the element the button goes after (default: the last list); o.text(open, n): the button's words.
  function clipList(key, list, noun, limit, keep, o) {
    if (!list) return;
    o = o || {};
    var lists = [list].concat((o.more || []).filter(Boolean));
    var c = clips[key];
    if (!c || c.list !== list) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-quiet clip-more';
      btn.setAttribute('data-clip-btn', key);
      lists.forEach(function (l, i) { if (!l.id) l.id = 'clip-' + key + (i ? '-' + i : ''); });
      btn.setAttribute('aria-controls', lists.map(function (l) { return l.id; }).join(' '));
      (o.after || lists[lists.length - 1]).insertAdjacentElement('afterend', btn);
      c = clips[key] = { open: false, btn: btn, list: list };
      btn.addEventListener('click', function (e) { toggleClip(key, e.detail === 0); });
    }
    c.lists = lists;
    c.noun = noun; c.limit = limit == null ? 3 : limit; c.keep = keep || null; c.text = o.text || null;
    applyClip(key);
  }
  function applyClip(key) {
    var c = clips[key];
    if (!c) return;
    c.lists.forEach(function (l, i) {
      if (i) l.classList.remove('is-clipped');
      Array.prototype.forEach.call(l.children, function (el) { el.classList.remove('is-clipped'); });
    });
    var items = clipItems(c);
    var kept = c.keep ? items.filter(function (el, i) { return c.keep(el, i); }) : [];
    if (!kept.length) kept = items.slice(0, c.limit);
    var extra = items.length - kept.length;
    if (!c.open) items.forEach(function (el) { if (kept.indexOf(el) === -1) el.classList.add('is-clipped'); });
    // A further list with nothing left showing folds away too, so it leaves no empty gap.
    c.lists.forEach(function (l, i) {
      if (i && !c.open && listItems(l).every(function (el) { return el.classList.contains('is-clipped'); })) l.classList.add('is-clipped');
    });
    c.btn.hidden = extra <= 0;
    c.btn.setAttribute('aria-expanded', String(c.open));
    c.btn.textContent = c.text ? c.text(c.open, items.length) : c.open ? 'Show fewer ' + c.noun : 'Show all ' + items.length + ' ' + c.noun;
  }
  function toggleClip(key, byKeyboard) {
    var c = clips[key];
    if (!c) return;
    var btn = c.btn, before = btn.getBoundingClientRect().top;
    var shown = clipItems(c).filter(function (el) { return !el.classList.contains('is-clipped'); });
    c.open = !c.open;
    applyClip(key);
    if (c.open) {
      // The first new item lands where the button was, so the list seems to unfold from there.
      var first = clipItems(c).filter(function (el) { return shown.indexOf(el) === -1; })[0];
      if (first) {
        scrollInstant(function () { W.scrollBy(0, first.getBoundingClientRect().top - before); });
        if (byKeyboard) focusTarget(first);
      }
    } else {
      scrollInstant(function () { W.scrollBy(0, btn.getBoundingClientRect().top - before); });
    }
  }
  // Phones only: a block of detail behind one "Show ..." button placed above it (tablets and desktops show it all,
  // because the stylesheet only hides .is-folded below 900 px). The button stays where it is when tapped.
  var folds = {};
  function foldBlock(key, els, label) {
    els = (els || []).filter(Boolean);
    if (!els.length) return;
    var f = folds[key];
    if (!f) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-quiet clip-more fold-more';
      btn.setAttribute('data-fold-btn', key);
      btn.setAttribute('aria-controls', els.map(function (el, i) { if (!el.id) el.id = 'fold-' + key + '-' + i; return el.id; }).join(' '));
      els[0].insertAdjacentElement('beforebegin', btn);
      f = folds[key] = { open: false, btn: btn };
      btn.addEventListener('click', function () {
        var before = btn.getBoundingClientRect().top;
        f.open = !f.open;
        applyFold(key);
        scrollInstant(function () { W.scrollBy(0, btn.getBoundingClientRect().top - before); });
      });
    }
    f.els = els; f.label = label;
    applyFold(key);
  }
  function applyFold(key) {
    var f = folds[key];
    f.els.forEach(function (el) { el.classList.toggle('is-folded', !f.open); });
    f.btn.setAttribute('aria-expanded', String(f.open));
    f.btn.textContent = (f.open ? 'Hide ' : 'Show ') + f.label;
  }
  function isWide() { return !!(W.matchMedia && W.matchMedia('(min-width: 900px)').matches); }

  /* ------------------------------------------------------------------- share */
  function shareUrl() { return String(W.location.href).split('#')[0]; }
  function renderShare() {
    var text = 'Maldives surf trip plan, 1-10 Nov 2026: ' + shareUrl();
    var wa = 'https://wa.me/?text=' + encodeURIComponent(text);
    $$('[data-share-slot]').forEach(function (slot) {
      slot.innerHTML = '<div class="share">' +
        '<button type="button" class="btn btn-solid" data-copy-link>' +
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<span>Copy link</span></button>' +
        '<a class="btn btn-wa" href="' + esc(wa) + '" target="_blank" rel="noopener noreferrer">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
        '<span>Share on WhatsApp</span></a>' +
        '</div>';
    });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-copy-link]');
      if (!b) return;
      copyText(shareUrl()).then(function (ok) {
        toast(ok ? 'Link copied. Paste it in the crew chat.' : 'Copy did not work here. Copy the address bar instead.');
      });
    });
  }
  function copyText(t) {
    try {
      if (navigator.clipboard && W.isSecureContext) {
        return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return legacyCopy(t); });
      }
    } catch (e) { /* fall through */ }
    return Promise.resolve(legacyCopy(t));
  }
  function legacyCopy(t) {
    try {
      var ta = document.createElement('textarea');
      ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ photos */
  // Photos are hotlinked from Wikimedia Commons, Unsplash and Pexels (plan/photos.json). Nothing is copied.
  var PHOTO_LIST = (W.TRIP_PHOTOS && W.TRIP_PHOTOS.photos) || [];
  var usedPhotos = [];
  var PLATES = {
    overview: 'man-surfing-male-maldives',
    itinerary: 'sunset-boat-jetty-kanuhura',
    flights: 'baa-atoll-aerial-islands',
    transport: 'speedboat-wake-kaashidhoo',
    stay: 'bikini-beach-himmafushi',
    coaching: 'surfer-walking-beach-sunset-generic',
    food: 'garudhiya-maldivian-fish-soup',
    activities: 'guraidhoo-sandbank-aerial',
    prep: 'surfboards-on-beach-generic'
  };
  // The photo strip in 1 Overview (v2's gallery, trimmed; the v2 hero photo of Thulusdhoo's reef leads it now the map is the hero).
  var VIBE = ['thulusdhoo-reef-wave-aerial', 'surfer-barrel-maldives-surfari', 'dhonfanu-aerial-island', 'man-on-sandbank-looking-at-sea'];
  // Plan cards, in plan order: local-island scenes (the captions name the real islands, which are not our guesthouses).
  var STAY_PHOTOS = ['street-scene-viliggili-island', 'beach-scene-maafushi-island'];
  var LEG_PHOTOS = { 'airport-to-thulusdhoo': 'water-taxis-male' };
  var ACT_PHOTOS = { 'house-reef-snorkel': 'snorkeler-blacktip-reef-shark', 'try-dive': 'green-sea-turtle-makunudu-1', 'night-fishing': 'maldivian-fishing-dhoni-addu', 'male-walk': 'harborfront-skyline-male' };
  var DISH_PHOTO = 'mas-huni-with-roshi';
  var LARGE_MEDIA = '(min-width: 1000px)';   // phones, even in landscape, only ever get the small file

  function photoById(id) { return PHOTO_LIST.filter(function (p) { return p.id === id; })[0] || null; }
  function markUsed(p) { if (p && usedPhotos.indexOf(p) === -1) usedPhotos.push(p); }
  function srcWidth(url, fallback) {
    var m = /\/(\d+)px-[^\/]+$/.exec(url) || /[?&]w=(\d+)/.exec(url);
    return m ? Number(m[1]) : fallback;
  }
  function picture(p, o) {
    if (!p) return '';
    o = o || {};
    markUsed(p);
    var sizes = o.sizes || '100vw';
    var sw = srcWidth(p.src_small, Math.min(p.width, 720)), lw = srcWidth(p.src_large, p.width);
    var img = '<img src="' + esc(p.src_small) + '" srcset="' + esc(p.src_small) + ' ' + sw + 'w" sizes="' + esc(sizes) + '" width="' + Number(p.width) + '" height="' + Number(p.height) + '"' +
      ' alt="' + esc(p.alt) + '" loading="lazy" decoding="async">';
    if (p.src_large === p.src_small) return '<picture>' + img + '</picture>';
    return '<picture><source media="' + LARGE_MEDIA + '" srcset="' + esc(p.src_small) + ' ' + sw + 'w, ' + esc(p.src_large) + ' ' + lw + 'w" sizes="' + esc(sizes) + '">' + img + '</picture>';
  }
  function creditText(p) { return p.credit + ', ' + p.license; }
  function captionText(p) { var c = String(p.caption || '').trim(); return /[.!?]$/.test(c) ? c : c + '.'; }
  function figcap(p) {
    return '<figcaption>' + esc(captionText(p)) + ' <span class="credit">' + esc(creditText(p)) + '</span></figcaption>';
  }
  function photoFigure(p, frameCls, sizes, figCls) {
    if (!p) return '';
    return '<figure class="fig ' + (figCls || '') + '"><span class="ph ' + (frameCls || '') + '">' + picture(p, { sizes: sizes }) + '</span>' + figcap(p) + '</figure>';
  }
  // A photo that fails to load gets one quiet retry a few seconds later (photo hosts sometimes turn away a
  // quick burst of requests). If that fails too it is hidden, and its frame keeps the gradient and wave texture.
  function breakImg(img) {
    img.classList.remove('is-retrying');
    img.hidden = true;
    if (!img.closest) return;
    var ph = img.closest('.ph');
    if (ph) ph.classList.add('is-broken');
    // A caption and credit with nothing above them would describe a photo nobody can see, so they go too. The photo
    // strip drops the whole item (and its swipe hint once nothing is left); the Sources list still credits the photo.
    var fig = img.closest('figure'), li = fig && fig.closest('.vibe > li');
    if (li) {
      li.hidden = true;
      var ul = li.parentNode, hint = ul && ul.parentNode && $('.vibe-hint', ul.parentNode);
      if (ul && hint && !Array.prototype.some.call(ul.children, function (x) { return !x.hidden; })) hint.hidden = true;
      syncVibeScroller();
    } else if (fig) {
      var cap = $('figcaption', fig);
      if (cap) cap.hidden = true;
    }
    var plate = img.closest('.plate'), pc = plate && $('.plate-cap', plate);
    if (pc) pc.hidden = true;
  }
  function retryImg(img) {
    img.setAttribute('data-retried', '1');
    img.classList.add('is-retrying');
    setTimeout(function () {
      var ss = img.getAttribute('srcset'), src = img.getAttribute('src');
      var pic = img.parentNode && img.parentNode.tagName === 'PICTURE' ? img.parentNode : null;
      if (pic) $$('source', pic).forEach(function (s) { var v = s.getAttribute('srcset'); s.removeAttribute('srcset'); s.setAttribute('srcset', v); });
      if (ss) { img.removeAttribute('srcset'); img.setAttribute('srcset', ss); }
      if (src) { img.removeAttribute('src'); img.setAttribute('src', src); }
    }, 2500 + Math.round(Math.random() * 2000));
  }
  function initPhotoFallbacks() {
    document.addEventListener('error', function (e) {
      var t = e.target;
      if (!t || t.tagName !== 'IMG') return;
      if (t.getAttribute('data-retried')) breakImg(t); else retryImg(t);
    }, true);
    document.addEventListener('load', function (e) {
      var t = e.target;
      if (t && t.tagName === 'IMG') t.classList.remove('is-retrying');
    }, true);
  }

  // Wave edges between blocks: two strips of the next colour (CSS masks), drifting sideways while on screen.
  function edgeSvg(colour) {
    return '<div class="edge edge--' + esc(colour || 'shallows') + '" aria-hidden="true"><span class="strip strip-a"></span><span class="strip strip-b"></span></div>';
  }
  function renderPlates() {
    var sizes = '(min-width: 1100px) calc(100vw - 284px), 100vw';
    $$('[data-plate]').forEach(function (el) {
      var p = photoById(PLATES[el.getAttribute('data-plate')]);
      if (p) {
        var media = document.createElement('div');
        media.className = 'plate-media ph';
        media.innerHTML = picture(p, { sizes: sizes });
        el.insertBefore(media, el.firstChild);
        var copy = $('.plate-copy', el);
        if (copy) copy.insertAdjacentHTML('beforeend', '<p class="plate-cap">' + esc(captionText(p)) + ' <span class="credit">' + esc(creditText(p)) + '</span></p>');
      }
      el.insertAdjacentHTML('beforeend', edgeSvg(el.getAttribute('data-edge')));
      el.setAttribute('data-reveal', '');
      el.setAttribute('data-live', '');
    });
    $$('.edge-top').forEach(function (el) {
      el.innerHTML = edgeSvg(el.getAttribute('data-edge'));
      el.setAttribute('data-live', '');
      el.setAttribute('aria-hidden', 'true');
    });
    // The Surf spots module ends in a wave of the next band's colour.
    $$('[data-edge-bottom]').forEach(function (el) {
      el.innerHTML = edgeSvg(el.getAttribute('data-edge-bottom'));
      el.setAttribute('data-live', '');
      el.setAttribute('aria-hidden', 'true');
    });
  }
  function renderVibe() {
    var list = VIBE.map(photoById).filter(Boolean);
    var sizes = '(min-width: 1100px) calc((100vw - 380px) / 2), (min-width: 1000px) 46vw, 84vw';
    renderInto('vibe', '<ul class="vibe" aria-label="Photo gallery">' + list.map(function (p) {
      var ar = (Number(p.width) / Number(p.height)).toFixed(3);
      return '<li><figure style="--ar:' + ar + '"><span class="ph">' + picture(p, { sizes: sizes }) + '</span>' + figcap(p) + '</figure></li>';
    }).join('') + '</ul><p class="vibe-hint">Swipe sideways for more photos.</p>');
    syncVibeScroller();
    var t;
    W.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(syncVibeScroller, 150); });
  }
  // The gallery is a keyboard stop (arrow keys scroll it) only while it actually scrolls sideways, as on phones.
  function syncVibeScroller() {
    var ul = $('.vibe');
    if (!ul) return;
    if (ul.scrollWidth > ul.clientWidth + 2) {
      ul.setAttribute('tabindex', '0');
      ul.setAttribute('aria-label', 'Photo gallery, scrolls sideways');
    } else {
      ul.removeAttribute('tabindex');
      ul.setAttribute('aria-label', 'Photo gallery');
    }
  }

  /* ------------------------------------------------ top line, crew and dates */
  // The countdown digits live in "Crew and dates" (1 Overview); the first screen carries a short "N days to go" chip.
  var cdLive = false;
  function recFlight() { return (TRIP.flights.options || []).filter(function (o) { return o.recommended; })[0] || null; }
  function renderTop() {
    var m = TRIP.meta;
    bind('checked-strip',
      '<p><strong>Prices checked ' + esc(fmtDate(m.prices_checked)) + '.</strong> Every price here is a snapshot or an estimate. Re-check it before anyone books or pays. Price cards and calculator lines carry a label that says how solid each price is; prices written into the day plan and notes say it in brackets, and the matching card has the details.</p>' +
      '<details class="legend-wrap"><summary>What the price labels mean</summary>' + statusLegend() + '</details>', true);
    bind('footer-note', m.disclaimer);
    var picks = TRIP.spots.filter(function (s) { return s.crew_pick; }).map(spotShort);
    bind('spots-tagline', TRIP.spots.length + ' breaks on a map, boat times');
    bind('spots-lede', 'All ' + TRIP.spots.length + ' breaks our research found in North and South Malé, on one map. The crew picks are ' + listWords(picks) +
      '. Boat times are as the guides give them from ' + basePlace().name + '. Tap a pin or a card for the details.');
  }
  function listWords(arr) {
    if (arr.length < 2) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  }
  function renderCrew() {
    var rec = recFlight(), nights = tripNights();
    var rows = [['In the Maldives', 'Sun 1 to Tue 10 Nov 2026, ' + nights + ' nights']];
    if (rec) {
      var o0 = rec.outbound.legs[0], r0 = rec.return.legs[0], rz = rec.return.legs[rec.return.legs.length - 1];
      rows.push(['Fly out', rec.outbound.date.replace(/ 2026$/, '') + ', ' + o0.flight + ' leaves Hong Kong at ' + o0.dep]);
      rows.push(['Fly home', rec.return.date.replace(/ 2026$/, '') + ', ' + r0.flight + ' leaves Malé at ' + r0.dep + '; lands in Hong Kong Wed 11 Nov at ' + String(rz.arr).replace(/\s*\(\+1\)/, '')]);
    }
    var html = '<div class="crew-facts"><p class="crew-who">' + esc(TRIP.meta.subtitle) + '</p>' +
      '<dl class="crew-dl">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="fine">Flight times follow our recommended ' + esc(recFlightName()) + ' flights; see 3 Flights.</p></div>' +
      '<div class="countdown" id="countdown" role="timer" data-live>' +
      '<p class="countdown-label" data-bind="countdown-label">Until the flight leaves Hong Kong</p>' +
      '<div class="countdown-digits" data-bind="countdown"></div>' +
      '<p class="countdown-flight" data-bind="countdown-flight"></p></div>';
    renderInto('crew', html);
    if (rec) {
      var leg = rec.outbound.legs[0];
      bind('countdown-flight', leg.flight + ' leaves Hong Kong ' + rec.outbound.date.replace(/ 2026$/, '') + ' at ' + leg.dep + ' (HK time)');
    }
    tickCountdown(true);
    scheduleTick();
  }
  function scheduleTick() {
    setTimeout(function () { tickCountdown(false); scheduleTick(); }, 1000 - (Date.now() % 1000) + 15);
  }
  var cdLast = {}, chipLast = '';
  function tickCountdown(force) {
    var dep = Date.parse(TRIP.meta.depart_hk);
    var end = Date.parse(TRIP.meta.trip_end + 'T23:59:00+05:00');
    var now = Date.now(), diff = dep - now;
    // The chip on the first screen: whole days only, so it changes at most once an hour.
    var chipText = diff > 864e5 ? Math.floor(diff / 864e5) + ' days to go' : diff > 0 ? 'Flying out today' : now < end ? 'The crew is away' : 'Trip done';
    if (chipText !== chipLast) { bind('countdown-chip', chipText); chipLast = chipText; }
    if (!force && (!cdLive || document.hidden)) return;
    var el = $('[data-bind="countdown"]');
    if (!el) return;
    if (diff > 0) {
      var v = { d: Math.floor(diff / 864e5), h: Math.floor(diff % 864e5 / 36e5), m: Math.floor(diff % 36e5 / 6e4), s: Math.floor(diff % 6e4 / 1e3) };
      if (!$('[data-cd="d"]', el)) {
        el.innerHTML = unit('d', v.d === 1 ? 'day' : 'days') + unit('h', v.h === 1 ? 'hour' : 'hours') + unit('m', 'min') + unit('s', 'sec');
        cdLast = {};
      }
      ['d', 'h', 'm', 's'].forEach(function (k) {
        if (cdLast[k] === v[k]) return;
        var n = $('[data-cd="' + k + '"]', el);
        n.textContent = k === 'd' ? String(v[k]) : (v[k] < 10 ? '0' : '') + v[k];
        if (cdLast[k] !== undefined && !reduceMotion) { n.classList.remove('is-tick'); void n.offsetWidth; n.classList.add('is-tick'); }
        cdLast[k] = v[k];
      });
      var dl = $('[data-cd-lbl="d"]', el), hl = $('[data-cd-lbl="h"]', el);
      if (dl) dl.textContent = v.d === 1 ? 'day' : 'days';
      if (hl) hl.textContent = v.h === 1 ? 'hour' : 'hours';
      if (force || v.s === 0) el.setAttribute('aria-label', v.d + ' days, ' + v.h + ' hours and ' + v.m + ' minutes to go');
      bind('countdown-label', 'Until the flight leaves Hong Kong');
    } else if (now < end) {
      el.innerHTML = '<span class="cd-now">The crew is away</span>';
      bind('countdown-label', 'Trip in progress');
    } else {
      el.innerHTML = '<span class="cd-now">Trip done</span>';
      bind('countdown-label', 'Welcome home');
    }
  }
  function unit(k, label) {
    return '<span class="cd-unit"><span class="cd-num" data-cd="' + k + '"></span><span class="cd-lbl" data-cd-lbl="' + k + '">' + label + '</span></span>';
  }
  // Under the Budget and Mid tiles: a line with the calculator's own picks, shown only when they differ from the crew's plan.
  function updateEstimateMine() {
    var mine = $$('[data-bind="estimate-mine"]');
    var custom = !isDefaultState(state);
    if (custom) {
      var q = computeBudget(state);
      bind('estimate-mine', 'Your picks in the calculator (' + planShort(state.plan) + '): ' + hkd(q.lo, q.hi) + ' each (estimate).');
    }
    mine.forEach(function (el) { el.hidden = !custom; });
  }

  /* ------------------------------------------------ heads-up, plan, decisions */
  var ICON = {
    hazard: '<svg class="hz" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="3 4"/><path d="M13 20h14M20 13v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    big: '<svg viewBox="0 0 48 24" aria-hidden="true"><path d="M1 20c6 0 8-15 16-15s9 12 14 12 6-6 9-6 5 4 7 4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    small: '<svg viewBox="0 0 48 24" aria-hidden="true"><path d="M1 18c5 0 6-6 11-6s6 6 11 6 6-6 11-6 6 6 13 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    flat: '<svg viewBox="0 0 48 24" aria-hidden="true"><path d="M1 16h46" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M8 8l6-3M20 8l6-3M32 8l6-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".6"/></svg>',
    crowd: '<svg viewBox="0 0 48 24" aria-hidden="true"><circle cx="12" cy="9" r="4" fill="currentColor"/><circle cx="24" cy="7" r="4" fill="currentColor"/><circle cx="36" cy="9" r="4" fill="currentColor"/><path d="M2 21c12-4 32-4 44 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    reef: '<svg viewBox="0 0 48 24" aria-hidden="true"><path d="M2 20c10 0 10-6 22-6s12 6 22 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M16 12l3-6 3 6M28 12l3-7 3 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    ask: '<svg viewBox="0 0 48 24" aria-hidden="true"><circle cx="24" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M20.5 9.5a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.1-1.5 2.3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="24" cy="18.2" r="1.3" fill="currentColor"/></svg>'
  };

  function renderHeads() {
    var charter = (TRIP.not_available || [])[0] || {};
    var items = [
      ['November surf is a gamble', TRIP.season.verdict, '#season-title'],
      ['No surf charter boat is confirmed for our dates', charterSummary(charter.why), '#stay-not-available'],
      ['Coaching has no quote yet', firstSentences(TRIP.coaching.reality_check, 1) + ' Every coaching package price below is a wide estimate until 2-3 coaches quote.', '#coaching'],
      ['Flights and prices need a live re-check', flightCheckText(), '#flights']
    ];
    renderInto('heads', items.map(function (it) {
      return '<li class="head">' + ICON.hazard + '<div><h4>' + esc(it[0]) + '</h4><p>' + esc(it[1]) + '</p>' +
        '<a class="more" href="' + it[2] + '">Details</a></div></li>';
    }).join(''));
  }

  function charterSummary(why) {
    // Keep the nuance: nothing dated for our week, some boats run into November, asking is a long shot.
    var ss = sentences(why);
    var keep = ss.filter(function (x, i) { return i === 0 || /november|long shot/i.test(x); });
    return keep.join(' ');
  }
  function flightCheckText() {
    var rec = (TRIP.flights.options || []).filter(function (o) { return o.recommended; })[0];
    var out = '';
    if (rec) {
      out = 'The ' + rec.airline + ' fare (' + hkd(rec.fare_pp_hkd.low, rec.fare_pp_hkd.high) + ' each, ' + rec.fare_status + ') is a ' +
        fmtDate(TRIP.meta.prices_checked).replace(/ \d{4}$/, '') + ' snapshot, and its flight numbers come from a 1 Nov search, so confirm both when booking. ' +
        'Online bookings take 9 people at most, so book the crew in two groups. ';
    }
    var ds = sentences(TRIP.meta.disclaimer).filter(function (x) { return /^confirm every price/i.test(x); });
    return out + (ds[0] || firstSentences(restSentences(TRIP.meta.disclaimer, 1), 1));
  }
  function renderKeypoints() {
    renderInto('keypoints', TRIP.headline.key_points.map(function (k) {
      var i = k.indexOf(': ');
      if (i > 0 && i <= 34) return '<li><strong>' + esc(k.slice(0, i)) + '</strong> ' + esc(k.slice(i + 2)) + '</li>';
      return '<li>' + esc(k) + '</li>';
    }).join(''));
  }

  // 2 Budget overall: the crew's plan next to the upgrade, both at their own default picks, with the crew total.
  // Tapping a tile shows that plan everywhere (map stays, stay cards, day plan, calculator).
  function renderPlanPick() {
    var rec = recPlan(), rs = computeBudget(defaultState(rec.id));
    var html = '<p class="lede">' + esc(TRIP.headline.one_liner) + '</p>' +
      '<div class="pick-tiles">' + TRIP.plans.map(function (p) {
        var ds = defaultState(p.id), r = computeBudget(ds), isRec = p.id === rec.id;
        var more = !isRec && r.lo >= rs.lo && r.hi >= rs.hi;
        return '<button type="button" class="pick-tile' + (isRec ? ' is-rec' : '') + '" data-plan-tile="' + esc(p.id) + '" aria-pressed="false">' +
          '<span class="pick-role">' + esc(isRec ? "The crew's plan (organiser's pick)" : planRole(p.id)) + '</span>' +
          '<span class="pick-name">' + esc(planShort(p.id)) + '</span>' +
          '<span class="pick-desc">' + esc(planDesc(p.id)) + '</span>' +
          '<span class="pick-price">' + esc(hkd(r.lo, r.hi)) + '</span>' +
          '<span class="pick-each">each, with flights ' + chip('estimate') + '</span>' +
          '<span class="pick-group">Crew of ' + r.crew + ': ' + esc(hkd(r.groupLo, r.groupHi)) + '</span>' +
          '<span class="pick-picks">Default picks: ' + esc(picksText(ds, true)) + '.</span>' +
          (more ? '<span class="pick-delta">' + esc(hkdDelta(r, rs)) + ' more each than ' + esc(planShort(rec.id)) + ' (estimate).</span>' : '') +
          '<span class="pick-state" data-pick-state></span></button>';
      }).join('') + '</div>' +
      '<p class="estimate-mine" data-bind="estimate-mine" hidden></p>' +
      '<p class="pick-links"><a class="more" href="#calc-title">Change the picks in the calculator</a>' +
      ((TRIP.above_budget || []).length ? '<a class="more" href="#above-budget">An all-in surf resort: checked, above our budget</a>' : '') + '</p>';
    var root = renderInto('plan-pick', html);
    if (root) root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-plan-tile]');
      if (b) setPlan(b.getAttribute('data-plan-tile'), 'pick');
    });
  }

  function renderDecisions() {
    renderInto('decisions', TRIP.headline.big_decisions.map(function (d, i) {
      return '<details class="decision"' + (i === 0 && isWide() ? ' open' : '') + '><summary><span class="q">' + esc(d.question) + '</span>' +
        '<span class="pick">' + esc(d.our_pick) + '</span></summary>' +
        '<div class="decision-body"><p>' + esc(d.why) + '</p>' +
        (d.alternatives && d.alternatives.length ? '<p class="alt-h">Alternatives</p><ul class="alts">' + d.alternatives.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
        '</div></details>';
    }).join(''));
  }

  /* -------------------------------------------------------------------- surf */
  var EXPECT_ICON = ['big', 'small', 'flat', 'crowd', 'reef', 'ask'];
  // 1 Overview: what surfing in early November looks like.
  function renderSeason() {
    var s = TRIP.season;
    var facts = [['Wind', s.wind], ['Swell', s.swell], ['Water', s.water_temp], ['Air', s.air_temp], ['Rain', s.rain]];
    var html = '<h3 class="h-sub h-first" id="season-title">Surfing here in early November</h3>' +
      '<div class="verdict"><p class="verdict-kicker">Season call for 1-10 Nov</p><p class="verdict-text">' + esc(s.verdict) + '</p></div>' +
      '<ul class="expect">' + s.expectations.map(function (e, i) {
        return '<li class="expect-item"><span class="expect-icon">' + (ICON[EXPECT_ICON[i]] || ICON.ask) + '</span><div><h4>' + esc(e.label) + '</h4><p>' + esc(e.note) + '</p></div></li>';
      }).join('') + '</ul>' +
      '<div class="facts">' + facts.map(function (f) {
        var rest = restSentences(f[1], 1);
        return '<div class="fact"><h4>' + esc(f[0]) + '</h4><p>' + esc(firstSentences(f[1], 1)) + '</p>' +
          (rest ? '<details class="more-d"><summary>More on ' + esc(f[0].toLowerCase()) + '</summary><p>' + esc(rest) + '</p></details>' : '') + '</div>';
      }).join('') + '</div>' +
      '<p class="season-go"><a class="more" href="#spots">Where to surf: 5 Surf spots</a></p>';
    var root = renderInto('season', html);
    if (root) foldBlock('season', [$('.expect', root), $('.facts', root)], 'season details');
  }

  /* ------------------------------------------------------ 5 Surf spots module */
  var LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  function levelBar(level) {
    var r = levelRange(level);
    return '<span class="lvl" role="img" aria-label="Level: ' + esc(levelWords(level)) + '">' + LEVELS.map(function (n, i) {
      return '<span class="lvl-step' + (i >= r[0] && i <= r[1] ? ' is-on' : '') + '"></span>';
    }).join('') + '</span>';
  }
  var spotFilter = { pick: false, region: 'all', level: 'all', access: 'all' };
  var selectedSpot = null;

  function renderSpotFilters() {
    var uniq = function (k) {
      var seen = [];
      TRIP.spots.forEach(function (s) { if (seen.indexOf(s[k]) === -1) seen.push(s[k]); });
      return seen;
    };
    var levels = uniq('level').sort(function (a, b) { var ra = levelRange(a), rb = levelRange(b); return ra[0] - rb[0] || ra[1] - rb[1]; });
    var opt = function (v, label) { return '<option value="' + esc(v) + '">' + esc(label) + '</option>'; };
    var html = '<div class="filter-row">' +
      '<button type="button" class="toggle" aria-pressed="false" data-spot-pick>Crew picks only</button>' +
      '<div class="seg-inline" role="group" aria-label="Region">' +
      ['all'].concat(uniq('region')).map(function (r) {
        return '<button type="button" class="toggle" data-spot-region="' + esc(r) + '" aria-pressed="' + (r === 'all') + '">' + esc(r === 'all' ? 'All regions' : r.replace('Male', 'Malé')) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="filter-row">' +
      '<label class="select"><span>Level</span><select data-spot-level>' + opt('all', 'All levels') + levels.map(function (l) { return opt(l, levelWords(l)); }).join('') + '</select></label>' +
      '<label class="select"><span>Access</span><select data-spot-access>' + opt('all', 'Any access') + uniq('access').map(function (a) { return opt(a, a); }).join('') + '</select></label>' +
      '<button type="button" class="btn btn-quiet" data-spot-reset>Clear filters</button>' +
      '</div>' +
      '<p class="fine level-key">Levels are as the surf guides rate them. Int-Adv means intermediate to advanced; Beginner-Int means beginner to intermediate.</p>';
    var el = renderInto('spot-filters', html);
    el.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t) return;
      if (t.hasAttribute('data-spot-pick')) { spotFilter.pick = !spotFilter.pick; t.setAttribute('aria-pressed', String(spotFilter.pick)); }
      else if (t.hasAttribute('data-spot-region')) {
        spotFilter.region = t.getAttribute('data-spot-region');
        $$('[data-spot-region]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); });
      } else if (t.hasAttribute('data-spot-reset')) {
        resetSpotFilters(true);
        return;
      } else return;
      applySpotFilter();
    });
    el.addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-spot-level')) spotFilter.level = e.target.value;
      if (e.target.hasAttribute('data-spot-access')) spotFilter.access = e.target.value;
      applySpotFilter();
    });
  }
  function resetSpotFilters(apply) {
    var el = $('[data-render="spot-filters"]');
    spotFilter = { pick: false, region: 'all', level: 'all', access: 'all' };
    if (el) {
      var pk = $('[data-spot-pick]', el), lv = $('[data-spot-level]', el), ac = $('[data-spot-access]', el);
      if (pk) pk.setAttribute('aria-pressed', 'false');
      $$('[data-spot-region]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-spot-region') === 'all')); });
      if (lv) lv.value = 'all';
      if (ac) ac.value = 'all';
    }
    if (apply !== false) applySpotFilter();
  }
  function spotMatches(s) {
    return (!spotFilter.pick || s.crew_pick) &&
      (spotFilter.region === 'all' || s.region === spotFilter.region) &&
      (spotFilter.level === 'all' || s.level === spotFilter.level) &&
      (spotFilter.access === 'all' || s.access === spotFilter.access);
  }
  // The facts a surfer needs first stay open; swell, wind, tide, the pin and the sources fold away.
  function spotFacts(s) {
    var kv = function (rows) {
      return '<dl class="kv">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>';
    };
    var main = [
      ['Wave', s.type], ['Level', levelWords(s.level) + '. ' + s.level_note], ['Access', s.access + '. ' + s.access_note],
      ['From Thulusdhoo', s.boat_from_thulusdhoo], ['Hazards', s.hazards], ['In November', s.november_note]
    ];
    var more = [
      ['Best swell', s.best_swell], ['Best wind', s.best_wind], ['Best tide', s.best_tide],
      ['Map pin', s.lat.toFixed(3) + ', ' + s.lon.toFixed(3) + ' (' + s.coord_note + ')']
    ];
    return kv(main) + '<details class="more-d spot-more"><summary>Swell, wind, tide and sources</summary>' + kv(more) +
      '<p class="src-row"><span class="src-lbl">Sources</span> ' + s.sources.map(function (u, i) {
        var host = ''; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { host = 'source ' + (i + 1); }
        return srcLink(u, host);
      }).join(' ') + '</p></details>';
  }
  function spotRegionLabel(s) { return s.region.replace('Male', 'Malé') + ', near ' + s.nearest_island; }
  // A photo appears on a spot only when the photo's own location names that break.
  function spotPhoto(s) {
    var base = String(s.name).split(' (')[0].toLowerCase().replace(/’/g, "'");
    if (base.length < 4) return null;
    return PHOTO_LIST.filter(function (p) { return String(p.location_claim || '').toLowerCase().replace(/’/g, "'").indexOf(base) !== -1; })[0] || null;
  }
  function spotPhotoHtml(s) {
    var p = spotPhoto(s);
    return p ? photoFigure(p, '', '(min-width: 1000px) 420px, 92vw', 'spot-ph') : '';
  }
  function renderSpotList() {
    var ul = $('#spot-list');
    ul.innerHTML = TRIP.spots.map(function (s) {
      // The card id is card-<id>, not spot-<id>: a shared "#spot-<id>" link must have no element of its own, or the browser's
      // own fragment scroll moves the page to the card after openSpotLink has aligned the map (which closed the sheet).
      return '<li class="spot' + (s.crew_pick ? ' is-pick' : '') + '" id="card-' + esc(s.id) + '" data-spot="' + esc(s.id) + '">' +
        '<div class="spot-head">' +
        '<button type="button" class="spot-toggle" aria-expanded="false" aria-controls="spot-body-' + esc(s.id) + '" data-spot-open="' + esc(s.id) + '">' +
        '<span class="spot-name">' + esc(s.name) + '</span>' +
        '<span class="spot-meta">' + esc(s.type) + ', ' + esc(spotRegionLabel(s)) + '</span>' +
        '</button>' +
        '<div class="spot-tags">' + (s.crew_pick ? '<span class="tag tag-pick">Crew pick</span>' : '') +
        '<span class="tag">' + esc(s.access) + '</span>' + levelBar(s.level) + '<span class="lvl-text">' + esc(s.level) + '</span></div>' +
        '</div>' +
        '<div class="spot-body" id="spot-body-' + esc(s.id) + '" hidden>' + spotPhotoHtml(s) + spotFacts(s) +
        '<button type="button" class="btn btn-quiet" data-spot-map="' + esc(s.id) + '">Show on the map</button></div>' +
        '</li>';
    }).join('');
    ul.addEventListener('click', function (e) {
      var b = e.target.closest('[data-spot-open]');
      if (b) {
        var id = b.getAttribute('data-spot-open');
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(open));
        $('#spot-body-' + id).hidden = !open;
        if (open) selectSpot(id, 'list');
        return;
      }
      var m = e.target.closest('[data-spot-map]');
      if (m) {
        startModuleMap();
        // On phones this opens the spot's details in the sheet too and scrolls the map box under the top bar.
        selectSpot(m.getAttribute('data-spot-map'), 'show');
        if (!isSheetMode()) scrollSpotModule(true);
      }
    });
  }
  function applySpotFilter() {
    var n = 0;
    TRIP.spots.forEach(function (s) {
      var ok = spotMatches(s);
      if (ok) n++;
      var li = $('#card-' + s.id);
      if (li) li.hidden = !ok;
    });
    var M = maps.mod;
    if (M && M.ready && !mod.fallback) {
      TRIP.spots.forEach(function (s) {
        var mk = M.markers[s.id], ok = spotMatches(s);
        if (!mk) return;
        if (ok && !M.map.hasLayer(mk)) mk.addTo(M.map);
        if (!ok && M.map.hasLayer(mk)) M.map.removeLayer(mk);
      });
      buildMapLabels(M);
    }
    if (mod.fallback) drawSchematic('mod');
    setSpotCount(n);
    // Phones: the crew picks, then "Show all".
    clipList('spots', $('#spot-list'), 'spots', 3, function (li) { return li.classList.contains('is-pick'); });
  }
  function setSpotCount(n) {
    var c = $('#spot-count');
    if (c) c.textContent = n === TRIP.spots.length ? 'All ' + n + ' spots' :
      n ? n + ' of ' + TRIP.spots.length + ' spots match' + (mapViewEmpty() ? ' (none of them in this map view)' : '') : 'No spots match these filters. Clear a filter to see more.';
    updateMapHint();
  }
  function markerBaseZ(id) {
    var s = spotById(id);
    return id === selectedSpot ? Z_SEL : s && s.crew_pick ? Z_PICK : 0;
  }
  // from: 'init' (quiet), 'list' (a card), 'show' (a card's "Show on the map"), 'map' (a pin), 'link' (#spot-<id> or
  // "Open in Surf spots"), 'built' (the map has just been built for a spot chosen before it was ready: centre on it
  // without reopening a sheet the reader has closed).
  function selectSpot(id, from) {
    var s = spotById(id);
    if (!s) return;
    selectedSpot = id;
    $$('.spot').forEach(function (li) { li.classList.toggle('is-selected', li.getAttribute('data-spot') === id); });
    var M = maps.mod;
    if (M && M.ready) {
      Object.keys(M.markers).forEach(function (k) {
        var el = M.markers[k].getElement && M.markers[k].getElement();
        if (el) el.classList.toggle('is-selected', k === id);
        if (M.markers[k].setZIndexOffset) M.markers[k].setZIndexOffset(markerBaseZ(k));
      });
    }
    if (from !== 'built') renderSpotDetail(s);
    var sheet = isSheetMode(), moves = from !== 'init';
    var st = $('#spot-status');
    if (st && from !== 'init' && from !== 'built') st.textContent = s.name + (s.crew_pick ? ', crew pick' : '') + '. Details ' + (sheet ? (sheetSide() ? 'in the panel at the side of the screen.' : 'in the panel at the bottom of the screen.') : 'under the map.');
    // The map follows the spot: a South Malé spot switches "Near our base" to "South Malé" (and back).
    if (moves) showSpotView(s);
    if (from === 'map' || from === 'link' || from === 'show') openSheet();
    // Phones: the map box goes just under the top bar, so the part above the sheet is map (a link scrolls in openSpotLink).
    if (sheet && (from === 'map' || from === 'show')) alignSpotMap(true);
    if (mod.fallback) drawSchematic('mod');
    if (!moves) return;
    if (M && M.ready && !mod.fallback) centreOnSpot(M, s, from);
    else if (!mod.fallback) mod.pendingSpot = id;   // the map is still loading: centre on this spot once it is built
  }
  // Is the spot outside the module map's view (north or south)? Then switch the view, without a second animation.
  function showSpotView(s) {
    if (mod.view === 'all' || (mod.view === 'south') === isSouth(s)) return;
    mod.view = isSouth(s) ? 'south' : 'north';
    $$('[data-render="map-views"] [data-view]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-view') === mod.view)); });
    if (mod.M) mod.M.view = mod.view;
    setSpotCount(TRIP.spots.filter(spotMatches).length);
  }
  // Where on the map (container pixels) the chosen spot should sit: the middle of the part of the map that is on
  // screen, under the top bar and clear of the open sheet (bottom) or side panel (landscape). With the sheet open the
  // map box is taken to be where alignSpotMap() puts it, so a scroll still under way does not throw the centre off.
  function spotTarget(M, from) {
    var map = M.map, size = map.getSize(), mid = { x: size.x / 2, y: size.y / 2 };
    var sh = $('#spot-sheet'), el = map.getContainer();
    if (!isSheetMode() || !el || !el.getBoundingClientRect) return mid;
    var open = sh && sh.classList.contains('is-open');
    var r = el.getBoundingClientRect(), vw = W.innerWidth || 0, vh = W.innerHeight || 0;
    if (!vw || !vh || !r.height) return mid;
    var top = r.top;
    if (open && from !== 'list') { var y = spotMapScrollY(); if (y !== null) top = r.top + scrollTopNow() - y; }
    var bar = $('#topbar'), barH = bar ? bar.offsetHeight || 0 : 0;
    var visT = Math.max(top, barH), visB = Math.min(top + r.height, vh), visL = Math.max(r.left, 0), visR = Math.min(r.right, vw);
    if (open) {
      if (sheetSide()) visR = Math.min(visR, vw - (sh.offsetWidth || 0));
      else visB = Math.min(visB, vh - (sh.offsetHeight || 0));
    }
    if (visB - visT < 90 || visR - visL < 90) return mid;
    return {
      x: Math.max(30, Math.min(size.x - 30, (visL + visR) / 2 - r.left)),
      y: Math.max(30, Math.min(size.y - 30, (visT + visB) / 2 - top))
    };
  }
  function centreOnSpot(M, s, from) {
    var map = M.map, size = map.getSize();
    // A hidden map (the sketch took over after the tiles failed) has no size: Leaflet cannot fly there.
    if (mod.fallback || !size.x || !size.y) return;
    try {
      var z = Math.max(map.getZoom(), 12), t = spotTarget(M, from);
      var c = map.unproject(map.project([s.lat, s.lon], z).add([size.x / 2 - t.x, size.y / 2 - t.y]), z);
      if (reduceMotion || from === 'built') map.setView(c, z, { animate: false });
      else map.flyTo(c, z, { duration: 0.9 });
    } catch (e) { reportError(e); }
  }
  function renderSpotDetail(s) {
    var d = $('#spot-detail');
    if (!d) return;
    d.innerHTML = '<div class="detail-head"><h3 id="spot-detail-title">' + esc(s.name) + '</h3>' +
      (s.crew_pick ? '<span class="tag tag-pick">Crew pick</span>' : '') + '</div>' +
      '<p class="detail-sub">' + esc(s.type) + ', ' + esc(spotRegionLabel(s)) + '</p>' + spotPhotoHtml(s) + spotFacts(s);
  }

  /* -------------------------------------------- spot detail: a bottom sheet on phones */
  function isSheetMode() { return !!(W.matchMedia && W.matchMedia('(max-width: 999px)').matches); }
  // Phones held sideways: the details open as a panel on the right (the stylesheet uses the same query).
  function sheetSide() { return isSheetMode() && !!(W.matchMedia && W.matchMedia('(max-height: 500px) and (orientation: landscape)').matches); }
  function scrollTopNow() { return W.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0; }
  // The scroll position that puts the surf map box just under the top bar (null without a map box).
  var MAP_UNDER_BAR = 8;
  function spotMapScrollY() {
    var box = $('#map-box');
    if (!box || !box.getBoundingClientRect) return null;
    var bar = $('#topbar'), barH = bar ? bar.offsetHeight || 0 : 0;
    var y = box.getBoundingClientRect().top + scrollTopNow() - barH - MAP_UNDER_BAR;
    var max = Math.max(0, ((document.documentElement && document.documentElement.scrollHeight) || 0) - (W.innerHeight || 0));
    return Math.round(Math.max(0, max ? Math.min(max, y) : y));
  }
  function alignSpotMap(smooth) {
    var y = spotMapScrollY();
    if (y === null || typeof W.scrollTo !== 'function' || Math.abs(y - scrollTopNow()) < 4) return;
    if (smooth && !reduceMotion) { try { W.scrollTo({ top: y, behavior: 'smooth' }); return; } catch (e) { /* older browsers */ } }
    scrollInstant(function () { W.scrollTo(0, y); });
  }
  // Scroll to the surf map for a spot: on phones the map box under the top bar (the sheet covers the lower part of
  // the screen); on desktop the map and list together.
  function scrollSpotModule(smooth) {
    if (isSheetMode() && $('#map-box')) { alignSpotMap(smooth); return; }
    var target = $('.spots-layout') || $('#spots');
    if (!target) return;
    if (smooth && !reduceMotion) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else scrollInstant(function () { target.scrollIntoView({ block: 'start', behavior: 'auto' }); });
  }
  var sheetReturn = null;
  function openSheet() {
    var sh = $('#spot-sheet');
    if (!sh) return;
    if (!sh.classList.contains('is-open')) sheetReturn = document.activeElement;
    sh.classList.add('is-open');
    document.body.classList.add('sheet-on');
  }
  function closeSheet(returnFocus) {
    var sh = $('#spot-sheet');
    if (!sh || !sh.classList.contains('is-open')) return;
    var had = sh.contains(document.activeElement);
    sh.classList.remove('is-open');
    document.body.classList.remove('sheet-on');
    if (mod.fallback) drawSchematic('mod');   // the sketch uses the whole box again
    if (returnFocus && had) {
      // Back to where the reader was inside the module (a pin or a card); from anywhere else, to the selected card.
      var mod5 = $('#spots');
      var card = selectedSpot && $('#card-' + selectedSpot + ' [data-spot-open]');
      var back = sheetReturn && document.contains(sheetReturn) && !sh.contains(sheetReturn) && mod5 && mod5.contains(sheetReturn) ? sheetReturn : card || $('#spots-title');
      focusTarget(back);
    }
    sheetReturn = null;
  }
  function initSheet() {
    var sh = $('#spot-sheet');
    if (!sh) return;
    sh.addEventListener('click', function (e) { if (e.target.closest('[data-sheet-close]')) closeSheet(true); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !sh.classList.contains('is-open') || !isSheetMode()) return;
      if (e.target && e.target.closest && e.target.closest('dialog')) return;   // Escape in the Sections menu closes only the menu
      closeSheet(true);
    });
    // On phones the sheet covers the lower half of the screen, so tabbing out of it would put focus on controls
    // hidden underneath: leaving the sheet with Tab closes it.
    var tabbing = false;
    sh.addEventListener('keydown', function (e) { tabbing = e.key === 'Tab'; });
    sh.addEventListener('focusout', function (e) {
      var to = e.relatedTarget, wasTab = tabbing;
      tabbing = false;
      if (!wasTab || !isSheetMode() || !sh.classList.contains('is-open')) return;
      if (to && sh.contains(to)) return;
      closeSheet(false);
    });
    // The sheet belongs to the map: once the map has scrolled away, it closes so it never floats over other sections.
    var box = $('#map-box');
    if ('IntersectionObserver' in W && box) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (!en.isIntersecting) closeSheet(false); });
      }, { threshold: 0 }).observe(box);
    }
  }
  // "#spot-<id>" and "Open in Surf spots": show that spot in the module, with its map pin, card and details.
  function openSpotLink(id, o) {
    o = o || {};
    var s = spotById(id);
    if (!s) return false;
    if (!spotMatches(s)) resetSpotFilters(true);
    var li = $('#card-' + id);
    if (li && li.classList.contains('is-clipped') && clips.spots) { clips.spots.open = true; applyClip('spots'); }
    var btn = li && $('[data-spot-open]', li);
    if (btn && btn.getAttribute('aria-expanded') !== 'true') {
      btn.setAttribute('aria-expanded', 'true');
      var body = $('#spot-body-' + id);
      if (body) body.hidden = false;
    }
    startModuleMap();
    scrollSpotModule(false);
    selectSpot(id, 'link');
    if (o.push) { try { if (W.history && history.pushState) history.pushState(null, '', '#spot-' + id); } catch (err) { /* sandboxed */ } }
    if (o.focus) focusTarget($('#spot-detail-title'));
    return true;
  }

  /* ------------------------------------------------------ pins and map glyphs */
  // Pins closer than 46 px (the 44 px tap area plus a hair) are nudged apart, but never by more than 80 px or
  // NUDGE_KM on the ground, so a zoomed-out map shows pins overlapping rather than kilometres out of place.
  var PIN_GAP = 46, PLACE_GAP = 46, MAX_NUDGE = 80, NUDGE_KM = 2.8;
  // Marker stacking, bottom to top: other breaks, the airport, stays, crew picks, the selected spot. Leaflet adds each
  // marker's y position to its offset, so the steps are bigger than any map is tall.
  var Z_AIR = 3000, Z_STAY = 6000, Z_PICK = 9000, Z_SEL = 12000;
  function nudgeCap(pxPerKm) { return Math.max(0, Math.min(MAX_NUDGE, NUDGE_KM * (pxPerKm || 0))); }
  var STAY_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="2.5" width="15" height="15" rx="4" fill="#ffc247" stroke="#fff" stroke-width="1.6"/><path d="M6 10.8 10 7.2l4 3.6v3.6H6z" fill="#0b3a45"/></svg>';
  var PLANE_PATH = 'M5.5 10.8l3.4-.6 2.3-3.6h.9l-1 3.4 2.3.1.9-1.1h.8l-.6 1.9.6 1.9h-.8l-.9-1.1-2.3.1 1 3.4h-.9l-2.3-3.6z';
  var PLANE_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.6" fill="#0b3a45" stroke="#ffc247" stroke-width="1.6"/><path d="' + PLANE_PATH + '" fill="#ffc247"/></svg>';
  var PICK_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="#ef5a47" stroke="#fff" stroke-width="2"/></svg>';
  var CLOSE_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  function pinClass(s) {
    return 'pin' + (s.crew_pick ? ' pin-pick' : '') + (accessKind(s) === 'resort' ? ' pin-resort' : '') + (isAdvanced(s) ? ' pin-adv' : '');
  }
  function spotAria(s) {
    var bt = boatTime(s), base = basePlace().name;
    var boat = bt.kind === 'time' ? bt.text + ' from ' + base : bt.kind === 'unknown' ? 'Boat time from ' + base + ' not confirmed' : bt.text;
    return s.name + (s.crew_pick ? ', crew pick' : '') + ', ' + levelWords(s.level) + ', ' + s.access + ' access. ' + boat + '.';
  }
  // Nothing is booked: a plan lists stay options, and the crew books one of them.
  function stayAria(g) {
    var names = g.options.map(function (o) { return o.name; }).join(', ');
    return 'Stay option' + (g.options.length > 1 ? 's' : '') + ' on the ' + planShort(state.plan) + ' plan (we book one): ' + names + ', on ' + g.place.name + ' (approx. island location)';
  }
  function airportLeg() { return (TRIP.transport.legs || []).filter(function (l) { return /^airport-to/.test(l.id); })[0] || null; }
  function airportBoatText() {
    var leg = airportLeg(), o = leg && (leg.options || []).filter(function (x) { return /\d+\s*-?\s*\d*\s*min/.test(x.duration); })[0];
    return o ? o.duration + ' to ' + basePlace().name : 'boat to ' + basePlace().name;
  }
  var SKETCH_CREDIT = 'Sketch drawn to scale from the approximate pin coordinates in our research (about 2-3 km), not from map images. Pins that would overlap are nudged apart by up to about 3 km. Dotted lines show the boat trips from Thulusdhoo to the crew picks, not exact routes.';
  var ROUTE_NOTE = ' Dotted lines show the boat trips from Thulusdhoo to the crew picks, not exact routes.';
  var CREDIT = {
    Satellite: 'Satellite tiles: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP and the GIS User Community. Map by Leaflet. Pins are approximate (about 2-3 km) and nudged apart by up to about 3 km where they would overlap; zoomed out, close pins overlap.' + ROUTE_NOTE,
    Map: 'Map data: OpenStreetMap contributors (openstreetmap.org/copyright), ODbL. Map by Leaflet. Pins are approximate (about 2-3 km) and nudged apart by up to about 3 km where they would overlap; zoomed out, close pins overlap.' + ROUTE_NOTE
  };
  function setCredit(el, text) { if (el) el.textContent = text; }
  // Map buttons and cards as rectangles inside a map, so labels keep clear of them.
  function relRects(container, els) {
    if (!container || !container.getBoundingClientRect) return [];
    var cr = container.getBoundingClientRect();
    return els.filter(function (el) { return el && !el.hidden && el.offsetWidth; }).map(function (el) {
      var r = el.getBoundingClientRect();
      return [r.left - cr.left - 4, r.top - cr.top - 4, r.right - cr.left + 4, r.bottom - cr.top + 4];
    });
  }
  function watchSize(el, fn) {
    var t;
    var run = function () { clearTimeout(t); t = setTimeout(fn, 120); };
    if ('ResizeObserver' in W) {
      var first = true;
      new W.ResizeObserver(function () { if (first) { first = false; return; } run(); }).observe(el);
    } else W.addEventListener('resize', run);
  }

  /* ------------------------------------------------------------------ Leaflet */
  // Leaflet (CSS + JS, pinned with SRI) is shared by both maps. The overview asks for it at once; the module map
  // is built only when it gets close to the screen.
  var LEAFLET = {
    css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css', cssSri: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
    js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js', jsSri: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
  };
  var leafletWaiters = [], leafletStatus = 'idle';
  function loadLeaflet(cb) {
    if (W.L && W.L.map) { cb(true); return; }
    if (leafletStatus === 'failed') { cb(false); return; }
    leafletWaiters.push(cb);
    if (leafletStatus === 'loading') return;
    leafletStatus = 'loading';
    var pending = 2, ok = true, timer;
    function finish() {
      if (leafletStatus !== 'loading') return;
      clearTimeout(timer);
      leafletStatus = ok && W.L && W.L.map ? 'ready' : 'failed';
      var ws = leafletWaiters; leafletWaiters = [];
      ws.forEach(function (f) { try { f(leafletStatus === 'ready'); } catch (e) { reportError(e); } });
    }
    function part(good) { if (!good) ok = false; pending -= 1; if (pending <= 0 || !good) finish(); }
    var link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = LEAFLET.css; link.integrity = LEAFLET.cssSri; link.crossOrigin = 'anonymous'; link.referrerPolicy = 'no-referrer';
    link.onload = function () { part(true); };
    link.onerror = function () { part(false); };
    // Before our stylesheet, so the site's bigger touch targets win over Leaflet's defaults.
    var ours = $('link[href="assets/styles.css"]');
    document.head.insertBefore(link, ours || null);
    var sc = document.createElement('script');
    sc.src = LEAFLET.js; sc.integrity = LEAFLET.jsSri; sc.crossOrigin = 'anonymous'; sc.referrerPolicy = 'no-referrer'; sc.async = true;
    sc.onload = function () { part(true); };
    sc.onerror = function () { part(false); };
    document.head.appendChild(sc);
    timer = setTimeout(function () { ok = ok && !!(W.L && W.L.map); finish(); }, 20000);
  }
  function isTouchDevice() {
    var L = W.L;
    var coarse = W.matchMedia && W.matchMedia('(pointer: coarse)').matches && !W.matchMedia('(pointer: fine)').matches;
    return !!((L && L.Browser && L.Browser.mobile) || coarse);
  }

  var maps = {};
  // One builder for both maps. cfg: el, view, layers, tooltips, credit, pad(), blocks(), filter(s), onSpot(id),
  // onStay(placeId), onAirport(), selected(), z(id), onTiles(), onTilesFailed().
  function buildMap(key, cfg) {
    var L = W.L;
    var M = maps[key] = { key: key, cfg: cfg, map: null, markers: {}, stays: [], labels: [], pinPts: [], ready: false, routesDrawn: false };
    var SpotMarker = L.Marker.extend({
      _setPos: function (pos) { L.Marker.prototype._setPos.call(this, this._nudge ? pos.add(this._nudge) : pos); }
    });
    // On phones one finger always scrolls the page (dragging is off, so Leaflet leaves touch-action pan-x pan-y).
    // Pinch zooms and moves the map; "Move map" turns one-finger dragging on until it is tapped again.
    var touch = M.touch = isTouchDevice();
    // On a phone the overview has no +/- buttons (pinch and double-tap zoom it), which leaves its top corner for labels.
    var map = M.map = L.map(cfg.el, {
      scrollWheelZoom: false, dragging: !touch, tap: false, attributionControl: false, zoomSnap: 0.25, zoomControl: !(touch && cfg.noTouchZoomButtons),
      minZoom: 8, maxZoom: 17, zoomAnimation: !reduceMotion, fadeAnimation: !reduceMotion, markerZoomAnimation: !reduceMotion
    });
    map.createPane('labels');
    var lp = map.getPane('labels');
    // Labels sit under the pins (marker pane 600) and over the boat routes, so a label never hides a pin.
    lp.style.zIndex = 590; lp.style.pointerEvents = 'none';
    fitView(M, cfg.view, false);

    var esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 17, maxNativeZoom: 17 });
    var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 17, maxNativeZoom: 19 });
    var t = { loaded: 0, errors: 0, switched: false, osmLoaded: 0, osmErrors: 0, failed: false, ok: false };
    // The overview keeps the sketch's credit line until its map is actually showing (cfg.creditLater).
    var credit = function (text) { M.creditText = text; if (!cfg.creditLater || !cfg.creditLater()) setCredit(cfg.credit, text); };
    var tilesOk = function () { if (t.ok) return; t.ok = true; if (cfg.onTiles) cfg.onTiles(); };
    esri.on('tileload', function () { t.loaded++; if (t.loaded >= 3) tilesOk(); });
    esri.on('load', function () { if (t.loaded) tilesOk(); });
    esri.on('tileerror', function () {
      t.errors++;
      if (!t.switched && t.loaded === 0 && t.errors >= 6) {
        t.switched = true;
        map.removeLayer(esri); osm.addTo(map);
        credit(CREDIT.Map + ' Satellite tiles did not load, so this shows the street map.');
      }
    });
    osm.on('tileload', function () { t.osmLoaded++; if (t.osmLoaded >= 3) tilesOk(); });
    osm.on('load', function () { if (t.osmLoaded) tilesOk(); });
    osm.on('tileerror', function () {
      t.osmErrors++;
      if (!t.failed && t.switched && t.osmLoaded === 0 && t.osmErrors >= 6) {
        t.failed = true;
        if (cfg.onTilesFailed) cfg.onTilesFailed();
      }
    });
    esri.addTo(map);
    credit(CREDIT.Satellite);
    if (cfg.layers) {
      L.control.layers({ Satellite: esri, Map: osm }, null, { position: 'topright' }).addTo(map);
      map.on('baselayerchange', function (e) { if (!t.failed) credit(CREDIT[e.name] || ''); });
    }

    var air = airportPlace();
    if (air) {
      M.airportLL = L.latLng(air.lat, air.lon);
      M.airport = L.marker(M.airportLL, {
        icon: L.divIcon({ className: 'place-marker', html: '<span class="place-ic place-ic--air">' + PLANE_SVG + '</span>', iconSize: [44, 44], iconAnchor: [22, 22] }),
        interactive: !!cfg.onAirport, keyboard: !!cfg.onAirport, zIndexOffset: Z_AIR
      });
      M.airport.on('add', function () {
        var me = M.airport.getElement();
        if (!me) return;
        me.setAttribute('aria-label', air.name + '. ' + airportBoatText() + '.');
        if (cfg.onAirport) me.setAttribute('role', 'button');
        else me.setAttribute('aria-hidden', 'true');
      });
      if (cfg.onAirport) {
        M.airport._tap = function () { cfg.onAirport(); };
        M.airport.on('click', function (e) { tapNearest(M, e, M.airport); });
      }
      M.airport.addTo(map);
    }
    TRIP.spots.forEach(function (s) {
      var icon = L.divIcon({ className: 'spot-marker', html: '<span class="' + pinClass(s) + '"><span class="pin-dot"></span></span>', iconSize: [44, 44], iconAnchor: [22, 22] });
      var mk = new SpotMarker([s.lat, s.lon], { icon: icon, keyboard: true, riseOnHover: true, zIndexOffset: s.crew_pick ? Z_PICK : 0 });
      mk._tap = function () { cfg.onSpot(s.id); };
      mk.on('click', function (e) { tapNearest(M, e, mk); });
      // Leaflet rebuilds the icon element each time a marker is re-added (filters), so label it on every add.
      mk.on('add', function () {
        var me = mk.getElement();
        if (!me) return;
        me.setAttribute('aria-label', spotAria(s));
        me.setAttribute('role', 'button');
        me.setAttribute('data-spot-marker', s.id);
        me.classList.toggle('is-selected', !!cfg.selected && cfg.selected() === s.id);
        if (mk.setZIndexOffset) mk.setZIndexOffset(cfg.z ? cfg.z(s.id) : (s.crew_pick ? Z_PICK : 0));
      });
      if (cfg.tooltips && !s.crew_pick) mk.bindTooltip(s.name, { direction: 'top', offset: [0, -18], className: 'spot-label' });
      if (!cfg.filter || cfg.filter(s)) mk.addTo(map);
      M.markers[s.id] = mk;
    });
    M.stayLayer = L.layerGroup().addTo(map);
    M.routeLayer = L.layerGroup().addTo(map);
    M.labelLayer = L.layerGroup().addTo(map);
    M.ready = true;
    setMapStays(M);
    map.on('zoomend viewreset', function () { layoutMap(M); });
    map.on('moveend', function () { placeMapLabels(M); syncMarkerFocus(M); });
    // Label widths change once the web font arrives.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layoutMap(M); }, function () { /* ignore */ });
    watchSize(cfg.el, function () { try { map.invalidateSize(); layoutMap(M); } catch (e) { /* ignore */ } });
    return M;
  }
  // Where two pins sit closer than their 44 px tap areas (a stay next to a crew pick on a short landscape map), a tap
  // goes to the pin whose centre is nearest the finger, not simply to the one drawn on top. Keyboard Enter has no
  // position and stays with the focused pin.
  function tapNearest(M, e, own) {
    var oe = e && e.originalEvent, x = oe && oe.clientX, y = oe && oe.clientY, best = own, bd = Infinity;
    if (typeof x === 'number' && typeof y === 'number' && (x || y)) {
      var all = Object.keys(M.markers).map(function (k) { return M.markers[k]; })
        .concat(M.stayLayer ? M.stayLayer.getLayers() : [], M.airport ? [M.airport] : []);
      all.forEach(function (mk) {
        var el = mk._tap && M.map.hasLayer(mk) && mk.getElement && mk.getElement();
        if (!el) return;
        var r = el.getBoundingClientRect();
        if (!r.width || x < r.left || x > r.right || y < r.top || y > r.bottom) return;
        var dx = x - (r.left + r.right) / 2, dy = y - (r.top + r.bottom) / 2, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = mk; }
      });
    }
    if (best && best._tap) best._tap();
  }
  function fitView(M, view, animate) {
    var L = W.L, pad = M.cfg.pad();
    M.view = view;
    var b = L.latLngBounds(viewPoints(view).map(function (p) { return [p.lat, p.lon]; }));
    M.map.fitBounds(b, { paddingTopLeft: pad.tl, paddingBottomRight: pad.br, animate: !!animate && !reduceMotion });
  }
  // The stay pins follow the plan: Budget's options are on Thulusdhoo and Himmafushi, Mid's on Thulusdhoo.
  function setMapStays(M) {
    if (!M || !M.ready) return;
    var L = W.L;
    M.stayLayer.clearLayers();
    M.stays = staysForPlan(state.plan);
    M.stays.forEach(function (g) {
      var mk = L.marker([g.place.lat, g.place.lon], {
        icon: L.divIcon({ className: 'place-marker', html: '<span class="place-ic place-ic--stay">' + STAY_SVG + '</span>', iconSize: [44, 44], iconAnchor: [22, 22] }),
        interactive: !!M.cfg.onStay, keyboard: !!M.cfg.onStay, zIndexOffset: Z_STAY
      });
      mk.on('add', function () {
        var me = mk.getElement();
        if (!me) return;
        me.setAttribute('aria-label', stayAria(g));
        me.setAttribute('data-stay-marker', g.place.id);
        me.setAttribute('role', M.cfg.onStay ? 'button' : 'img');
      });
      if (M.cfg.onStay) {
        mk._tap = function () { M.cfg.onStay(g.place.id); };
        mk.on('click', function (e) { tapNearest(M, e, mk); });
      }
      mk.addTo(M.stayLayer);
    });
    buildMapLabels(M);
  }
  function layoutMap(M) {
    if (!M || !M.ready) return;
    // Each step on its own, so a failure in one (say, the route dots) still leaves pins and labels right.
    [declutterMap, drawMapRoutes, placeMapLabels, syncMarkerFocus].forEach(function (step) { try { step(M); } catch (e) { reportError(e); } });
  }
  function fixedPoints(M) {
    var map = M.map, pts = M.stays.map(function (g) {
      var p = map.latLngToContainerPoint([g.place.lat, g.place.lon]);
      return { id: 'stay-' + g.place.id, x: p.x, y: p.y };
    });
    if (M.airportLL) { var a = map.latLngToContainerPoint(M.airportLL); pts.push({ id: 'airport', x: a.x, y: a.y }); }
    return pts;
  }
  function declutterMap(M) {
    var L = W.L, map = M.map;
    var pts = Object.keys(M.markers).filter(function (k) { return map.hasLayer(M.markers[k]); }).map(function (k) {
      var p = map.latLngToContainerPoint(M.markers[k].getLatLng());
      return { k: k, x0: p.x, y0: p.y };
    });
    var c = map.getCenter(), c0 = map.latLngToContainerPoint(c), c1 = map.latLngToContainerPoint([c.lat + 1 / KM_LAT, c.lng]);
    spreadPoints(pts, fixedPoints(M), PIN_GAP, PLACE_GAP, nudgeCap(Math.abs(c1.y - c0.y)));
    pts.forEach(function (p) {
      var mk = M.markers[p.k];
      mk._nudge = L.point(Math.round(p.x - p.x0), Math.round(p.y - p.y0));
      var tt = mk.getTooltip && mk.getTooltip();
      if (tt) { tt.options.offset = L.point(mk._nudge.x, mk._nudge.y - 18); if (mk.isTooltipOpen && mk.isTooltipOpen()) tt.update(); }
      mk.update();
    });
    M.pinPts = pts;
  }
  // Dotted boat trips from the base island to each crew-pick break. Dots fade in one after another, then shimmer
  // while the map is on screen. Curved for legibility, not real tracks (the credit line says so).
  function drawMapRoutes(M) {
    var L = W.L, map = M.map;
    M.routeLayer.clearLayers();
    var base = basePlace(), b = map.latLngToContainerPoint([base.lat, base.lon]);
    TRIP.spots.filter(function (s) { return s.crew_pick && M.markers[s.id] && map.hasLayer(M.markers[s.id]); }).forEach(function (s, k) {
      var mk = M.markers[s.id];
      var e = map.latLngToContainerPoint(mk.getLatLng());
      if (mk._nudge) e = e.add(mk._nudge);
      var dx = e.x - b.x, dy = e.y - b.y, len = Math.sqrt(dx * dx + dy * dy);
      if (len < 40) return;
      var bend = (k % 2 ? -1 : 1) * Math.min(56, len * 0.18);
      var cx = (b.x + e.x) / 2 - dy / len * bend, cy = (b.y + e.y) / 2 + dx / len * bend;
      var n = Math.max(5, Math.min(26, Math.round(len / 15)));
      for (var i = 2; i < n - 1; i++) {
        var tt = i / n, u = 1 - tt;
        var x = u * u * b.x + 2 * u * tt * cx + tt * tt * e.x, y = u * u * b.y + 2 * u * tt * cy + tt * tt * e.y;
        var dot = L.circleMarker(map.containerPointToLatLng(L.point(x, y)), {
          radius: 3, color: '#04161a', weight: 1, fillColor: '#ffc247', fillOpacity: 1, interactive: false,
          className: 'route-dot' + (M.routesDrawn ? ' is-flow' : '')
        }).addTo(M.routeLayer);
        var el = dot.getElement && dot.getElement();
        if (el) { el.style.setProperty('--d', (k * 320 + i * 60) + 'ms'); el.style.setProperty('--d2', (i * 120) + 'ms'); }
      }
    });
    if (!M.routesDrawn) {
      M.routesDrawn = true;
      setTimeout(function () { $$('.route-dot', map.getContainer()).forEach(function (d) { d.classList.add('is-flow'); }); }, 2800);
    }
  }

  /* ---------------------------------------------------------- map labels */
  // Stays (property names + "approx. island location"), the airport (+ the boat time to the base) and the crew picks
  // (+ their boat time from the base, always on the map). Placed by placeLabels() so they avoid each other, the pins
  // and the map buttons. narrow: a map under 420 px wide drops the island-name line from stay labels (the card and
  // the list below name it). Each line is [text, class, mode]: mode 'f' shows only in the full label, 'c' only in
  // the compact one, none in both.
  // Full: "Sultans" / "about 20 min by boat". Compact, for a crowded map: "Sultans · 20 min" on one line, or
  // "Jailbreaks" / "time not confirmed" when the data has no minutes.
  function pickLabelLines(s) {
    var bt = boatTime(s), name = spotShort(s);
    var full = [[name, 'lbl-b', 'f'], [bt.kind === 'unknown' ? 'boat time not confirmed' : bt.short, 'lbl-s', 'f']];
    var mins = /(\d+(?:-\d+)?) min/.exec(bt.short);
    var compact = bt.kind === 'time' && mins ? [[name + ' \u00b7 ' + mins[1] + ' min', 'lbl-b', 'c']] :
      [[name, 'lbl-b', 'c'], [bt.kind === 'unknown' ? 'time not confirmed' : bt.short, 'lbl-s', 'c']];
    return full.concat(compact);
  }
  function mapLabelSpecs(stays, spots, hasAirport, narrow) {
    var out = [];
    stays.forEach(function (g) {
      out.push({ id: 'stay-' + g.place.id, kind: 'stay', lat: g.place.lat, lon: g.place.lon, prio: 3, g: 20, must: true, key: true,
        lines: (narrow ? [] : [[g.place.name, 'lbl-k']]).concat(g.options.map(function (o) { return [o.name, 'lbl-b']; })).concat([['approx. island location', 'lbl-s']]) });
    });
    spots.forEach(function (s) {
      if (!s.crew_pick) return;
      out.push({ id: s.id, kind: 'pick', spot: s, lat: s.lat, lon: s.lon, prio: 2.8, g: 18, must: true, key: true,
        lines: pickLabelLines(s) });
    });
    var air = airportPlace();
    if (air && hasAirport) out.push({ id: 'airport', kind: 'air', lat: air.lat, lon: air.lon, prio: 2.5, g: 18, key: true, lines: [[air.name, 'lbl-b'], [airportBoatText(), 'lbl-s', 'f']] });
    return out;
  }
  function labelLines(lines, compact) {
    return lines.filter(function (l) { return compact ? l[2] !== 'f' : l[2] !== 'c'; });
  }
  function hasCompact(lines) { return lines.some(function (l) { return l[2] === 'f' || l[2] === 'c'; }); }
  function estimateLabel(lines, compact) {
    var ls = labelLines(lines, compact), w = 0;
    ls.forEach(function (l) { w = Math.max(w, String(l[0]).length * (l[1] === 'lbl-s' ? 7.3 : 8.2)); });
    return { w: Math.ceil(w + 18), h: ls.length * 18 + 10 };
  }
  // Only the lines of the form in use are in the label (full or compact), so its text is exactly what shows.
  function labelLinesHtml(sp, compact) {
    return labelLines(sp.lines, compact).map(function (l) { return '<span class="' + l[1] + '">' + esc(l[0]) + '</span>'; }).join('');
  }
  function labelHtml(sp) {
    return '<span class="map-lbl map-lbl--' + sp.kind + '" aria-hidden="true">' + labelLinesHtml(sp, false) + '</span><span class="map-lead" aria-hidden="true"></span>';
  }
  function showLabelForm(sp, compact) {
    if (!sp.el || sp.form === compact) return;
    sp.el.innerHTML = labelLinesHtml(sp, compact);
    sp.form = compact;
  }
  function buildMapLabels(M) {
    if (!M || !M.ready) return;
    var L = W.L, map = M.map;
    M.labelLayer.clearLayers();
    var shown = TRIP.spots.filter(function (s) { return M.markers[s.id] && map.hasLayer(M.markers[s.id]); });
    M.labels = mapLabelSpecs(M.stays, shown, !!M.airportLL, map.getSize().x < 420).map(function (sp) {
      sp.marker = L.marker([sp.lat, sp.lon], {
        pane: 'labels', interactive: false, keyboard: false,
        icon: L.divIcon({ className: 'lbl-anchor', html: labelHtml(sp), iconSize: [0, 0], iconAnchor: [0, 0] })
      }).addTo(M.labelLayer);
      return sp;
    });
    layoutMap(M);
  }
  function measureLabel(sp) {
    var el = sp.marker && sp.marker.getElement && sp.marker.getElement();
    var inner = el && el.firstChild;
    if (inner !== sp.el) { sp.el = inner; sp.form = false; }
    sp.lead = inner && inner.nextSibling;
    var est = estimateLabel(sp.lines, false), c = estimateLabel(sp.lines, true);
    sp.w = est.w; sp.h = est.h; sp.cw = hasCompact(sp.lines) ? c.w : 0; sp.ch = c.h;
    if (!inner) return;
    var was = sp.form;
    showLabelForm(sp, false);
    if (!inner.offsetWidth) { showLabelForm(sp, !!was); return; }
    sp.w = inner.offsetWidth; sp.h = inner.offsetHeight;
    if (sp.cw) {
      showLabelForm(sp, true);
      sp.cw = inner.offsetWidth; sp.ch = inner.offsetHeight;
    }
    showLabelForm(sp, !!was);
  }
  // Pins as obstacles for the labels: crew picks, stays and the airport count as key pins (never to be covered).
  function labelObstacles(pinPts, fixed) {
    return pinPts.map(function (p) { var s = spotById(p.k); return { id: p.k, x: p.x, y: p.y, r: 14, key: !!(s && s.crew_pick) }; })
      .concat(fixed.map(function (p) { return { id: p.id, x: p.x, y: p.y, r: 17, key: true }; }));
  }
  function placeMapLabels(M) {
    if (!M || !M.ready || !M.labels) return;
    var map = M.map, size = map.getSize();
    var pins = labelObstacles(M.pinPts || [], fixedPoints(M));
    var blocks = M.cfg.blocks ? M.cfg.blocks() : [];
    var specs = M.labels.map(function (sp) {
      measureLabel(sp);
      var p = map.latLngToContainerPoint([sp.lat, sp.lon]);
      var nudge = sp.spot && M.markers[sp.id] && M.markers[sp.id]._nudge;
      if (nudge) p = p.add(nudge);
      sp.px = p;
      return { id: sp.id, x: p.x, y: p.y, g: sp.g, w: sp.w, h: sp.h, cw: sp.cw, ch: sp.ch, prio: sp.prio, must: sp.must, pinR: sp.kind === 'pick' ? 12 : 15 };
    });
    var res = placeLabels(specs, pins, blocks, size.x, size.y);
    M.labels.forEach(function (sp) {
      var r = res[sp.id], el = sp.el, lead = sp.lead;
      if (!el) return;
      if (!r) { el.classList.add('is-off'); if (lead) lead.style.display = 'none'; return; }
      el.classList.remove('is-off');
      showLabelForm(sp, !!r.compact);
      var anchor = map.latLngToContainerPoint([sp.lat, sp.lon]);
      el.style.transform = 'translate(' + Math.round(r.r[0] - anchor.x) + 'px,' + Math.round(r.r[1] - anchor.y) + 'px)';
      if (!lead) return;
      if (!r.lead) { lead.style.display = 'none'; return; }
      var dx = r.lead.x2 - r.lead.x1, dy = r.lead.y2 - r.lead.y1;
      lead.style.display = 'block';
      lead.style.width = Math.round(Math.sqrt(dx * dx + dy * dy)) + 'px';
      lead.style.transform = 'translate(' + Math.round(r.lead.x1 - anchor.x) + 'px,' + Math.round(r.lead.y1 - anchor.y) + 'px) rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1) + 'deg)';
    });
  }
  // Off-screen pins (South Malé while the map shows North Malé) leave the tab order, so keyboard users are not
  // walked through markers they cannot see before reaching the page.
  function syncMarkerFocus(M) {
    if (!M || !M.ready) return;
    var map = M.map, size = map.getSize();
    Object.keys(M.markers).forEach(function (k) {
      var mk = M.markers[k], el = mk.getElement && mk.getElement();
      if (!el || !map.hasLayer(mk)) return;
      var p = map.latLngToContainerPoint(mk.getLatLng());
      if (mk._nudge) p = p.add(mk._nudge);
      el.tabIndex = p.x >= 0 && p.y >= 0 && p.x <= size.x && p.y <= size.y ? 0 : -1;
    });
  }

  /* ============================================================ map overview */
  var ov = { view: 'north', leaflet: false, M: null, card: null };
  function initOverview() {
    var box = $('#ov-box');
    if (!box) return;
    setCredit($('#ov-credit'), SKETCH_CREDIT);
    renderOverviewLists();
    var sk = $('#ov-schematic');
    if (sk) bindSchematic(sk, 'ov');
    drawSchematic('ov');
    var south = $('#ov-south');
    if (south) {
      var sn = TRIP.spots.filter(isSouth).length;
      if (!sn) south.hidden = true;
      south.addEventListener('click', function () { setOvView(ov.view === 'north' ? 'all' : 'north'); });
    }
    var card = $('#ov-card');
    if (card) {
      card.setAttribute('aria-live', 'polite');
      card.addEventListener('click', function (e) { if (e.target.closest('[data-ov-close]')) closeOvCard(true); });
      // Escape closes the card only when it is the top-most thing: not while the Sections menu or the spot sheet
      // has the keyboard, and not when focus is somewhere else on the page.
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || card.hidden || e.defaultPrevented) return;
        var t = e.target, ae = document.activeElement;
        if (t && t.closest && t.closest('dialog, #spot-sheet')) return;
        if (document.querySelector('dialog[open]')) return;
        if (ae && ae !== document.body && ae !== document.documentElement && !box.contains(ae)) return;
        closeOvCard(true);
      });
    }
    watchSize(box, function () {
      if (!ov.leaflet) drawSchematic('ov');
    });
    if ('IntersectionObserver' in W) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          box.classList.toggle('map-live', en.isIntersecting);
          if (!en.isIntersecting) setOvDrag(false);
        });
      }, { threshold: 0.05 }).observe(box);
    } else box.classList.add('map-live');
    loadLeaflet(function (ok) {
      if (!ok) { ovNote('The satellite map could not load on this connection, so this is a to-scale sketch drawn from the pin coordinates. Everything on it is tappable.'); return; }
      try { buildOverviewMap(); } catch (e) {
        reportError(e);
        ovNote('The map could not start in this browser, so this is a to-scale sketch drawn from the pin coordinates.');
      }
    });
  }
  function ovNote(msg) {
    var n = $('#ov-note');
    if (!n) return;
    n.textContent = msg;
    n.hidden = !msg;
  }
  function buildOverviewMap() {
    var box = $('#ov-box'), el = $('#ov-map');
    // Until its tiles arrive the map sits under the sketch; keep it out of the tab order meanwhile.
    el.setAttribute('inert', '');
    ov.M = buildMap('ov', {
      el: el, view: ov.view, layers: false, tooltips: false, noTouchZoomButtons: true, credit: $('#ov-credit'), creditLater: function () { return !ov.leaflet; },
      // Room for the buttons and labels, capped by the box size so a short landscape box keeps a close-in scale.
      pad: function () {
        var w = box.clientWidth || 360, h = box.clientHeight || 480, wide = w >= 600;
        var x = Math.min(wide ? 90 : 30, Math.round(w * 0.12));
        return { tl: [x, Math.min(wide ? 70 : 110, Math.round(h * (wide ? 0.14 : 0.21)))], br: [x, Math.min(wide ? 80 : 76, Math.round(h * 0.15))] };
      },
      blocks: function () { return relRects(el, [$('.leaflet-control-zoom', box), $('#ov-move'), $('#ov-south'), $('#ov-card')]); },
      onSpot: function (id) { ovSelect('spot', id); },
      onStay: function (pid) { ovSelect('stay', pid); },
      onAirport: function () { ovSelect('airport'); },
      selected: function () { return ov.card && ov.card.type === 'spot' ? ov.card.id : null; },
      onTiles: showOvLeaflet,
      onTilesFailed: hideOvLeaflet
    });
    ov.M.map.on('click', function () { closeOvCard(false); });
    var mv = $('#ov-move');
    if (mv && ov.M.touch) mv.addEventListener('click', function () { setOvDrag(!mv.classList.contains('is-on')); });
  }
  // The sketch stays on top until the first map tiles are in, then the satellite map fades in under the same pins.
  function showOvLeaflet() {
    // Once the tiles have failed the overview stays on the sketch, even if a few tiles arrive late.
    if (ov.leaflet || !ov.M || ov.tilesFailed || $('#ov-map').hidden) return;
    ov.leaflet = true;
    var box = $('#ov-box'), sk = $('#ov-schematic'), mv = $('#ov-move');
    box.classList.add('is-leaflet');
    $('#ov-map').removeAttribute('inert');
    ovNote('');
    setCredit($('#ov-credit'), ov.M.creditText || CREDIT.Satellite);
    if (mv && ov.M.touch) mv.hidden = false;
    var card = $('#ov-card');
    if (card) { card.classList.remove('is-top'); card.style.maxHeight = ''; }
    setTimeout(function () { if (ov.leaflet && sk) sk.hidden = true; }, reduceMotion ? 0 : 650);
    try { ov.M.map.invalidateSize(); fitView(ov.M, ov.view, false); layoutMap(ov.M); markOvSelected(); } catch (e) { reportError(e); }
  }
  function hideOvLeaflet() {
    ov.leaflet = false;
    ov.tilesFailed = true;
    var box = $('#ov-box'), sk = $('#ov-schematic'), el = $('#ov-map'), mv = $('#ov-move');
    setOvDrag(false);
    box.classList.remove('is-leaflet');
    if (el) el.hidden = true;
    if (mv) mv.hidden = true;
    if (sk) sk.hidden = false;
    setCredit($('#ov-credit'), SKETCH_CREDIT);
    ovNote('Map images could not load on this connection, so this is a to-scale sketch drawn from the pin coordinates. Everything on it is tappable.');
    drawSchematic('ov');
  }
  function setOvDrag(on) {
    var M = ov.M, mv = $('#ov-move');
    if (!M || !M.touch || !mv) return;
    if (on) M.map.dragging.enable(); else M.map.dragging.disable();
    // The words say the state ("Move map" / "Done moving"), so the button has no pressed state as well.
    mv.classList.toggle('is-on', on);
    mv.textContent = on ? 'Done moving' : 'Move map';
    $('#ov-box').classList.toggle('map-dragging', on);
  }
  function setOvView(v) {
    ov.view = v;
    var b = $('#ov-south');
    if (b) {
      b.classList.toggle('is-on', v === 'all');
      b.textContent = v === 'all' ? 'Back to North Malé' : 'Show South Malé too';
    }
    if (ov.leaflet && ov.M) fitView(ov.M, v, true);
    else drawSchematic('ov');
  }
  function ovCardTop(kickerHtml) {
    return '<div class="ov-card-top"><p class="ov-card-kicker">' + kickerHtml + '</p>' +
      '<button type="button" class="icon-btn ov-card-x" data-ov-close aria-label="Close this card">' + CLOSE_SVG + '</button></div>';
  }
  function ovCardSpot(s) {
    var bt = boatTime(s);
    var kick = s.crew_pick ? '<span class="tag tag-pick">Crew pick</span>' : '<span class="tag">' + esc(accessKind(s) === 'resort' ? 'Resort guests only' : 'Surf break') + '</span>';
    var km = (bt.kind === 'time' || bt.kind === 'unknown') ? ', about ' + bt.km + ' km ' + (bt.kmFrom === 'pins' ? 'between the map pins' : 'in a straight line') : '';
    return ovCardTop(kick) + '<p class="ov-card-name">' + esc(s.name) + '</p>' +
      '<p class="ov-card-meta">' + esc(s.type) + ', ' + esc(levelWords(s.level)) + '. Access: ' + esc(s.access) + '.</p>' +
      '<p class="ov-card-boat"><strong>From ' + esc(basePlace().name) + ':</strong> ' + esc(bt.text) + esc(km) + '.</p>' +
      '<a class="btn btn-solid ov-card-go" href="#spot-' + esc(s.id) + '">Open in Surf spots</a>';
  }
  function ovCardStay(g) {
    var base = basePlace();
    return ovCardTop('Stay option' + (g.options.length > 1 ? 's' : '') + ' on the ' + esc(planShort(state.plan)) + ' plan (we book one)') +
      '<p class="ov-card-name">' + esc(g.place.name) + '</p><p class="ov-card-meta">The pin is the approx. island location, not the guesthouse address.' +
      (g.place.id !== base.id ? ' The boat times on this map are from ' + esc(base.name) + ', not from ' + esc(g.place.name) + '.' : '') + '</p>' +
      '<ul class="ov-card-list">' + g.options.map(function (o) {
        return '<li><span class="ov-card-li-name">' + esc(o.name) + '</span> <span class="ov-card-li-price">' + esc(hkd(o.pp_hkd.low, o.pp_hkd.high)) + ' each, ' + tripNights() + ' nights</span> ' + chip(o.status) + '</li>';
      }).join('') + '</ul>' +
      '<a class="btn btn-solid ov-card-go" href="#stay">Open in Accommodation</a>';
  }
  function ovCardAirport() {
    var air = airportPlace(), leg = airportLeg();
    return ovCardTop('Where we land') + '<p class="ov-card-name">' + esc(air ? air.name : 'Malé airport') + '</p>' +
      (leg ? '<p class="ov-card-meta">' + esc(leg.title) + ':</p><ul class="ov-card-list">' + leg.options.map(function (o) {
        return '<li><span class="ov-card-li-name">' + esc(o.mode) + '</span> <span class="ov-card-li-price">' + esc(o.duration) + ', ' +
          (o.cost_hkd.high === 0 ? 'HKD 0' : esc(hkd(o.cost_hkd.low, o.cost_hkd.high))) + ' ' + esc(PER[o.per] || o.per) + '</span> ' + chip(o.status) + '</li>';
      }).join('') + '</ul>' : '') +
      '<a class="btn btn-solid ov-card-go" href="#transport">Open in Local transport</a>';
  }
  function ovSelect(type, id) {
    var card = $('#ov-card');
    if (!card) return;
    var html = '', ll = null;
    if (type === 'spot') { var s = spotById(id); if (!s) return; html = ovCardSpot(s); ll = [s.lat, s.lon]; }
    else if (type === 'stay') {
      var g = staysForPlan(state.plan).filter(function (x) { return x.place.id === id; })[0];
      if (!g) return;
      html = ovCardStay(g); ll = [g.place.lat, g.place.lon];
    } else if (type === 'airport') { var a = airportPlace(); html = ovCardAirport(); ll = a ? [a.lat, a.lon] : null; }
    ov.card = { type: type, id: id || null };
    card.innerHTML = html;
    card.hidden = false;
    var south = $('#ov-south');
    if (south) south.hidden = true;
    markOvSelected();
    if (ov.leaflet && ov.M) {
      // Keep the chosen pin in view above the card.
      try {
        var map = ov.M.map, p = map.latLngToContainerPoint(ll), size = map.getSize();
        var mk = type === 'spot' && ov.M.markers[id];
        if (mk && mk._nudge) p = p.add(mk._nudge);
        var limit = size.y - card.offsetHeight - 36, dy = 0;
        if (p.y > limit) dy = p.y - limit;
        else if (p.y < 40) dy = p.y - 40;
        if (dy) map.panBy([0, dy], { animate: !reduceMotion });
        else placeMapLabels(ov.M);
      } catch (e) { reportError(e); }
    } else {
      placeSketchCard(type === 'spot' ? id : type === 'stay' ? 'stay-' + id : 'airport');
      drawSchematic('ov');
    }
  }
  // The sketch cannot pan, so the card goes to the other half of the box from its pin and stops short of it.
  function placeSketchCard(pinId) {
    var card = $('#ov-card'), box = $('#ov-box');
    if (!card || !box) return;
    card.classList.remove('is-top');
    card.style.maxHeight = '';
    var pt = skPts.ov && skPts.ov[pinId], H = box.clientHeight;
    if (!pt || !H) return;
    var top = pt.y > H / 2;
    card.classList.toggle('is-top', top);
    card.style.maxHeight = Math.max(150, Math.round((top ? pt.y : H - pt.y) - 40)) + 'px';
  }
  function closeOvCard(focusBack) {
    var card = $('#ov-card');
    if (!card || card.hidden) return;
    var had = card.contains(document.activeElement);
    card.hidden = true;
    card.innerHTML = '';
    card.classList.remove('is-top');
    card.style.maxHeight = '';
    ov.card = null;
    var south = $('#ov-south');
    if (south && TRIP.spots.filter(isSouth).length) south.hidden = false;
    markOvSelected();
    if (ov.leaflet && ov.M) placeMapLabels(ov.M); else drawSchematic('ov');
    if (focusBack && had) focusTarget($('#ov-box'));
  }
  function markOvSelected() {
    var M = ov.M, sel = ov.card && ov.card.type === 'spot' ? ov.card.id : null;
    if (!M || !M.ready) return;
    Object.keys(M.markers).forEach(function (k) {
      var el = M.markers[k].getElement && M.markers[k].getElement();
      if (el) el.classList.toggle('is-selected', k === sel);
      if (M.markers[k].setZIndexOffset) M.markers[k].setZIndexOffset(k === sel ? Z_SEL : spotById(k).crew_pick ? Z_PICK : 0);
    });
  }
  // Under the map: where we could stay (for the plan on screen; we book one) and where we surf, each linking into its section.
  function renderOverviewLists() {
    var el = $('[data-render="ov-lists"]');
    if (!el) return;
    var stays = staysForPlan(state.plan), nights = tripNights(), base = basePlace();
    var picks = TRIP.spots.filter(function (s) { return s.crew_pick; });
    var southN = TRIP.spots.filter(isSouth).length;
    el.innerHTML = '<div class="ov-list"><p class="ov-list-h">Where we could stay on the ' + esc(planShort(state.plan)) + ' plan (we book one)</p><ul class="ov-rows">' +
      stays.map(function (g) {
        return g.options.map(function (o) {
          return '<li><a class="ov-row" href="#stay"><span class="ov-row-ic" aria-hidden="true">' + STAY_SVG + '</span>' +
            '<span class="ov-row-main"><span class="ov-row-name">' + esc(o.name) + '</span><span class="ov-row-sub">' + esc(g.place.name) + ' (approx. island location)</span></span>' +
            '<span class="ov-row-side"><span class="ov-row-price">' + esc(hkd(o.pp_hkd.low, o.pp_hkd.high)) + ' each, ' + nights + ' nights</span>' + chip(o.status) + '</span></a></li>';
        }).join('');
      }).join('') + '</ul></div>' +
      '<div class="ov-list"><p class="ov-list-h">Where we surf: the crew picks</p><ul class="ov-rows">' + picks.map(function (s) {
        return '<li><a class="ov-row" href="#spot-' + esc(s.id) + '"><span class="ov-row-ic" aria-hidden="true">' + PICK_SVG + '</span>' +
          '<span class="ov-row-main"><span class="ov-row-name">' + esc(s.name) + '</span><span class="ov-row-sub">From ' + esc(base.name) + ': ' + esc(boatTime(s).short) + '</span></span>' +
          '<span class="ov-row-side"><span class="ov-row-lvl">' + esc(levelWords(s.level)) + '</span></span></a></li>';
      }).join('') + '</ul>' +
      '<p class="ov-more"><a class="more" href="#spots">All ' + TRIP.spots.length + ' breaks in 5 Surf spots</a>' +
      (southN ? '<span class="fine">' + southN + ' of them are in South Malé, an optional day trip by boat.</span>' : '') + '</p></div>';
  }

  /* ========================================================= the module map */
  var mod = { view: 'north', started: false, fallback: false, M: null, pendingSpot: null };
  function renderMapViews() {
    var root = renderInto('map-views', '<div class="seg-inline" role="group" aria-label="Map view">' +
      '<button type="button" class="toggle" data-view="north" aria-pressed="true">Near our base</button>' +
      '<button type="button" class="toggle" data-view="all" aria-pressed="false">All ' + TRIP.spots.length + ' spots</button>' +
      '<button type="button" class="toggle" data-view="south" aria-pressed="false">South Malé</button></div>');
    if (root) root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-view]');
      if (b) setModView(b.getAttribute('data-view'));
    });
    var hint = $('#map-hint');
    if (hint) hint.addEventListener('click', function (e) {
      if (e.target.closest('[data-view-go]')) setModView('all');
    });
  }
  function setModView(v) {
    mod.view = v;
    $$('[data-render="map-views"] [data-view]').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-view') === v)); });
    if (mod.M && mod.M.ready && !mod.fallback) fitView(mod.M, mod.view, true);
    else if (mod.fallback) drawSchematic('mod');
    setSpotCount(TRIP.spots.filter(spotMatches).length);
  }
  // When the filters leave spots that all sit outside the map view (crew picks only + South Malé), the map says so
  // and offers the view with every spot, instead of showing an empty map under "3 of 16 spots match".
  function mapViewEmpty() {
    var matching = TRIP.spots.filter(spotMatches);
    var inView = matching.filter(function (s) { return mod.view === 'all' || (mod.view === 'south' ? isSouth(s) : !isSouth(s)); });
    return matching.length > 0 && inView.length === 0 ? matching.length : 0;
  }
  function updateMapHint() {
    var hint = $('#map-hint'), n = mapViewEmpty();
    if (!hint) return;
    hint.hidden = !n;
    if (n) $('[data-hint-text]', hint).textContent = (n === 1 ? 'The spot that matches is' : 'The ' + n + ' spots that match are') + ' not in this map view.';
  }
  function initModuleMapWhenNear() {
    var box = $('#map-box');
    if (!box) return;
    if (!('IntersectionObserver' in W)) { startModuleMap(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); startModuleMap(); }
    }, { rootMargin: '900px 0px' });
    io.observe(box);
  }
  function startModuleMap() {
    if (mod.started || !$('#map-box')) return;
    mod.started = true;
    loadLeaflet(function (ok) {
      if (!ok) { moduleFallback('The satellite map could not load on this connection, so this is a to-scale sketch drawn from the pin coordinates. The spot list works as normal.'); return; }
      try { buildModuleMap(); } catch (e) {
        reportError(e);
        moduleFallback('The map could not start in this browser, so this is a to-scale sketch drawn from the pin coordinates. The spot list works as normal.');
      }
    });
  }
  function buildModuleMap() {
    var box = $('#map-box'), el = $('#spot-map');
    var M = mod.M = buildMap('mod', {
      el: el, view: mod.view, layers: true, tooltips: true, credit: $('#map-credit'),
      // Keep pins clear of the zoom buttons (top left) and the layers button (top right); a short box keeps less.
      pad: function () { var h = el.clientHeight || 400; return { tl: [40, Math.min(70, Math.round(h * 0.18))], br: [70, Math.min(40, Math.round(h * 0.12))] }; },
      blocks: function () { return relRects(el, [$('.leaflet-control-zoom', box), $('.leaflet-control-layers', box)]); },
      filter: spotMatches,
      onSpot: function (id) { selectSpot(id, 'map'); },
      selected: function () { return selectedSpot; },
      z: markerBaseZ,
      onTilesFailed: function () { moduleFallback('Map images could not load on this connection, so this is a to-scale sketch drawn from the pin coordinates. The spot list works as normal.'); }
    });
    // A spot chosen before the map was ready (a fresh #spot-<id> link, "Open in Surf spots", a card): centre on it now.
    if (selectedSpot) selectSpot(selectedSpot, mod.pendingSpot === selectedSpot ? 'built' : 'init');
    mod.pendingSpot = null;
    var touchWrap = $('#map-touch'), touchBtn = $('[data-map-touch]');
    function setDrag(on) {
      if (!M.touch || !touchBtn) return;
      if (on) M.map.dragging.enable(); else M.map.dragging.disable();
      touchBtn.classList.toggle('is-on', on);
      touchBtn.textContent = on ? 'Done moving the map' : 'Move the map';
      box.classList.toggle('map-dragging', on);
    }
    if (M.touch && touchWrap && touchBtn) {
      touchWrap.hidden = false;
      touchBtn.addEventListener('click', function () { setDrag(!touchBtn.classList.contains('is-on')); });
    }
    // Pulsing picks and the route shimmer only run while the map is on screen; leaving it also ends drag mode.
    if ('IntersectionObserver' in W) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          box.classList.toggle('map-live', en.isIntersecting);
          if (!en.isIntersecting) setDrag(false);
        });
      }, { threshold: 0.05 }).observe(box);
    } else box.classList.add('map-live');
  }
  function moduleFallback(msg) {
    mod.fallback = true;
    var el = $('#spot-map'), mt = $('#map-touch'), sk = $('#spot-schematic'), fb = $('#map-fallback'), box = $('#map-box');
    if (el) el.hidden = true;
    if (mt) mt.hidden = true;
    if (box) box.classList.add('is-sketch');
    if (sk) { sk.hidden = false; bindSchematic(sk, 'mod'); }
    if (fb) { fb.hidden = false; fb.textContent = msg; }
    setCredit($('#map-credit'), SKETCH_CREDIT);
    drawSchematic('mod');
    if (box) watchSize(box, function () { drawSchematic('mod'); });
  }

  /* ============================================ to-scale sketch (both maps) */
  // Drawn from the same lat/lon as the real map: water, a faint 0.05-degree grid, boat routes, pins, stays, the
  // airport, labels, a north arrow and a scale bar. Shown on the overview until the map tiles arrive, and on either
  // map when Leaflet or the tiles cannot load. Pins, stays and the airport are buttons.
  function bindSchematic(host, key) {
    if (host.getAttribute('data-sk-bound')) return;
    host.setAttribute('data-sk-bound', '1');
    function act(t) {
      var sp = t.closest('[data-sk-spot]'), st = t.closest('[data-sk-stay]'), ai = t.closest('[data-sk-air]');
      if (key === 'ov') {
        if (sp) ovSelect('spot', sp.getAttribute('data-sk-spot'));
        else if (st) ovSelect('stay', st.getAttribute('data-sk-stay'));
        else if (ai) ovSelect('airport');
        else closeOvCard(false);
      } else if (sp) selectSpot(sp.getAttribute('data-sk-spot'), 'map');
    }
    // A tap between two close pins goes to the nearest pin centre (as on the Leaflet maps), not to the one drawn on top.
    host.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var t = e.target, x = e.clientX, y = e.clientY, bd = Infinity;
      if (typeof x === 'number' && typeof y === 'number' && (x || y)) {
        $$('[data-sk-spot],[data-sk-stay],[data-sk-air]', host).forEach(function (g) {
          var hit = $('.sk-hit', g), r = hit && hit.getBoundingClientRect();
          if (!r || !r.width) return;
          var dx = x - (r.left + r.right) / 2, dy = y - (r.top + r.bottom) / 2, d = dx * dx + dy * dy, rad = r.width / 2;
          if (d <= rad * rad && d < bd) { bd = d; t = hit; }
        });
      }
      act(t);
    });
    host.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-sk-spot],[data-sk-stay],[data-sk-air]')) {
        e.preventDefault();
        act(e.target);
      }
    });
  }
  function r1(n) { return Math.round(n * 10) / 10; }
  // How much of the module map box the open sheet covers, with the box where alignSpotMap() puts it: { b, r } in px.
  function sheetCover(box, Wd, Ht) {
    var sh = $('#spot-sheet');
    if (!isSheetMode() || !sh || !sh.classList.contains('is-open') || !box || !box.getBoundingClientRect) return null;
    var r = box.getBoundingClientRect(), vw = W.innerWidth || 0, vh = W.innerHeight || 0;
    if (!vw || !vh || !r.height) return null;
    if (sheetSide()) return { b: 0, r: Math.round(Math.max(0, Math.min(Wd * 0.6, r.right - (vw - (sh.offsetWidth || 0))))) };
    var y = spotMapScrollY(), top = y === null ? r.top : r.top + scrollTopNow() - y;
    return { b: Math.round(Math.max(0, Math.min(Ht * 0.6, top + r.height - (vh - (sh.offsetHeight || 0))))), r: 0 };
  }
  var skPts = {};   // the last drawn pin positions in each sketch, by id ('sultans', 'stay-thulusdhoo', 'airport')
  function drawSchematic(key) {
    var isOv = key === 'ov';
    var host = $(isOv ? '#ov-schematic' : '#spot-schematic'), box = $(isOv ? '#ov-box' : '#map-box');
    if (!host || !box || host.hidden) return;
    var Wd = Math.round(box.clientWidth) || 360, Ht = Math.round(box.clientHeight) || (isOv ? 480 : 400);
    var view = isOv ? ov.view : mod.view;
    var narrow = Wd < 600;
    // Padding follows the box height too, so a short landscape box is not squeezed down to a far-out scale.
    var pad = { l: narrow ? 30 : 70, r: narrow ? 30 : 70, t: narrow && isOv ? Math.min(110, Math.round(Ht * 0.21)) : Math.min(64, Math.round(Ht * 0.14)), b: Math.min(isOv ? 76 : 44, Math.round(Ht * 0.15)) };
    // Phones: while the spot sheet (or the landscape side panel) is open, the sketch keeps everything in the part of
    // the box that is still on screen, since it cannot pan like the real map.
    var cover = isOv ? null : sheetCover(box, Wd, Ht);
    if (cover) { pad.b += cover.b; pad.r += cover.r; }
    var prj = projectBox(geoBox(viewPoints(view)), Wd, Ht, pad);
    var inView = function (s) { return view === 'all' || (view === 'south' ? isSouth(s) : !isSouth(s)); };
    var spots = TRIP.spots.filter(function (s) { return inView(s) && (isOv || spotMatches(s)); });
    var stays = view === 'south' ? [] : staysForPlan(state.plan);
    var air = view === 'south' ? null : airportPlace();
    var base = basePlace();
    var sel = isOv ? (ov.card && ov.card.type === 'spot' ? ov.card.id : null) : selectedSpot;
    var active = document.activeElement, focusKey = active && host.contains(active) ? active.getAttribute('data-sk-key') : null;

    var fixed = stays.map(function (g) { var p = prj.xy(g.place.lat, g.place.lon); return { id: 'stay-' + g.place.id, x: p.x, y: p.y, g: g }; });
    var airPt = air ? prj.xy(air.lat, air.lon) : null;
    if (airPt) airPt.id = 'airport';
    var pins = spots.map(function (s) { var p = prj.xy(s.lat, s.lon); return { k: s.id, s: s, x0: p.x, y0: p.y }; });
    spreadPoints(pins, fixed.concat(airPt ? [airPt] : []), PIN_GAP, PLACE_GAP, nudgeCap(prj.sc));
    var pts = skPts[key] = {};
    pins.concat(fixed).forEach(function (p) { pts[p.k || p.id] = { x: p.x, y: p.y }; });
    if (airPt) pts.airport = { x: airPt.x, y: airPt.y };

    var parts = ['<rect class="sk-water" x="0" y="0" width="' + Wd + '" height="' + Ht + '"/>'];
    var g0 = geoBox(viewPoints(view)), step = 0.05, v;
    for (v = Math.floor((g0.s - 0.3) / step) * step; v <= g0.n + 0.3; v += step) {
      var gy = prj.xy(v, g0.w).y;
      if (gy > 0 && gy < Ht) parts.push('<path class="sk-grid" d="M0 ' + r1(gy) + 'H' + Wd + '"/>');
    }
    for (v = Math.floor((g0.w - 0.3) / step) * step; v <= g0.e + 0.3; v += step) {
      var gx = prj.xy(g0.s, v).x;
      if (gx > 0 && gx < Wd) parts.push('<path class="sk-grid" d="M' + r1(gx) + ' 0V' + Ht + '"/>');
    }
    if (view !== 'south') {
      var b0 = prj.xy(base.lat, base.lon);
      pins.filter(function (p) { return p.s.crew_pick; }).forEach(function (p, k) {
        var dx = p.x - b0.x, dy = p.y - b0.y, len = Math.sqrt(dx * dx + dy * dy);
        if (len < 30) return;
        var bend = (k % 2 ? -1 : 1) * Math.min(56, len * 0.18);
        var cx = (b0.x + p.x) / 2 - dy / len * bend, cy = (b0.y + p.y) / 2 + dx / len * bend;
        parts.push('<path class="sk-route" d="M' + r1(b0.x) + ' ' + r1(b0.y) + 'Q' + r1(cx) + ' ' + r1(cy) + ' ' + r1(p.x) + ' ' + r1(p.y) + '"/>');
      });
    }
    // Pins, stays and the airport are drawn last, above the labels, so a label can never hide a pin. Crew picks go on
    // top of the stays and the airport (as on the Leaflet maps).
    var pinParts = [], pickParts = [];
    pins.forEach(function (p) {
      var s = p.s;
      var cls = 'sk-pin' + (s.crew_pick ? ' is-pick' : '') + (accessKind(s) === 'resort' ? ' is-resort' : '') + (isAdvanced(s) ? ' is-adv' : '') + (s.id === sel ? ' is-sel' : '');
      var shape = isAdvanced(s) ? '<rect class="sk-vis" x="-7.5" y="-7.5" width="15" height="15" rx="2" transform="rotate(45)"/>' : '<circle class="sk-vis" r="' + (s.crew_pick ? 9 : 8) + '"/>';
      (s.crew_pick ? pickParts : pinParts).push('<g class="' + cls + '" transform="translate(' + r1(p.x) + ' ' + r1(p.y) + ')" data-sk-spot="' + esc(s.id) + '" data-sk-key="spot-' + esc(s.id) + '" role="button" tabindex="0" aria-label="' + esc(spotAria(s)) + '">' +
        '<circle class="sk-hit" r="22"/><circle class="sk-ring" r="16"/>' + shape + '</g>');
    });
    fixed.forEach(function (p) {
      pinParts.push('<g class="sk-place sk-stay" transform="translate(' + r1(p.x) + ' ' + r1(p.y) + ')"' + (isOv ? ' data-sk-stay="' + esc(p.g.place.id) + '" data-sk-key="' + esc(p.id) + '" role="button" tabindex="0"' : ' role="img"') +
        ' aria-label="' + esc(stayAria(p.g)) + '">' +
        '<circle class="sk-hit" r="22"/><circle class="sk-ring" r="17"/><rect class="sk-stay-box" x="-10" y="-10" width="20" height="20" rx="5"/><path class="sk-stay-roof" d="M-5.5 1.2 0-3.6l5.5 4.8V6h-11z"/></g>');
    });
    if (airPt) {
      pinParts.push('<g class="sk-place sk-air" transform="translate(' + r1(airPt.x) + ' ' + r1(airPt.y) + ')"' + (isOv ? ' data-sk-air="1" data-sk-key="airport" role="button" tabindex="0"' : ' role="img"') +
        ' aria-label="' + esc(air.name + '. ' + airportBoatText() + '.') + '"><circle class="sk-hit" r="22"/><circle class="sk-ring" r="17"/><circle class="sk-air-disc" r="11"/>' +
        '<path class="sk-air-plane" transform="translate(-10 -10)" d="' + PLANE_PATH + '"/></g>');
    }
    // North arrow and scale bar, top left.
    var kmBar = [1, 2, 5, 10, 20, 50].filter(function (k) { return k * prj.sc >= 56; })[0] || 50, barW = kmBar * prj.sc;
    parts.push('<g class="sk-scale" aria-hidden="true"><path class="sk-north" d="M20 14l6 16-6-4-6 4z"/><text x="20" y="46" text-anchor="middle">N</text>' +
      '<path class="sk-bar" d="M40 30v6H' + r1(40 + barW) + 'v-6"/><text x="' + r1(40 + barW / 2) + '" y="24" text-anchor="middle">' + kmBar + ' km</text></g>');
    var blocks = [[6, 6, 50 + barW, 52]].concat(isOv ? relRects(box, [$('#ov-south'), $('#ov-card')]) : []);
    if (cover && cover.b) blocks.push([0, Ht - cover.b, Wd, Ht]);
    if (cover && cover.r) blocks.push([Wd - cover.r, 0, Wd, Ht]);

    var shown = pins.map(function (p) { return p.s; });
    var labels = mapLabelSpecs(stays, shown, !!airPt, Wd < 420).map(function (l) {
      var pt = l.kind === 'stay' ? fixed.filter(function (f) { return f.id === l.id; })[0] : l.kind === 'air' ? airPt : pins.filter(function (p) { return p.k === l.id; })[0];
      var e = estimateLabel(l.lines, false), c = estimateLabel(l.lines, true);
      l.x = pt.x; l.y = pt.y; l.w = e.w; l.h = e.h; l.cw = hasCompact(l.lines) ? c.w : 0; l.ch = c.h; l.pinR = l.kind === 'pick' ? 12 : 15;
      return l;
    });
    var obstacles = labelObstacles(pins, fixed.concat(airPt ? [airPt] : []));
    var res = placeLabels(labels, obstacles, blocks, Wd, Ht);
    // Leader lines first, then the label boxes, so no box is crossed by another label's line.
    labels.forEach(function (l) {
      var r = res[l.id];
      if (!r || !r.lead) return;
      var d = 'M' + r1(r.lead.x1) + ' ' + r1(r.lead.y1) + 'L' + r1(r.lead.x2) + ' ' + r1(r.lead.y2);
      parts.push('<g class="sk-lead" aria-hidden="true"><path class="sk-lead-under" d="' + d + '"/><path class="sk-lead-line" d="' + d + '"/></g>');
    });
    labels.forEach(function (l) {
      var r = res[l.id];
      if (!r) return;
      var ls = labelLines(l.lines, r.compact);
      var x1 = r.r[0], y1 = r.r[1];
      parts.push('<g class="sk-lbl sk-lbl--' + l.kind + '" aria-hidden="true"><rect x="' + r1(x1) + '" y="' + r1(y1) + '" width="' + r1(r.r[2] - x1) + '" height="' + r1(r.r[3] - y1) + '" rx="6"/>' +
        ls.map(function (ln, i) { return '<text class="' + ln[1] + '" x="' + r1(x1 + 9) + '" y="' + r1(y1 + 19 + i * 18) + '">' + esc(ln[0]) + '</text>'; }).join('') + '</g>');
    });
    parts = parts.concat(pinParts, pickParts);
    host.innerHTML = '<svg class="sk" viewBox="0 0 ' + Wd + ' ' + Ht + '" width="100%" height="100%" role="group" aria-label="' +
      esc('To-scale sketch of ' + (view === 'south' ? 'the South Malé breaks' : view === 'all' ? 'all ' + TRIP.spots.length + ' breaks, the stay options and the airport' : 'the North Malé breaks, the stay options and the airport') + ', drawn from the pin coordinates') + '">' + parts.join('') + '</svg>';
    if (focusKey) {
      var again = $('[data-sk-key="' + focusKey + '"]', host);
      if (again) { try { again.focus({ preventScroll: true }); } catch (e) { /* older browsers */ } }
    }
  }
  // Budget or Mid: both maps and the lists under the overview follow the plan on screen.
  function updateMapsPlan() {
    renderOverviewLists();
    if (ov.card && ov.card.type === 'stay') closeOvCard(false);
    if (ov.M && ov.M.ready) setMapStays(ov.M);
    if (!ov.leaflet) drawSchematic('ov');
    if (mod.M && mod.M.ready && !mod.fallback) setMapStays(mod.M);
    if (mod.fallback) drawSchematic('mod');
  }

  /* ------------------------------------------------ boat times and access rules */
  function renderBoatTimes() {
    var base = basePlace();
    var kindRank = { paddle: 0, time: 1, unknown: 1, no: 3 };
    var rows = TRIP.spots.slice().sort(function (a, b) {
      var ba = boatTime(a), bb = boatTime(b);
      return (b.crew_pick ? 1 : 0) - (a.crew_pick ? 1 : 0) || kindRank[ba.kind] - kindRank[bb.kind] || ba.km - bb.km;
    });
    var html = '<p class="fine">From ' + esc(base.name) + ', as the surf guides give it. Guides differ, so ask the boat crew; prices per trip are in 7 Local transport. Distances are straight lines.</p>' +
      '<ul class="bt-list">' + rows.map(function (s) {
        var bt = boatTime(s);
        var km = bt.kind === 'time' || bt.kind === 'unknown' ? 'about ' + bt.km + ' km' + (bt.kmFrom === 'pins' ? ' (between the map pins)' : '') : '';
        return '<li class="bt bt--' + bt.kind + (s.crew_pick ? ' is-pick' : '') + '">' +
          '<a class="bt-name" href="#spot-' + esc(s.id) + '">' + esc(s.name) + '</a>' +
          '<span class="bt-tags">' + (s.crew_pick ? '<span class="tag tag-pick">Crew pick</span>' : '') + '<span class="tag">' + esc(s.region.replace('Male', 'Malé')) + '</span></span>' +
          '<span class="bt-time">' + esc(bt.text) + '</span>' + (km ? '<span class="bt-km">' + esc(km) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    var root = renderInto('boat-times', html);
    if (root) clipList('boat-times', $('.bt-list', root), 'spots', 3, function (li) { return li.classList.contains('is-pick'); });
  }
  function renderAccessRules() {
    var groups = [
      ['public', 'Open to anyone who gets there', function (names, paddle) {
        return 'Listed as public access in our sources. ' + (paddle.length ? listWords(paddle) + (paddle.length === 1 ? ' is' : ' are') + ' a paddle from ' + basePlace().name + '; the rest need a boat.' : 'All of them need a boat.');
      }],
      ['limited', 'Access not confirmed', function () { return 'They break in front of or near a resort, and whether people who are not guests may surf them is not confirmed. Check before planning a day there.'; }],
      ['resort', 'Resort guests only', function () { return 'Only guests on that resort\'s surf package can surf them, so they are not an option from our base.'; }]
    ];
    var rule = (TRIP.essentials.culture || []).filter(function (x) { return /guests only/i.test(x) && /surf|wave/i.test(x); })[0];
    var html = '<ul class="access-list">' + groups.map(function (g) {
      var ss = TRIP.spots.filter(function (s) { return accessKind(s) === g[0]; });
      if (!ss.length) return '';
      var paddle = ss.filter(function (s) { return boatTime(s).kind === 'paddle'; }).map(spotShort);
      return '<li class="access access--' + g[0] + '"><p class="access-h"><span class="access-n">' + ss.length + '</span> ' + esc(g[1]) + '</p>' +
        '<p>' + esc(g[2](ss, paddle)) + '</p><p class="access-spots">' + ss.map(function (s) {
          return '<a href="#spot-' + esc(s.id) + '">' + esc(spotShort(s)) + '</a>';
        }).join(', ') + '</p></li>';
    }).join('') + '</ul>' + (rule ? '<p class="fine">' + richHtml(rule) + '</p>' : '');
    renderInto('access-rules', html);
  }

  function renderTides() {
    var s = TRIP.season;
    var sunBy = {};
    (s.sun || []).forEach(function (x) { sunBy[x.date] = x; });
    var days = TRIP.itinerary.filter(function (d) { return d.date >= TRIP.meta.trip_start && d.date <= TRIP.meta.trip_end; });
    var typical = (s.sun || [])[0] || { sunrise: '05:52', sunset: '17:50' };
    var rows = days.map(function (d) {
      var x = sunBy[d.date];
      var sr = x ? x.sunrise : 'about ' + typical.sunrise, ss = x ? x.sunset : 'about ' + typical.sunset;
      return '<tr><th scope="row">' + esc(d.label) + '</th><td>' + esc(sr) + '</td><td>' + esc(ss) + '</td><td>' + esc(d.tide_hint) + '</td></tr>';
    }).join('');
    var tideCount = (s.tides || []).length;
    renderInto('tides', '<div class="note note-warn">' + ICON.hazard + '<p><strong>' + esc(firstSentences(s.tide_note, 1)) + '</strong>' + (tideCount ? '' : ' Below: sunrise, sunset and a tide outlook worked out from moon phases.') +
      '</p></div><details class="more-d"><summary>What we know about the tides</summary><p>' + esc(restSentences(s.tide_note, 1)) + '</p></details>' +
      '<div class="table-wrap" tabindex="0" role="region" aria-label="Sunrise, sunset and tide outlook table"><table class="tide-table"><thead><tr><th scope="col">Day</th><th scope="col">Sunrise</th><th scope="col">Sunset</th><th scope="col">Tide outlook (estimate, from moon phases)</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="fine">Exact sunrise and sunset times are for 1 and 10 Nov; the days between are within a minute of them. Times are Maldives time (HK time minus 3 hours).</p>');
    var root = $('[data-render="tides"]');
    if (root) foldBlock('tides', [$('details', root), $('.table-wrap', root), $('.fine', root)], 'sunrise, sunset and tides');
  }

  function renderRhythm() {
    var root = renderInto('rhythm', TRIP.season.daily_rhythm.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join(''));
    clipList('rhythm', root, 'steps of the day', 2);
  }

  /* --------------------------------------------------------------- itinerary */
  var showAllPlans = false;
  function dayKind(d) {
    var t = d.title;
    if (/flex/i.test(t)) return ['Flex day', 'flex'];
    if (/buffer/i.test(t)) return ['Buffer day', 'buffer'];
    if (/^surf day/i.test(t)) return ['Surf day', 'surf'];
    if (/last surf/i.test(t)) return ['Surf, then fly', 'surf'];
    if (/^land in malé/i.test(t)) return ['Arrive', 'travel'];
    return ['Travel', 'travel'];
  }
  function renderItinerary() {
    var html = '<div class="itin-tools">' +
      '<p class="itin-plan" data-itin-plan></p>' +
      '<label class="check"><input type="checkbox" data-itin-all><span>' + (TRIP.plans.length === 2 ? 'Show both plans\' times for each day' : 'Show every plan\'s times for each day') + '</span></label>' +
      '<div class="itin-btns"><button type="button" class="btn btn-quiet" data-itin-expand="1">Open all days</button>' +
      '<button type="button" class="btn btn-quiet" data-itin-expand="0">Close all days</button></div></div>' +
      '<div class="days-wrap"><span class="days-progress" aria-hidden="true"></span><ol class="days">' + TRIP.itinerary.map(function (d, i) {
        var k = dayKind(d);
        return '<li class="day day--' + k[1] + '" id="day-' + esc(d.date) + '">' +
          '<h3 class="day-h"><button type="button" class="day-toggle" aria-expanded="' + (i === 0 ? 'true' : 'false') + '" aria-controls="day-body-' + i + '">' +
          '<span class="day-date">' + esc(d.label) + '</span>' +
          '<span class="day-title">' + esc(d.title) + '</span>' +
          '<span class="day-kind">' + esc(k[0]) + '</span>' +
          '</button></h3>' +
          '<div class="day-body" id="day-body-' + i + '"' + (i === 0 ? '' : ' hidden') + '>' +
          '<p class="day-surf"><strong>Surf:</strong> ' + esc(d.surf) + '</p>' +
          '<ol class="blocks" data-day-blocks="' + i + '"></ol>' +
          '<div class="day-extra"><p><strong>If it is flat or windy:</strong> ' + esc(d.flat_day_alt) + '</p>' +
          '<p><strong>Tide:</strong> ' + esc(d.tide_hint) + '</p></div>' +
          '</div></li>';
      }).join('') + '</ol></div>';
    var root = renderInto('itinerary', html);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('.day-toggle');
      if (b) {
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(open));
        document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
        timelineNudge();
        return;
      }
      var x = e.target.closest('[data-itin-expand]');
      if (x) {
        var on = x.getAttribute('data-itin-expand') === '1';
        $$('.day-toggle', root).forEach(function (t) {
          t.setAttribute('aria-expanded', String(on));
          document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
        });
      }
      timelineNudge();
    });
    root.addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-itin-all')) { showAllPlans = e.target.checked; updateItineraryBlocks(); }
    });
    updateItineraryBlocks();
    initTimeline();
  }
  // The line down the side of the days fills as you scroll through them (a transform, updated once per frame).
  var timelineNudge = function () {};
  function initTimeline() {
    var wrap = $('.days-wrap'), bar = $('.days-progress');
    if (!wrap || !bar) return;
    if (reduceMotion || !W.requestAnimationFrame) { bar.style.setProperty('--p', '1'); return; }
    var active = true, raf = 0;
    function update() {
      raf = 0;
      if (reduceMotion) { bar.style.setProperty('--p', '1'); return; }
      var r = wrap.getBoundingClientRect(), vh = W.innerHeight || 800;
      var p = r.height ? (vh * 0.62 - r.top) / r.height : 1;
      bar.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(4));
    }
    function onScroll() { if (active && !raf) raf = W.requestAnimationFrame(update); }
    timelineNudge = onScroll;
    if ('IntersectionObserver' in W) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { active = en.isIntersecting; if (active) onScroll(); });
      }, { rootMargin: '200px 0px' }).observe(wrap);
    }
    W.addEventListener('scroll', onScroll, { passive: true });
    W.addEventListener('resize', onScroll);
    update();
  }
  function recFlightName() {
    var rec = (TRIP.flights.options || []).filter(function (o) { return o.recommended; })[0];
    if (!rec) return 'recommended';
    return rec.airline + ' (' + rec.outbound.legs[0].flight + ' out, ' + rec.return.legs[0].flight + ' home)';
  }
  function updateItineraryBlocks() {
    var p = state.plan;
    var planP = $('[data-itin-plan]');
    if (planP) planP.innerHTML = 'Showing the <strong>' + esc(planShort(p)) + ' plan</strong> (' + esc(planRole(p).toLowerCase()) + '). Times marked with a plan name only apply to that plan; change the plan in the top bar (phones) or the side panel (desktop) to compare. ' +
      'Travel times follow our recommended ' + esc(recFlightName()) + ' flights, whichever flight you pick in the budget calculator.';
    TRIP.itinerary.forEach(function (d, i) {
      var ol = $('[data-day-blocks="' + i + '"]');
      if (!ol) return;
      ol.innerHTML = d.blocks.filter(function (b) { return showAllPlans || appliesTo(b.plans, p); }).map(function (b) {
        var specific = b.plans && b.plans.indexOf('all') === -1;
        var tag = specific ? '<span class="plan-tag plan-tag--' + esc(b.plans[0]) + '">' + esc(b.plans.map(function (x) { return planShort(x); }).join(' and ')) + ' plan</span>' : '';
        var dim = specific && !appliesTo(b.plans, p) ? ' is-other' : '';
        return '<li class="block' + (specific ? ' is-specific' : '') + dim + '"><span class="block-time">' + esc(b.time) + '</span><div class="block-what">' + tag + '<p>' + esc(b.what) + '</p></div></li>';
      }).join('');
    });
  }

  /* ----------------------------------------------------------------- flights */
  function legTime(t) {
    if (!t || /--:--/.test(t)) return '<span class="t-unknown">time not listed</span>';
    return esc(t);
  }
  function routeHtml(dir, j) {
    var legs = j.legs, a = legs[0], z = legs[legs.length - 1];
    var vias = legs.slice(0, -1).map(function (l) { return l.to; });
    return '<div class="route">' +
      '<p class="route-dir">' + esc(dir) + ' <span>' + esc(j.date) + '</span></p>' +
      '<div class="route-line">' +
      '<div class="port"><span class="code">' + esc(a.from) + '</span><span class="time">' + legTime(a.dep) + '</span></div>' +
      '<div class="via"><span class="via-track" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M2 13l8-1 6-8h2l-3 8 5 .5 2-2.5h2l-1.5 4 1.5 4h-2l-2-2.5-5 .5 3 8h-2l-6-8-8-1z" fill="currentColor"/></svg></span>' +
      '<span class="via-text">via ' + esc(vias.join(', ')) + '</span><span class="via-lay">' + esc(j.layover) + '</span></div>' +
      '<div class="port port-end"><span class="code">' + esc(z.to) + '</span><span class="time">' + legTime(z.arr) + '</span></div>' +
      '</div>' +
      '<p class="route-meta">' + esc(legs.map(function (l) { return l.flight; }).join(' + ')) + '. Total ' + esc(j.duration) + '.</p>' +
      '</div>';
  }
  function boardChip(o) {
    var l = TRIP.budget.lines.filter(function (x) { return x.choice === 'flight' && x.choice_id === o.id && /board/i.test(x.id); })[0];
    return l ? chip(l.status) : '<span class="status status--quote">Confirm in writing</span>';
  }
  function renderFlights() {
    var F = TRIP.flights;
    var opts = F.options.slice().sort(function (a, b) { return (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0); });
    var html = '<p class="lede">' + esc(F.summary) + '</p>' +
      '<div class="passes">' + opts.map(function (o) {
        var fee = o.board.fee_pp_hkd;
        return '<article class="pass' + (o.recommended ? ' is-rec' : '') + '" id="flight-' + esc(o.id) + '">' +
          '<div class="pass-main">' +
          '<header class="pass-head"><p class="pass-airline">' + esc(o.airline) + '</p>' +
          (o.recommended ? '<span class="stamp">Our pick</span>' : '') +
          '<h3 class="pass-title">' + esc(o.label) + '</h3></header>' +
          routeHtml('Out', o.outbound) + routeHtml('Home', o.return) +
          '</div>' +
          '<div class="pass-stub">' +
          '<p class="stub-lbl">Return fare, each</p><p class="stub-fare">' + esc(hkd(o.fare_pp_hkd.low, o.fare_pp_hkd.high)) + '</p>' + chip(o.fare_status) +
          '<p class="stub-lbl">Board bag, each</p><p class="stub-board">' + (fee.high === 0 ? 'HKD 0 inside the allowance' : esc(hkd(fee.low, fee.high))) + '</p>' + boardChip(o) +
          '</div>' +
          '<div class="pass-more">' +
          '<details class="more-d"><summary>Board rules</summary><p>' + esc(o.board.policy) + '</p><p>' + esc(o.board.limits) + '</p></details>' +
          '<details class="more-d"><summary>Good and bad</summary><div class="procon"><div><p class="pc-h">Good</p><ul>' + o.pros.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>' +
          '<div><p class="pc-h">Watch out</p><ul>' + o.cons.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div></div></details>' +
          srcLink(o.source, 'Fare search (Google Flights)') +
          '</div></article>';
      }).join('') + '</div>' +
      '<div class="two-col"><div><h3 class="h-sub">Booking tips</h3><ul class="ticks">' + F.booking_tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h3 class="h-sub">Taxes</h3><p>' + esc(F.taxes_note) + '</p>' +
      '<details class="more-d"><summary>Flight sources (' + F.sources.length + ')</summary><ul class="src-list">' + F.sources.map(function (u) { return '<li>' + srcLink(u, hostOf(u)) + '</li>'; }).join('') + '</ul></details></div></div>';
    var root = renderInto('flights', html);
    clipList('flights', $('.passes', root), 'flight options', 1);
    clipList('booking-tips', $('.two-col .ticks', root), 'booking tips', 3);
  }
  function hostOf(u) {
    try { var x = new URL(u); return x.hostname.replace(/^www\./, '') + (x.pathname.length > 1 ? x.pathname.replace(/\/$/, '').slice(0, 40) : ''); } catch (e) { return u; }
  }

  /* --------------------------------------------------------------- transport */
  var PER = { boat: 'per boat', person: 'per person', group: 'for the group' };
  // The airport boat and the daily surf boats are part of both plans; the South Malé day and airport taxis are extras.
  var CORE_LEGS = ['airport-to-thulusdhoo', 'daily-surf-boats'];
  function transportRelevant(legId) { return CORE_LEGS.indexOf(legId) !== -1; }
  function renderTransport() {
    var T = TRIP.transport;
    var html = '<div class="notes-grid"><ul class="ticks">' + T.notes.slice(0, 4).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' +
      '<ul class="ticks">' + T.notes.slice(4).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="boats-box"><h3>Daily surf boats</h3><p>' + esc(T.daily_boats.summary) + '</p>' +
      '<div class="boats-nums"><p><span class="num">' + esc(hkd(T.daily_boats.cost_pp_trip_hkd.low, T.daily_boats.cost_pp_trip_hkd.high)) + '</span> each, per session</p>' +
      '<p><span class="num">' + esc(hkd(T.daily_boats.cost_pp_stay_hkd.low, T.daily_boats.cost_pp_stay_hkd.high)) + '</span> each, for the trip</p>' + chip('estimate') + '</div>' +
      '<details class="more-d"><summary>How this adds up</summary><p>' + esc(T.daily_boats.basis) + '</p>' + srcLink(T.daily_boats.source) + '</details></div>' +
      '<div class="legs">' + T.legs.map(function (leg) {
        return '<article class="leg" data-leg="' + esc(leg.id) + '">' + photoFigure(photoById(LEG_PHOTOS[leg.id]), 'card-ph', '(min-width: 1000px) 45vw, 92vw') + '<header class="leg-head"><h3>' + esc(leg.title) + '</h3><span class="tag tag-plan" data-leg-tag hidden>' + (TRIP.plans.length === 2 ? 'Both plans use this' : 'Every plan uses this') + '</span></header>' +
          '<ul class="leg-opts">' + leg.options.map(function (o) {
            return '<li class="leg-opt"><div class="leg-main"><h4>' + esc(o.mode) + '</h4><p class="leg-dur">' + esc(o.duration) + '</p></div>' +
              '<div class="leg-price"><p class="num">' + (o.cost_hkd.high === 0 ? 'HKD 0' : esc(hkd(o.cost_hkd.low, o.cost_hkd.high))) + '</p><p class="per">' + esc(PER[o.per] || o.per) + '</p>' + chip(o.status) + '</div>' +
              '<details class="more-d leg-notes"><summary>Details</summary><p>' + esc(o.notes) + '</p>' + srcLink(o.source) + '</details></li>';
          }).join('') + '</ul></article>';
      }).join('') + '</div>';
    var root = renderInto('transport', html);
    var noteLists = $$('.notes-grid > .ticks', root);
    clipList('transport-notes', noteLists[0], 'notes', 3, null, { more: noteLists.slice(1), after: $('.notes-grid', root) });
    clipList('legs', $('.legs', root), 'journeys', 2, function (el) { return transportRelevant(el.getAttribute('data-leg')); });
    updateTransportPlan();
  }
  function updateTransportPlan() {
    $$('[data-leg]').forEach(function (a) {
      var on = transportRelevant(a.getAttribute('data-leg'));
      a.classList.toggle('is-relevant', on);
      var t = $('[data-leg-tag]', a);
      if (t) t.hidden = !on;
    });
  }

  /* -------------------------------------------------------------------- stay */
  function list(items, cls) {
    return '<ul class="' + (cls || 'ticks') + '">' + (items || []).map(function (x) { return '<li>' + richHtml(x) + '</li>'; }).join('') + '</ul>';
  }
  function stayChips(p) {
    var line = TRIP.budget.lines.filter(function (l) {
      return l.category === 'Stay' && !l.optional && !l.choice && l.high_hkd > 0 && (l.plans || []).indexOf(p.id) !== -1;
    })[0];
    var st = line ? line.status : p.status;
    var out = chip(st);
    if (line && statusKind(line.status) !== statusKind(p.status)) out += '<p class="fine plan-status-note">This figure: ' + esc(line.status) + '. The package as a whole: ' + chip(p.status) + '</p>';
    return out;
  }
  function renderStay() {
    var html = '<div class="plans">' + TRIP.plans.map(function (p, i) {
      return '<article class="plan-card" data-plan-card="' + esc(p.id) + '">' + photoFigure(photoById(STAY_PHOTOS[i]), 'card-ph', '(min-width: 1100px) 40vw, (min-width: 900px) 45vw, 92vw') +
        '<header><p class="plan-short">' + esc(planShort(p.id)) + ' plan</p>' + (p.recommended ? '<span class="stamp">Crew\'s plan</span>' : '<span class="stamp stamp-quiet">' + esc(planRole(p.id)) + '</span>') +
        '<h3>' + esc(p.name) + '</h3><p class="plan-tag-line">' + esc(p.tagline) + '</p></header>' +
        '<p class="plan-base">' + esc(p.base) + '</p>' +
        '<div class="plan-price"><p class="stub-lbl">Stay, each, ' + tripNights() + ' nights</p><p class="num">' + esc(hkd(p.stay_pp_hkd.low, p.stay_pp_hkd.high)) + '</p>' + stayChips(p) +
        '<p class="stub-lbl">Whole trip, each, with the calculator picks</p><p class="num num-sm" data-plan-total="' + esc(p.id) + '"></p>' + chip('estimate') + '</div>' +
        '<button type="button" class="btn btn-choose" data-plan-choose="' + esc(p.id) + '" aria-pressed="false">Show this plan</button>' +
        '<p class="plan-who">' + esc(p.who_for) + '</p>' +
        '<details class="more-d"><summary>What the price covers</summary><p class="pc-h">Included</p>' + list(p.includes) + '<p class="pc-h">Not included</p>' + list(p.excludes) + '<p class="fine">' + esc(p.stay_basis) + '</p></details>' +
        '<details class="more-d"><summary>Good and bad</summary><p class="pc-h">Good</p>' + list(p.pros) + '<p class="pc-h">Watch out</p>' + list(p.cons) + '</details>' +
        '</article>';
    }).join('') + '</div>' +
      '<h3 class="h-sub" id="stay-options-title" data-stay-title>Places to stay</h3><p class="fine" data-stay-hint></p>' +
      '<div class="props" data-props></div>' +
      aboveBudgetHtml() +
      '<h3 class="h-sub" id="stay-not-available">Checked, and not available for 1-10 Nov</h3>' +
      '<ul class="na-list">' + TRIP.not_available.map(function (n, i) {
        return '<li class="na' + (i === 0 ? ' na-lead' : '') + '"><h4>' + esc(n.name) + '</h4><p>' + esc(n.why) + '</p>' + srcLink(n.source) + '</li>';
      }).join('') + '</ul>';
    var root = renderInto('stay', html);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-plan-choose]');
      if (b) setPlan(b.getAttribute('data-plan-choose'), 'stay');
      var m = e.target.closest('[data-ov-stay]');
      if (m) {
        e.preventDefault();
        var top = $('#top');
        if (top) scrollInstant(function () { top.scrollIntoView({ block: 'start', behavior: 'auto' }); });
        ovSelect('stay', m.getAttribute('data-ov-stay'));
        try { if (W.history && history.pushState) history.pushState(null, '', '#top'); } catch (err) { /* sandboxed */ }
      }
    });
    clipList('not-available', $('.na-list', root), 'checked options', 2);
    updateStayPlan();
  }
  function stayPlaceId(o) {
    var g = staysForPlan(state.plan).filter(function (x) { return x.options.indexOf(o) !== -1; })[0];
    return g ? g.place.id : '';
  }
  // Checked and dropped on price: one short note, not a plan.
  function aboveBudgetHtml() {
    var A = TRIP.above_budget || [];
    if (!A.length) return '';
    return '<aside class="above" id="above-budget" aria-labelledby="above-budget-title"><h3 id="above-budget-title">Considered, above our budget</h3><ul class="above-list">' + A.map(function (a) {
      return '<li class="above-item"><h4>' + esc(a.name) + '</h4>' +
        '<p class="above-price"><span class="num num-sm">' + esc(hkd(a.pp_hkd.low, a.pp_hkd.high)) + ' each, before flights</span>' + chip(a.status) + '</p>' +
        '<p>' + esc(firstSentences(a.why_not, 1)) + '</p>' +
        '<details class="more-d"><summary>Other reasons, and what the package covers</summary><p>' + esc(restSentences(a.why_not, 1)) + '</p><p>' + esc(a.what) + '</p></details>' +
        srcLink(a.source) + '</li>';
    }).join('') + '</ul></aside>';
  }
  function updateStayPlan() {
    var p = planById(state.plan);
    $$('[data-plan-card]').forEach(function (c) { c.classList.toggle('is-selected', c.getAttribute('data-plan-card') === state.plan); });
    updatePlanEstimates();
    var t = $('[data-stay-title]');
    if (t) t.textContent = 'Places to stay on the ' + planShort(p.id) + ' plan';
    var hint = $('[data-stay-hint]');
    var crewN = crewBase(), nights = tripNights();
    if (hint) hint.textContent = 'Room prices were found for a crew of ' + crewN + ': group totals cover all ' + crewN + ' for ' + nights + ' nights, and the price each is that total divided by ' + crewN + '. Change the plan to see the ' + (TRIP.plans.length === 2 ? 'other plan\'s' : 'other plans\'') + ' places.';
    var box = $('[data-props]');
    if (!box) return;
    box.innerHTML = p.options.map(function (o) {
      var rows = [['Rooms for ' + crewN, o.rooms_for_11], ['Meals', o.meals], ['Taxes', o.taxes], ['Cancelling', o.cancellation], ['Rating', o.rating], ['Availability', o.availability]];
      return '<article class="prop"><header class="prop-head"><div><h4>' + esc(o.name) + '</h4><p class="prop-island">' + esc(o.island) + '</p><p class="prop-type">' + esc(o.type) + '</p></div>' +
        '<div class="prop-price"><p class="num">' + esc(hkd(o.pp_hkd.low, o.pp_hkd.high)) + '</p><p class="per">each, ' + nights + ' nights</p>' +
        '<p class="per">' + esc(hkd(o.total_group_hkd.low, o.total_group_hkd.high)) + ' for the group</p>' + chip(o.status) + '</div></header>' +
        '<p class="prop-cancel"><strong>Cancelling:</strong> ' + esc(o.cancellation) + '</p>' +
        '<details class="more-d"><summary>Rooms, meals, taxes and availability</summary><dl class="kv">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl></details>' +
        '<p class="src-row">' + srcLink(o.url, 'See the listing') + (stayPlaceId(o) ? '<a class="map-link" href="#top" data-ov-stay="' + esc(stayPlaceId(o)) + '">See the island on the map</a>' : '') + '</p></article>';
    }).join('');
    clipList('props', box, 'places to stay', 1);
  }

  /* ---------------------------------------------------------------- coaching */
  function renderCoaching() {
    var C = TRIP.coaching;
    var html = '<p class="lede">' + esc(C.summary) + '</p>' +
      '<div class="note note-warn">' + ICON.hazard + '<div><p><strong>Reality check.</strong> ' + esc(firstSentences(C.reality_check, 2)) + '</p>' +
      '<details class="more-d"><summary>The rest of the reality check</summary><p>' + esc(restSentences(C.reality_check, 2)) + '</p></details></div></div>' +
      '<div class="coach-plan" data-coach-plan></div>' +
      '<h3 class="h-sub">Coaching packages (' + (TRIP.plans.length === 2 ? 'both plans' : 'every plan') + ')</h3>' +
      '<ol class="packages">' + C.packages.map(function (k) {
        return '<li class="package" data-package="' + esc(k.id) + '"><header><h4>' + esc(k.name) + '</h4>' + defaultTags('coaching', k.id) + '</header>' +
          '<p class="num">' + (k.pp_hkd.high === 0 ? 'HKD 0' : esc(hkd(k.pp_hkd.low, k.pp_hkd.high))) + '</p><p class="per">each, for the trip</p>' + chip(k.status) +
          '<p>' + esc(k.what) + '</p><p class="fine">' + esc(k.ratio) + '</p>' +
          '<details class="more-d"><summary>How it is priced</summary><p>' + esc(k.basis) + '</p></details></li>';
      }).join('') + '</ol>' +
      '<h3 class="h-sub">The 8-day coaching programme</h3>' +
      '<ol class="programme">' + C.programme.map(function (d) {
        return '<li><h4>' + esc(d.day) + '</h4><p><strong>Focus:</strong> ' + esc(d.focus) + '</p><p><strong>Where:</strong> ' + esc(d.spot_idea) + '</p>' +
          '<details class="more-d"><summary>Drills</summary><p>' + esc(d.drills) + '</p></details></li>';
      }).join('') + '</ol>' +
      '<h3 class="h-sub">Who could coach us</h3>' +
      '<div class="two-col">' + [[false, 'Open to a guesthouse crew'], [true, 'Only for their own guests or package buyers']].map(function (g) {
        var ps = C.providers.filter(function (p) { return !!p.guests_only === g[0]; });
        return '<div><h4 class="group-h">' + esc(g[1]) + ' (' + ps.length + ')</h4><ul class="providers">' + ps.map(function (p) {
          return '<li class="provider"><h5>' + esc(p.name) + '</h5><p class="fine">' + esc(p.where) + '</p>' +
            '<p class="tags">' + (p.video ? '<span class="tag">Films sessions</span>' : '') + (p.guests_only ? '<span class="tag">Guests only</span>' : '<span class="tag">No stay needed</span>') + chip(p.status) + '</p>' +
            '<p>' + esc(p.price_note) + '</p><details class="more-d"><summary>What they offer</summary><p>' + esc(p.offer) + '</p></details>' + srcLink(p.source) + '</li>';
        }).join('') + '</ul></div>';
      }).join('') + '</div>';
    var root = renderInto('coaching', html);
    clipList('programme', $('.programme', root), 'days', 0, null, { text: function (open, n) { return open ? 'Hide the programme' : 'Show the ' + n + '-day programme'; } });
    $$('.providers', root).forEach(function (ul, i) { clipList('providers-' + i, ul, 'coaches', 1); });
    updateCoachingPlan();
  }
  function updateCoachingPlan() {
    var box = $('[data-coach-plan]');
    if (!box) return;
    var r = computeBudget(state);
    if (choiceIds('coaching', state.plan).length) {
      $$('[data-package]').forEach(function (li) { li.classList.toggle('is-chosen', li.getAttribute('data-package') === r.eff.coaching); });
      var pk = C_pkg(r.eff.coaching);
      box.innerHTML = '<p>On the <strong>' + esc(planShort(state.plan)) + ' plan</strong> the budget calculator counts <strong>' + esc(pk ? pk.name : r.eff.coaching) + '</strong>' +
        (r.eff.coaching === defaultChoice('coaching', state.plan) ? ' (this plan\'s default)' : '') + '. Change it in the budget calculator.</p>';
    } else {
      $$('[data-package]').forEach(function (li) { li.classList.remove('is-chosen'); });
      var lines = TRIP.budget.lines.filter(function (l) { return l.category === 'Coaching' && !l.choice && appliesTo(l.plans, state.plan) && l.plans.indexOf('all') === -1; });
      box.innerHTML = '<p>On the <strong>' + esc(planShort(state.plan)) + ' plan</strong> these packages do not apply. What the budget counts instead:</p><ul class="ticks">' +
        lines.map(function (l) { return '<li>' + esc(l.label) + ': ' + (l.high_hkd === 0 ? 'HKD 0' : esc(hkd(l.low_hkd, l.high_hkd))) + (l.basis === 'per_group' ? ' for the group' : ' each') + ' ' + chip(l.status) + '</li>'; }).join('') + '</ul>';
    }
  }
  // "Budget default" / "Mid default" tags, from budget.defaults.
  function defaultTags(group, id) {
    return TRIP.plans.filter(function (p) { return defaultChoice(group, p.id) === id; }).map(function (p) {
      return '<span class="stamp stamp-sm">' + esc(planShort(p.id)) + ' default</span>';
    }).join('');
  }
  function C_pkg(id) { return (TRIP.coaching.packages || []).filter(function (p) { return p.id === id; })[0]; }

  /* -------------------------------------------------------------------- food */
  var foodFilter = { island: 'all', top: false };
  function islandLabel(i, filter) {
    if (/^resort day pass$/i.test(i)) return filter ? 'Resort day passes' : 'Resort (day pass)';
    return i.replace(/^Male$/, 'Malé').replace(/^Hulhumale$/, 'Hulhumalé');
  }
  function renderFood() {
    var Fd = TRIP.food;
    var islands = [];
    Fd.restaurants.forEach(function (r) { if (islands.indexOf(r.island) === -1) islands.push(r.island); });
    var html = '<div class="note note-warn">' + ICON.hazard + '<div><p><strong>Alcohol rules.</strong> ' + esc(Fd.alcohol[0]) + ' ' + esc(Fd.alcohol[1]) + '</p>' +
      '<details class="more-d"><summary>More drink rules (' + Math.max(0, Fd.alcohol.length - 2) + ')</summary>' + list(Fd.alcohol.slice(2)) + '</details></div></div>' +
      '<h3 class="h-sub">Daily food budget</h3><div class="food-budget">' + Fd.daily_budget.map(function (b) {
        return '<div class="fb" data-food-style="' + esc(b.id) + '"><p class="fb-style">' + esc(b.style) + '</p><p class="fb-tags">' + defaultTags('food', b.id) + '</p>' +
          '<p class="num">' + esc(hkd(b.pp_day_hkd.low, b.pp_day_hkd.high)) + '</p><p class="per">each, per day</p>' + chip(parseStatus(b.basis)) +
          '<details class="more-d"><summary>How this is worked out</summary><p>' + esc(b.basis.replace(/^Status:[^.]*\.\s*/i, '')) + '</p></details></div>';
      }).join('') + '</div><p class="fine" data-food-plan></p>' +
      '<h3 class="h-sub">Where to eat</h3>' +
      '<div class="filters"><div class="filter-row"><div class="seg-inline" role="group" aria-label="Island">' + ['all'].concat(islands).map(function (i) {
        return '<button type="button" class="toggle" data-food-island="' + esc(i) + '" aria-pressed="' + (i === 'all') + '">' + esc(i === 'all' ? 'Everywhere' : islandLabel(i, true)) + '</button>';
      }).join('') + '</div><button type="button" class="toggle" data-food-top aria-pressed="false">Top picks only</button></div></div>' +
      '<p class="count" data-food-count aria-live="polite"></p>' +
      '<ul class="eats">' + Fd.restaurants.map(function (r, i) {
        var price = r.pp_hkd ? '<p class="num num-sm">' + esc(hkd(r.pp_hkd.low, r.pp_hkd.high)) + ' each</p>' + chip(parseStatus(r.group_note)) : '<span class="status status--none">Price not checked</span>';
        return '<li class="eat' + (r.top_pick ? ' is-top' : '') + '" data-eat="' + i + '"><div class="eat-main"><h4>' + esc(r.name) + (r.top_pick ? ' <span class="tag tag-pick">Top pick</span>' : '') + '</h4>' +
          '<p class="fine">' + esc(islandLabel(r.island, false)) + ', ' + esc(r.cuisine) + '</p>' +
          '<p><strong>Order:</strong> ' + esc(r.order) + '</p><p>' + esc(r.pp_hkd ? stripStatusTail(r.group_note) : r.group_note) + '</p></div>' +
          '<div class="eat-side"><p class="fine">' + esc(r.rating) + '</p>' + price + srcLink(r.source) + '</div></li>';
      }).join('') + '</ul>' +
      '<h3 class="h-sub">Dishes to try</h3><div class="dishes-wrap">' + photoFigure(photoById(DISH_PHOTO), '', '(min-width: 1000px) 320px, 92vw', 'dish-ph') +
      '<dl class="dishes">' + Fd.dishes.map(function (d) { return '<div><dt>' + esc(d.name) + '</dt><dd>' + esc(d.what) + '</dd></div>'; }).join('') + '</dl></div>';
    var root = renderInto('food', html);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-food-island]');
      if (b) {
        foodFilter.island = b.getAttribute('data-food-island');
        $$('[data-food-island]', root).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      } else if ((b = e.target.closest('[data-food-top]'))) {
        foodFilter.top = !foodFilter.top; b.setAttribute('aria-pressed', String(foodFilter.top));
      } else return;
      applyFoodFilter();
    });
    applyFoodFilter();
    clipList('dishes', $('.dishes', root), 'dishes', 3);
    updateFoodPlan();
  }
  function applyFoodFilter() {
    var n = 0;
    TRIP.food.restaurants.forEach(function (r, i) {
      var ok = (foodFilter.island === 'all' || r.island === foodFilter.island) && (!foodFilter.top || r.top_pick);
      var li = $('[data-eat="' + i + '"]');
      if (li) li.hidden = !ok;
      if (ok) n++;
    });
    var c = $('[data-food-count]'), total = TRIP.food.restaurants.length;
    if (c) c.textContent = !n ? 'No places match. Pick another island.' : n === total ? total + ' places' : n + ' of ' + total + ' places match';
    clipList('eats', $('.eats'), 'places', 4);
  }
  function updateFoodPlan() {
    var el = $('[data-food-plan]');
    if (!el) return;
    var r = computeBudget(state);
    $$('[data-food-style]').forEach(function (d) { d.classList.toggle('is-chosen', d.getAttribute('data-food-style') === r.eff.food); });
    var line = r.counted.filter(function (c) { return c.line.category === 'Food'; })[0];
    el.innerHTML = 'On the <strong>' + esc(planShort(state.plan)) + ' plan</strong> the calculator counts: ' +
      (line ? esc(line.line.label) + ', ' + esc(hkd(line.lo, line.hi)) + ' each ' + chip(line.line.status) : 'no food line.');
  }

  /* -------------------------------------------------------------- activities */
  var actFilter = 'all';
  function renderActivities() {
    var A = TRIP.activities;
    var tags = [];
    A.forEach(function (a) { if (tags.indexOf(a.best_for) === -1) tags.push(a.best_for); });
    var flat = TRIP.headline.big_decisions.filter(function (d) { return /flat/i.test(d.question); })[0];
    var html = (flat ? '<div class="flatplan"><h3>' + esc(flat.question) + '</h3><p class="flat-pick">' + esc(flat.our_pick) + '</p><p>' + esc(flat.why) + '</p>' + list(flat.alternatives) + '</div>' : '') +
      '<h3 class="h-sub">Ideas for the rest of the day</h3>' +
      '<div class="filters"><div class="filter-row"><div class="seg-inline" role="group" aria-label="Best for">' + ['all'].concat(tags).map(function (t) {
        return '<button type="button" class="toggle" data-act="' + esc(t) + '" aria-pressed="' + (t === 'all') + '">' + esc(t === 'all' ? 'Everything' : cap(t)) + '</button>';
      }).join('') + '</div></div></div><p class="count" data-act-count aria-live="polite"></p>' +
      '<ul class="acts">' + A.map(function (a, i) {
        var free = a.pp_hkd.high === 0 && statusKind(a.status) !== 'quote';
        var ph = photoById(ACT_PHOTOS[a.id]);
        return '<li class="act' + (ph ? ' has-ph' : '') + '" data-act-i="' + i + '">' + (ph ? photoFigure(ph, 'card-ph', '(min-width: 1200px) 30vw, (min-width: 700px) 45vw, 92vw') : '') +
          '<header><span class="tag tag-for">' + esc(cap(a.best_for)) + '</span><h4>' + esc(a.name) + '</h4></header>' +
          '<p class="fine">' + esc(a.where) + '. ' + esc(a.duration) + '.</p>' +
          '<p class="act-price"><span class="num num-sm">' + (free ? 'Free' : esc(hkd(a.pp_hkd.low, a.pp_hkd.high)) + ' each') + '</span> ' + chip(a.status) + '</p>' +
          '<p>' + esc(a.group_note) + '</p>' +
          '<details class="more-d"><summary>Season and tax notes</summary><p>' + esc(a.season_note) + '</p><p>' + esc(a.tax_note) + '</p></details>' + srcLink(a.source) + '</li>';
      }).join('') + '</ul>';
    var root = renderInto('activities', html);
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      actFilter = b.getAttribute('data-act');
      $$('[data-act]', root).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      applyActFilter();
    });
    applyActFilter();
  }
  function applyActFilter() {
    var n = 0;
    TRIP.activities.forEach(function (a, i) {
      var ok = actFilter === 'all' || a.best_for === actFilter;
      var li = $('[data-act-i="' + i + '"]');
      if (li) li.hidden = !ok;
      if (ok) n++;
    });
    var c = $('[data-act-count]'), total = TRIP.activities.length;
    if (c) c.textContent = n === total ? total + ' ideas' : n + ' of ' + total + ' ideas match';
    // Phones: the ideas with photos first, then "Show all".
    clipList('acts', $('.acts'), 'ideas', 4, function (li) { return li.classList.contains('has-ph'); });
  }

  /* ------------------------------------------------------------------ budget */
  function sumLines(lines, crew) {
    var lo = 0, hi = 0;
    lines.forEach(function (l) { var d = l.basis === 'per_group' ? crew : 1; lo += l.low_hkd / d; hi += l.high_hkd / d; });
    return [lo, hi];
  }
  function renderBudget() {
    var B = TRIP.budget, rec = recPlan();
    var html = '<p class="lede">Pick a plan, a flight, coaching, food style and extras. The totals are per person, and group totals are that times the crew size. It opens on ' + esc(planShort(rec.id)) + ', the crew\'s plan. Prices checked ' + esc(fmtDate(TRIP.meta.prices_checked)) + '; all are estimates to re-check before booking.</p>' +
      '<div class="calc">' +
      '<form class="calc-controls" data-calc-form onsubmit="return false">' +
      '<fieldset class="cf"><legend>Plan</legend><p class="calc-note">Changing the plan loads that plan\'s own flight, coaching and food picks. Add-ons and crew size stay.</p><div class="opts" data-calc-plan></div></fieldset>' +
      '<fieldset class="cf"><legend>Flight</legend><div class="opts" data-calc-flight></div></fieldset>' +
      '<fieldset class="cf"><legend>Coaching</legend><div class="opts" data-calc-coaching></div></fieldset>' +
      '<fieldset class="cf"><legend>Food</legend><div class="opts" data-calc-food></div></fieldset>' +
      '<fieldset class="cf"><legend>Optional add-ons</legend><div class="opts" data-calc-addons></div></fieldset>' +
      '<fieldset class="cf"><legend>Crew size</legend><div class="crew">' +
      '<button type="button" class="step" data-crew-step="-1" aria-label="One fewer person">−</button>' +
      '<label class="crew-num"><span class="vh">Number of people</span><input type="number" inputmode="numeric" min="' + crewMin() + '" max="' + crewMax() + '" step="1" value="' + crewBase() + '" data-crew-input></label>' +
      '<button type="button" class="step" data-crew-step="1" aria-label="One more person">+</button>' +
      '<input type="range" min="' + crewMin() + '" max="' + crewMax() + '" step="1" value="' + crewBase() + '" data-crew-range aria-label="Crew size slider">' +
      '</div><p class="fine">From ' + crewMin() + ' to ' + crewMax() + ' people. Shared costs (the airport boat, the Mid crew boat, permits) are split across the crew. Room prices were found for ' + crewBase() + ', so a different crew size needs new room quotes.</p></fieldset>' +
      '<button type="button" class="btn btn-quiet" data-calc-reset>Reset to the crew\'s plan (' + esc(planShort(rec.id)) + ')</button>' +
      '</form>' +
      // The totals block is built once and updated in place, so its numbers can tween and the dock can watch it.
      '<div class="calc-result" data-calc-result>' +
      '<div class="res-head" data-res-head>' +
      '<p class="res-lbl">Each person ' + chip('estimate') + '</p><p class="res-pp" data-res-pp data-pp-low="" data-pp-high=""></p>' +
      '<p class="res-lbl">Whole crew of <span data-res-crew></span></p><p class="res-group" data-res-group data-group-low="" data-group-high=""></p>' +
      '<p class="res-note" data-res-note></p>' +
      '<p class="res-picks" data-res-picks></p></div>' +
      '<div data-res-warn></div>' +
      '<p class="res-sub">Where the money goes, each ' + chip('estimate') + '</p>' +
      '<p class="res-key">Each subtotal is an estimate, added up from the lines below. Darker bar = low end, lighter = high end.</p>' +
      '<ul class="bars" data-res-bars>' + CATEGORY_ORDER.map(function (c) {
        return '<li class="bar" data-cat="' + esc(c) + '"><div class="bar-top"><span class="bar-name">' + esc(c) + '</span><span class="bar-val"></span></div>' +
          '<span class="bar-track is-new" aria-hidden="true"><span class="bar-hi"></span><span class="bar-lo"></span></span></li>';
      }).join('') + '</ul>' +
      '<div data-res-lines></div>' +
      '</div>' +
      '</div>' +
      '<p class="vh" role="status" data-calc-status></p>' +
      '<div class="calc-dock" data-calc-dock hidden><div class="dock-nums"><p class="dock-note">Estimate with your picks (<span data-dock-plan></span>)</p>' +
      '<p class="dock-row"><span class="dock-lbl">Each</span> <span class="dock-pp" data-dock-pp></span></p>' +
      '<p class="dock-row"><span class="dock-lbl">Crew of <span data-dock-crew></span></span> <span class="dock-group" data-dock-group></span></p></div>' +
      '<button type="button" class="btn btn-solid dock-btn" data-dock-jump>Details</button></div>' +
      '<details class="more-d method"><summary>How the calculator works</summary><p>' + esc(B.method_note) + '</p></details>';
    var root = renderInto('budget', html);
    renderCalcControls(true);
    initCalcDock(root);
    var form = $('[data-calc-form]', root);
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'calc-plan') { setPlan(t.value, 'calc'); return; }
      if (t.name === 'calc-flight') state.flight = t.value;
      else if (t.name === 'calc-coaching') state.coaching = t.value;
      else if (t.name === 'calc-food') state.food = t.value;
      else if (t.hasAttribute('data-addon')) { if (t.checked) state.addons.add(t.value); else state.addons.delete(t.value); }
      else if (t.hasAttribute('data-crew-range') || t.hasAttribute('data-crew-input')) { setCrew(t.value); return; }
      else return;
      emit('calc');
    });
    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-crew-range')) { setCrew(t.value); return; }
      if (t.hasAttribute('data-crew-input')) {
        // Totals follow the typing. A number under the minimum may be the first digit of a bigger one,
        // so it waits for the next digit or for the field to lose focus (then it is clamped).
        var n = Math.round(Number(t.value));
        if (t.value === '' || !isFinite(n) || n < crewMin()) return;
        setCrew(Math.min(n, crewMax()), true);
      }
    });
    form.addEventListener('click', function (e) {
      var s = e.target.closest('[data-crew-step]');
      if (s) {
        if (s.getAttribute('aria-disabled') === 'true') { toast('The calculator goes from ' + crewMin() + ' to ' + crewMax() + ' people'); return; }
        setCrew(state.crew + Number(s.getAttribute('data-crew-step')));
        return;
      }
      if (e.target.closest('[data-calc-reset]')) {
        var d = defaultState();
        var planChanged = state.plan !== d.plan;
        state.plan = d.plan; state.flight = d.flight; state.coaching = d.coaching; state.food = d.food; state.addons = new Set(); state.crew = d.crew;
        store.remove(PLAN_KEY);
        syncPlanInputs();
        emit(planChanged ? 'plan' : 'reset');
        toast('Back to the crew\'s plan: ' + planShort(d.plan) + ' with its default picks');
      }
    });
  }
  function initCalcDock(root) {
    var dock = $('[data-calc-dock]', root), controls = $('[data-calc-form]', root), head = $('[data-res-head]', root), result = $('[data-calc-result]', root);
    if (!dock || !controls || !head) return;
    $('[data-dock-jump]', dock).addEventListener('click', function () {
      result.setAttribute('tabindex', '-1');
      result.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      try { result.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
    });
    if (!('IntersectionObserver' in W)) return;
    var mq = W.matchMedia ? W.matchMedia('(max-width: 999px)') : { matches: true };
    var controlsIn = false, headIn = false;
    // The dock shows whenever you are among the choices and the totals themselves are not fully on screen.
    function sync() {
      var on = !!mq.matches && controlsIn && !headIn;
      dock.hidden = !on;
      document.body.classList.toggle('dock-on', on);
    }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { controlsIn = en.isIntersecting; });
      sync();
    }, { rootMargin: '0px 0px -80px 0px' }).observe(controls);
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { headIn = en.isIntersecting && en.intersectionRatio >= 0.85; });
      sync();
    }, { threshold: [0, 0.5, 0.85, 1] }).observe(head);
    if (mq.addEventListener) mq.addEventListener('change', sync); else if (mq.addListener) mq.addListener(sync);
  }

  // Count-up between the old and new totals (about half a second). data-* attributes carry the exact values at once.
  var tweens = {};
  function tweenRange(el, key, lo, hi) {
    if (!el) return;
    var prev = tweens[key];
    if (prev && prev.raf && W.cancelAnimationFrame) W.cancelAnimationFrame(prev.raf);
    var from = prev ? prev.cur : null;
    var same = from && Math.round(from.lo) === Math.round(lo) && Math.round(from.hi) === Math.round(hi);
    if (!from || same || reduceMotion || document.hidden || !W.requestAnimationFrame) {
      el.textContent = hkd(lo, hi);
      tweens[key] = { cur: { lo: lo, hi: hi } };
      return;
    }
    var st = { cur: { lo: from.lo, hi: from.hi } }, t0 = null, dur = 520;
    tweens[key] = st;
    el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump');
    function step(now) {
      if (t0 === null) t0 = now;
      var k = Math.min(1, (now - t0) / dur), ez = 1 - Math.pow(1 - k, 3);
      st.cur = { lo: from.lo + (lo - from.lo) * ez, hi: from.hi + (hi - from.hi) * ez };
      el.textContent = hkd(st.cur.lo, st.cur.hi);
      if (k < 1) st.raf = W.requestAnimationFrame(step);
      else { st.cur = { lo: lo, hi: hi }; st.raf = 0; el.textContent = hkd(lo, hi); }
    }
    st.raf = W.requestAnimationFrame(step);
  }

  var calcStatusTimer;
  function updateCalcSummary(kind) {
    var r = computeBudget(state);
    tweenRange($('[data-dock-pp]'), 'dock-pp', r.lo, r.hi);
    var gr = $('[data-dock-group]'), cr = $('[data-dock-crew]'), dp = $('[data-dock-plan]');
    if (gr) gr.textContent = hkd(r.groupLo, r.groupHi);
    if (cr) cr.textContent = String(r.crew);
    if (dp) dp.textContent = planShort(state.plan);
    if (kind === 'init') return;
    clearTimeout(calcStatusTimer);
    calcStatusTimer = setTimeout(function () {
      var st = $('[data-calc-status]'), q = computeBudget(state);
      if (st) st.textContent = planShort(q.plan) + ' plan. Each person ' + hkd(q.lo, q.hi) + ', whole crew of ' + q.crew + ' ' + hkd(q.groupLo, q.groupHi) + '. Estimates.';
    }, 600);
  }
  // typing: the value comes from the number field while someone is typing in it, so the field is left alone.
  function setCrew(v, typing) {
    var n = Math.round(Number(v));
    if (v === '' || v == null || !isFinite(n)) n = state.crew;
    n = clampCrew(n);
    var changed = n !== state.crew;
    state.crew = n;
    var inp = $('[data-crew-input]'), rng = $('[data-crew-range]');
    if (inp && !typing) inp.value = n;
    if (rng) rng.value = n;
    syncCrewSteps(n);
    if (changed || !typing) emit('calc');
  }
  function radio(name, value, checked, title, sub, statusHtml) {
    return '<label class="opt"><input type="radio" name="' + name + '" value="' + esc(value) + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="opt-body"><span class="opt-title">' + esc(title) + '</span>' + (sub ? '<span class="opt-sub">' + sub + '</span>' : '') + (statusHtml || '') + '</span></label>';
  }
  function defaultStamp(group, id, plan) {
    return defaultChoice(group, plan) === id ? ' <span class="stamp stamp-sm">' + esc(planShort(plan)) + ' default</span>' : '';
  }
  function renderCalcControls(all) {
    var crew = state.crew, plan = state.plan;
    var r = computeBudget(state);
    if (all) {
      $('[data-calc-plan]').innerHTML = TRIP.plans.map(function (p) {
        var est = computeBudget(stateForPlan(state, p.id));
        return radio('calc-plan', p.id, p.id === plan, planShort(p.id) + ': ' + planDesc(p.id), esc(planRole(p.id)) + ', about <span data-plan-est-calc="' + esc(p.id) + '">' + esc(hkd(est.lo, est.hi)) + '</span> each', chip('estimate'));
      }).join('');
      $$('[data-calc-plan] input').forEach(function (i) { i.setAttribute('data-plan-input', ''); });
      var fl = $('[data-calc-flight]');
      fl.innerHTML = TRIP.flights.options.map(function (o) {
        var s = sumLines(choiceLines('flight', o.id, plan), crew);
        return radio('calc-flight', o.id, o.id === r.eff.flight, o.label, esc(hkd(s[0], s[1])) + ' each, fare plus bag and board costs' + defaultStamp('flight', o.id, plan), flightChips(o, plan));
      }).join('');
    } else {
      $$('[data-calc-flight] input').forEach(function (i) { i.checked = i.value === r.eff.flight; });
      $$('[data-plan-est-calc]').forEach(function (el) {
        var est = computeBudget(stateForPlan(state, el.getAttribute('data-plan-est-calc')));
        el.textContent = hkd(est.lo, est.hi);
      });
    }
    var coachIds = choiceIds('coaching', plan), foodIds = choiceIds('food', plan);
    var addons = TRIP.budget.lines.filter(function (l) { return l.optional && appliesTo(l.plans, plan); });
    var coachSub = function (id) { var s = sumLines(choiceLines('coaching', id, plan), crew); return esc(hkd(s[0], s[1])) + ' each' + defaultStamp('coaching', id, plan); };
    var foodSub = function (id) { var s = sumLines(choiceLines('food', id, plan), crew); return esc(hkd(s[0], s[1])) + ' each, for the ' + tripNights() + '-night trip' + defaultStamp('food', id, plan); };
    var addonSub = function (l) {
      var d = l.basis === 'per_group' ? crew : 1;
      return l.basis === 'per_group' ? esc(hkd(l.low_hkd, l.high_hkd)) + ' for the group, ' + esc(hkd(l.low_hkd / d, l.high_hkd / d)) + ' each' : esc(hkd(l.low_hkd, l.high_hkd)) + ' each';
    };
    if (!all) {
      // Same plan: the options are already there. Only ticks and amounts change, so focus and screen readers stay put.
      var inPlace = function (sel, checkedFn, subFn) {
        $$(sel + ' input').forEach(function (i) {
          i.checked = checkedFn(i.value);
          var sub = i.closest && i.closest('.opt') && $('.opt-sub', i.closest('.opt'));
          var html = subFn(i.value);
          if (sub && sub.innerHTML !== html) sub.innerHTML = html;
        });
      };
      inPlace('[data-calc-coaching]', function (v) { return v === r.eff.coaching; }, coachSub);
      inPlace('[data-calc-food]', function (v) { return v === r.eff.food; }, foodSub);
      inPlace('[data-calc-addons]', function (v) { return state.addons.has(v); }, function (v) {
        return addonSub(TRIP.budget.lines.filter(function (l) { return l.id === v; })[0]);
      });
    } else {
      $('[data-calc-coaching]').innerHTML = coachIds.length ? coachIds.map(function (id) {
        var pk = C_pkg(id), ls = choiceLines('coaching', id, plan);
        return radio('calc-coaching', id, id === r.eff.coaching, pk ? pk.name : id, coachSub(id), chip(ls[0] && ls[0].status));
      }).join('') : '<p class="opt-none">' + esc(planShort(plan)) + ' plan: no coaching package to choose.</p>';
      $('[data-calc-food]').innerHTML = foodIds.length ? foodIds.map(function (id) {
        var ls = choiceLines('food', id, plan);
        return radio('calc-food', id, id === r.eff.food, foodName(id), foodSub(id), chip(ls[0] && ls[0].status));
      }).join('') : '<p class="opt-none">' + esc(planShort(plan)) + ' plan: no food choice.</p>';
      $('[data-calc-addons]').innerHTML = addons.length ? addons.map(function (l) {
        return '<label class="opt opt-check"><input type="checkbox" value="' + esc(l.id) + '" data-addon' + (state.addons.has(l.id) ? ' checked' : '') + '>' +
          '<span class="opt-body"><span class="opt-title">' + esc(l.label) + '</span><span class="opt-sub">' + addonSub(l) + '</span>' + chip(l.status) + '</span></label>';
      }).join('') : '<p class="opt-none">No add-ons for this plan.</p>';
    }
    var inp = $('[data-crew-input]'), rng = $('[data-crew-range]');
    if (inp && document.activeElement !== inp) inp.value = crew;
    if (rng) rng.value = crew;
    syncCrewSteps(crew);
    $$('[data-calc-plan] input').forEach(function (i) { i.checked = i.value === plan; });
    clipList('addons', $('[data-calc-addons]'), 'add-ons', 0, function (el) {
      var box = el.querySelector && el.querySelector('input');
      return !box || box.checked;
    }, { text: function (open, n) { return open ? 'Show fewer add-ons' : 'Show add-ons (' + n + ')'; } });
  }
  // At the smallest or largest crew the matching step button says so (it stays focusable, so focus is never lost).
  function syncCrewSteps(crew) {
    $$('[data-crew-step]').forEach(function (b) {
      var down = Number(b.getAttribute('data-crew-step')) < 0;
      var atLimit = down ? crew <= crewMin() : crew >= crewMax();
      if (atLimit) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    });
  }
  function flightChips(o, plan) {
    // Fare status first; then any other line in this option whose price is less solid than the fare.
    var fareRank = statusRank(o.fare_status), weaker = {};
    choiceLines('flight', o.id, plan).forEach(function (l) {
      if (/fare/.test(l.id) || statusRank(l.status) >= fareRank) return;
      var name = /board/.test(l.id) ? 'board fee' : /bag/.test(l.id) ? 'bag' : /card/.test(l.id) ? 'card fee' : 'extras';
      (weaker[l.status] = weaker[l.status] || []).push(name);
    });
    var out = chipLabeled('Fare', o.fare_status);
    Object.keys(weaker).forEach(function (st) { out += chipLabeled(cap(weaker[st].join(', ')), st); });
    return '<span class="chips">' + out + '</span>';
  }
  function updateFlightSubs() {
    // Flight radios keep focus; refresh only their price text when the crew changes.
    var plan = state.plan, crew = state.crew;
    $$('[data-calc-flight] .opt').forEach(function (lab) {
      var inp = $('input', lab), sub = $('.opt-sub', lab);
      if (!inp || !sub) return;
      var s = sumLines(choiceLines('flight', inp.value, plan), crew);
      sub.innerHTML = esc(hkd(s[0], s[1])) + ' each, fare plus bag and board costs' + defaultStamp('flight', inp.value, plan);
    });
  }
  var barsWatch = false;
  function renderCalcResult() {
    var box = $('[data-calc-result]');
    if (!box) return;
    var r = computeBudget(state);
    var pp = $('[data-res-pp]', box), gp = $('[data-res-group]', box);
    pp.setAttribute('data-pp-low', r.lo.toFixed(2)); pp.setAttribute('data-pp-high', r.hi.toFixed(2));
    gp.setAttribute('data-group-low', r.groupLo.toFixed(2)); gp.setAttribute('data-group-high', r.groupHi.toFixed(2));
    tweenRange(pp, 'res-pp', r.lo, r.hi);
    tweenRange(gp, 'res-group', r.groupLo, r.groupHi);
    $('[data-res-crew]', box).textContent = String(r.crew);
    $('[data-res-note]', box).textContent = 'That is the per-person figure above, times ' + r.crew + ' (worked out before rounding, so a hand check can be a few dollars off).';
    $('[data-res-picks]', box).textContent = cap(picksText(state)) + '.';
    var unpriced = r.unpriced.map(function (l) { return l.label; });
    $('[data-res-warn]', box).innerHTML = unpriced.length ? '<div class="res-warn">' + ICON.hazard + '<div><p><strong>Not priced yet, counted as HKD 0:</strong></p><ul>' + unpriced.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div></div>' : '';
    var maxHi = 0;
    CATEGORY_ORDER.forEach(function (c) { maxHi = Math.max(maxHi, r.cats[c].hi); });
    CATEGORY_ORDER.forEach(function (c) {
      var li = $('.bar[data-cat="' + c + '"]', box);
      if (!li) return;
      var k = r.cats[c];
      var value = !k.n ? 'Not in this selection' : k.hi === 0 ? (k.quote ? 'HKD 0, not priced yet' : (c === 'Coaching' && r.eff.coaching === 'none') ? 'HKD 0, none chosen' : 'HKD 0, included') : hkd(k.lo, k.hi);
      li.setAttribute('data-lo', k.lo.toFixed(2)); li.setAttribute('data-hi', k.hi.toFixed(2));
      $('.bar-val', li).textContent = value;
      var hiEl = $('.bar-hi', li), loEl = $('.bar-lo', li);
      hiEl.style.setProperty('--w', (maxHi ? k.hi / maxHi : 0).toFixed(4));
      loEl.style.setProperty('--w', (maxHi ? k.lo / maxHi : 0).toFixed(4));
    });
    // First paint: bars grow from zero once the result is on screen (instant under reduced motion).
    var fresh = $$('.bar-track.is-new', box);
    if (fresh.length && !barsWatch) {
      barsWatch = true;
      if (reduceMotion || !('IntersectionObserver' in W)) fresh.forEach(function (t) { t.classList.remove('is-new'); });
      else {
        var io = new IntersectionObserver(function (entries) {
          if (entries.some(function (en) { return en.isIntersecting; })) {
            io.disconnect();
            W.requestAnimationFrame(function () { fresh.forEach(function (t) { t.classList.remove('is-new'); }); });
          }
        });
        io.observe($('[data-res-bars]', box));
      }
    }
    var linesBox = $('[data-res-lines]', box);
    var open = $$('details', linesBox).map(function (d) { return d.open; });
    var counted = CATEGORY_ORDER.map(function (c) {
      var rows = r.counted.filter(function (x) { return x.line.category === c; });
      if (!rows.length) return '';
      return '<li class="cl-group"><p class="cl-cat">' + esc(c) + '</p><ul>' + rows.map(function (x) {
        var l = x.line;
        var basis = l.basis === 'per_group' ? esc(hkd(l.low_hkd, l.high_hkd)) + ' for the group, split by ' + r.crew : 'per person';
        return '<li class="cl"><div class="cl-row"><span class="cl-label">' + esc(l.label) + '</span><span class="cl-amt">' + esc(hkd(x.lo, x.hi)) + '</span></div>' +
          '<p class="cl-basis">' + basis + ' ' + chip(l.status) + '</p>' +
          '<details class="more-d"><summary>Working and source</summary>' + richHtml(l.note, true) + srcLink(l.source) + '</details></li>';
      }).join('') + '</ul></li>';
    }).join('');
    linesBox.innerHTML = '<details class="more-d res-lines"' + (open[0] ? ' open' : '') + '><summary>Every line in this total (' + r.counted.length + ')</summary><ul class="cl-list">' + counted + '</ul></details>' +
      '<details class="more-d res-lines"' + (open[open.length - 1] && open.length > 1 ? ' open' : '') + '><summary>Not included in any total</summary>' + list(TRIP.budget.not_included) + '</details>';
  }

  /* --------------------------------------------------------------- prep */
  var store = {
    get: function (k) { try { return W.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { W.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    remove: function (k) { try { W.localStorage.removeItem(k); } catch (e) { /* storage blocked */ } }
  };
  var PACK_KEY = 'maldives-surf-2026:packing:v2';
  var PACK_KEY_V1 = 'maldives-surf-2026:packing:v1';
  var ESSENTIALS = [['entry', 'Entry and visa'], ['taxes', 'Taxes and fees'], ['money', 'Money'], ['connectivity', 'Phone, internet and plugs'], ['health', 'Health and safety'], ['culture', 'Local rules and culture'], ['weather', 'Weather']];
  function packItem(it, gi, ii) {
    // Items carry stable ids in the data; plain strings (older data) fall back to position + text.
    var text = typeof it === 'string' ? it : it.text;
    var legacy = 'p' + gi + '-' + ii + '-' + slug(text).slice(0, 24);
    return { id: typeof it === 'string' ? legacy : it.id, text: text, legacy: legacy };
  }
  function storageWorks() {
    try {
      var k = 'maldives-surf-2026:probe';
      W.localStorage.setItem(k, '1');
      W.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }
  function readTicks(items) {
    var raw = store.get(PACK_KEY), ids = [];
    try { ids = JSON.parse(raw || 'null'); } catch (e) { ids = null; }
    if (Array.isArray(ids)) return ids;
    // One-time move from v1 keys (position + text slug) to the stable ids.
    var old = [];
    try { old = JSON.parse(store.get(PACK_KEY_V1) || '[]'); if (!Array.isArray(old)) old = []; } catch (e) { old = []; }
    ids = items.filter(function (x) { return old.indexOf(x.legacy) !== -1; }).map(function (x) { return x.id; });
    if (old.length) store.set(PACK_KEY, JSON.stringify(ids));
    return ids;
  }
  function renderPrep() {
    var E = TRIP.essentials;
    var groups = E.packing.map(function (g, gi) {
      return { group: g.group, items: g.items.map(function (it, ii) { return packItem(it, gi, ii); }) };
    });
    var allItems = [];
    groups.forEach(function (g) { allItems = allItems.concat(g.items); });
    var ticked = readTicks(allItems);
    var canSave = storageWorks();
    var html = '<div class="prep-grid"><div><h3 class="h-sub">Timeline</h3><ol class="timeline">' + E.todo.map(function (t) {
      return '<li><p class="tl-when">' + esc(t.when) + '</p><p class="tl-task">' + esc(t.task) + '</p>' +
        '<details class="more-d"><summary>Why</summary>' + richHtml(t.why, true) + (safeUrl(t.link) ? srcLink(t.link, 'Link') : '') + '</details></li>';
    }).join('') + '</ol></div>' +
      '<div><h3 class="h-sub">Packing checklist</h3><p class="pack-progress" data-pack-progress aria-live="polite"></p>' +
      '<span class="pack-meter" aria-hidden="true"><span data-pack-meter></span></span>' +
      (canSave ? '' : '<p class="pack-warn" data-pack-warn>Ticks can\'t be saved in this browser (private mode or blocked site data), so they will be gone after a reload. The list still works for this visit.</p>') +
      '<div class="pack" data-pack>' + groups.map(function (g) {
        return '<fieldset class="pack-group"><legend>' + esc(g.group) + '</legend>' + g.items.map(function (it) {
          return '<label class="check"><input type="checkbox" value="' + esc(it.id) + '"' + (ticked.indexOf(it.id) !== -1 ? ' checked' : '') + '><span>' + esc(it.text) + '</span></label>';
        }).join('') + '</fieldset>';
      }).join('') + '</div>' +
      '<div class="pack-tools"><button type="button" class="btn btn-quiet" data-pack-clear>Untick everything</button>' +
      '<p class="pack-undo" data-pack-undo-row hidden><span data-pack-undo-msg></span> <button type="button" class="btn btn-quiet" data-pack-undo>Undo</button></p></div>' +
      '<p class="fine" data-pack-note>' + (canSave ? 'Ticks are saved in this browser only, on this device.' : '') + '</p>' +
      '<h3 class="h-sub">Essentials</h3><div class="accordions">' + ESSENTIALS.map(function (k) {
        return '<details class="acc"><summary>' + esc(k[1]) + ' <span class="acc-n">(' + (E[k[0]] || []).length + ')</span></summary>' + list(E[k[0]]) + '</details>';
      }).join('') + '</div></div></div>';
    var root = renderInto('prep', html);
    clipList('timeline', $('.timeline', root), 'steps', 6);
    var pack = $('[data-pack]', root);
    function checkedIds() {
      return $$('input[type=checkbox]', pack).filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
    }
    function save() {
      var ok = store.set(PACK_KEY, JSON.stringify(checkedIds()));
      if (!ok && !$('[data-pack-warn]', root)) {
        $('[data-pack-progress]', root).insertAdjacentHTML('afterend', '<p class="pack-warn" data-pack-warn>Ticks can\'t be saved in this browser (private mode or blocked site data), so they will be gone after a reload. The list still works for this visit.</p>');
        $('[data-pack-note]', root).textContent = '';
      }
      progress();
    }
    function progress() {
      var all = $$('input[type=checkbox]', pack), on = all.filter(function (i) { return i.checked; }).length;
      $('[data-pack-progress]', root).textContent = on + ' of ' + all.length + ' packed';
      $('[data-pack-meter]', root).style.setProperty('--w', (all.length ? on / all.length : 0).toFixed(4));
    }
    var undoIds = null, undoTimer;
    var undoRow = $('[data-pack-undo-row]', root);
    function hideUndo() { undoIds = null; undoRow.hidden = true; clearTimeout(undoTimer); }
    pack.addEventListener('change', function () { hideUndo(); save(); });
    $('[data-pack-clear]', root).addEventListener('click', function () {
      var before = checkedIds();
      if (!before.length) { toast('Nothing is ticked yet'); return; }
      $$('input[type=checkbox]', pack).forEach(function (i) { i.checked = false; });
      save();
      undoIds = before;
      $('[data-pack-undo-msg]', root).textContent = 'Unticked ' + before.length + (before.length === 1 ? ' item.' : ' items.');
      undoRow.hidden = false;
      clearTimeout(undoTimer);
      undoTimer = setTimeout(hideUndo, 15000);
    });
    $('[data-pack-undo]', root).addEventListener('click', function () {
      if (!undoIds) return;
      var ids = undoIds;
      $$('input[type=checkbox]', pack).forEach(function (i) { i.checked = ids.indexOf(i.value) !== -1; });
      hideUndo();
      save();
      $('[data-pack-clear]', root).focus();
      toast('Ticks restored');
    });
    progress();
  }

  /* ------------------------------------------------------------- sources */
  // The research files group sources by the v2 section names; the page shows them under the v3 section names, in page order.
  var SOURCE_LABELS = {
    'Map overview': 'Map overview', 'Season and weather': '1 Overview: season and weather', 'Budget': '2 Budget overall', 'Flights': '3 Flights',
    'Where to stay': '4 Accommodation', 'Above our budget': '4 Accommodation: above our budget', 'Not available': '4 Accommodation: not available',
    'Surf spots': '5 Surf spots', 'Coaching': '6 Surf coaching', 'Transport': '7 Local transport', 'Activities': '8 Other activities',
    'Food': 'Eat & drink', 'Essentials': 'Before you go'
  };
  var SOURCE_ORDER = Object.keys(SOURCE_LABELS);
  function sourceLabel(g) { return SOURCE_LABELS[g] || g; }
  function relabelUsedFor(t) {
    return String(t || '').replace(/(^|;\s*)([^:;]+?)(?=\s*(?::|;|$))/g, function (m, pre, g) { return pre + (SOURCE_LABELS[g.trim()] ? sourceLabel(g.trim()) : g); });
  }
  function renderSources() {
    var m = TRIP.meta;
    var groups = {};
    TRIP.sources.forEach(function (s) {
      var g = String(s.used_for || 'Other').split(';')[0].split(':')[0].trim();
      (groups[g] = groups[g] || []).push(s);
    });
    var names = Object.keys(groups).sort(function (a, b) {
      var ia = SOURCE_ORDER.indexOf(a), ib = SOURCE_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    var html = '<div class="disclaimer"><p><strong>Prices checked ' + esc(fmtDate(m.prices_checked)) + '.</strong> ' + esc(m.disclaimer) + '</p><p class="fine">' + esc(m.fx.note) + '</p></div>' +
      '<h3 class="h-sub">To confirm before anyone pays (' + TRIP.to_confirm.length + ')</h3>' +
      '<ul class="confirm">' + TRIP.to_confirm.map(function (c) {
        return '<li class="confirm-item">' + ICON.hazard + '<div><p class="confirm-what">' + esc(c.item) + '</p>' +
          '<p class="confirm-meta"><span><strong>Who:</strong> ' + esc(c.who) + '</span><span><strong>By:</strong> ' + esc(c.by_when) + '</span></p>' +
          '<p class="fine">' + esc(c.why) + '</p></div></li>';
      }).join('') + '</ul>' +
      '<h3 class="h-sub">Sources (' + TRIP.sources.length + ')</h3><div class="accordions">' + names.map(function (g) {
        return '<details class="acc"><summary>' + esc(sourceLabel(g)) + ' <span class="acc-n">(' + groups[g].length + ')</span></summary><ul class="src-list">' + groups[g].map(function (s) {
          return '<li>' + srcLink(s.url, s.title) + '<span class="fine">' + esc(relabelUsedFor(s.used_for)) + '</span></li>';
        }).join('') + '</ul></details>';
      }).join('') + '</div>' + photoCreditsHtml();
    var root = renderInto('sources', html);
    clipList('confirm', $('.confirm', root), 'things to confirm', 3);
    clipList('credits', $('.credits', root), 'photo credits', 4);
  }
  // Every photo on the page, in page order, with its licence and source page.
  function photoCreditsHtml() {
    if (!usedPhotos.length) return '';
    return '<h3 class="h-sub" id="photo-credits">Photo credits (' + usedPhotos.length + ')</h3>' +
      '<p class="fine">The photos are shown straight from Wikimedia Commons, Unsplash and Pexels (not copied into this site), under the licence named for each. A caption names a place only where the photo\'s own page does.</p>' +
      '<ul class="credits">' + usedPhotos.map(function (p) {
        return '<li><p class="credit-who">' + esc(p.credit) + '</p><p class="fine">' + esc(captionText(p)) + '</p>' +
          '<p class="credit-links">' + srcLink(p.license_url, 'Licence: ' + p.license) + srcLink(p.source_page, 'Source page') + '</p></li>';
      }).join('') + '</ul>';
  }

  /* ---------------------------------------------------------------- motion */
  // Loops (map-section waves, plate waves, the countdown's seconds) run only while their block is on screen.
  function initLive() {
    var top = $('#top');
    if (top) top.setAttribute('data-live', '');
    var els = $$('[data-live]');
    if (!('IntersectionObserver' in W)) { els.forEach(function (e) { e.classList.add('is-live'); }); cdLive = true; return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle('is-live', en.isIntersecting);
        if (en.target.id === 'countdown') {
          var was = cdLive;
          cdLive = en.isIntersecting;
          if (cdLive && !was) tickCountdown(true);
        }
      });
    }, { rootMargin: '80px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }
  // Cards and plates fade up once as they arrive; cards arriving together are staggered a little.
  var REVEAL = ['.heads > li', '.pick-tile', '.vibe > li', '.expect-item', '.pass', '.leg', '.plan-card', '.prop', '.above', '.package', '.programme > li', '.fb', '.act', '.provider', '.dishes > div'];
  function initReveal() {
    REVEAL.forEach(function (sel) { $$(sel).forEach(function (el) { el.setAttribute('data-reveal', ''); }); });
    var els = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in W)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.setProperty('--rd', Math.min(n, 5) * 80 + 'ms');
        en.target.classList.add('is-in');
        io.unobserve(en.target);
        n += 1;
      });
    }, { rootMargin: '0px', threshold: 0 });
    els.forEach(function (el) { io.observe(el); });
    W.addEventListener('beforeprint', function () { els.forEach(function (el) { el.classList.add('is-in'); }); });
  }
  // If the phone's reduce-motion setting is switched on mid-visit, stop everything straight away.
  function watchReducedMotion() {
    if (!W.matchMedia) return;
    var mq = W.matchMedia('(prefers-reduced-motion: reduce)');
    var sync = function () {
      reduceMotion = !!mq.matches;
      document.documentElement.classList.toggle('motion', !reduceMotion);
      // Maps already on the page follow the setting too (Leaflet reads these options when it animates).
      [ov.M, mod.M].forEach(function (M) {
        if (!M || !M.map) return;
        var o = M.map.options;
        o.zoomAnimation = o.fadeAnimation = o.markerZoomAnimation = !reduceMotion;
        if (reduceMotion) M.map._zoomAnimated = false;
      });
      if (!reduceMotion) return;
      $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
      $$('.bar-track.is-new').forEach(function (t) { t.classList.remove('is-new'); });
      var bar = $('.days-progress');
      if (bar) bar.style.setProperty('--p', '1');
    };
    if (mq.addEventListener) mq.addEventListener('change', sync); else if (mq.addListener) mq.addListener(sync);
  }

  /* ---------------------------------------------------------------- init */
  function safe(fn, name) {
    try { fn(); } catch (e) {
      reportError(name + ': ' + (e && e.message));
      var el = $('[data-render="' + name + '"]');
      if (el && !el.innerHTML) el.innerHTML = '<p class="note">This part of the page could not be shown. Reload to try again.</p>';
    }
  }
  function init() {
    if (!TRIP) {
      var main = $('#main');
      if (main) main.insertAdjacentHTML('afterbegin', '<p class="note">The trip data did not load. Reload the page.</p>');
      return;
    }
    // First visit: the recommended plan. Returning visitor: the plan they last looked at, if it still exists.
    // A plan tapped in the placeholder switcher before this script arrived (slow connections) wins over both.
    var early = $$('input[data-plan-input]').filter(function (i) { return i.checked && !i.hasAttribute('checked') && planById(i.value); })[0];
    if (early) savePlan(early.value);
    state = defaultState(early ? early.value : savedPlan() || recPlan().id);
    document.documentElement.classList.add('js');
    if (!reduceMotion) document.documentElement.classList.add('motion');
    safe(initPhotoFallbacks, 'photo-fallbacks');
    safe(initJumps, 'jumps');
    safe(renderPlanPickers, 'plan-pickers');
    safe(renderNav, 'nav');
    safe(initMenu, 'menu');
    safe(renderShare, 'share');
    safe(renderTop, 'top');
    safe(renderPlates, 'plates');
    // 1 Overview
    safe(renderSeason, 'season');
    safe(renderHeads, 'heads');
    safe(renderKeypoints, 'keypoints');
    safe(renderDecisions, 'decisions');
    safe(renderCrew, 'crew');
    safe(renderVibe, 'vibe');
    // 2 Budget overall
    safe(renderPlanPick, 'plan-pick');
    safe(renderBudget, 'budget');
    // 3 Flights, 4 Accommodation
    safe(renderFlights, 'flights');
    safe(renderStay, 'stay');
    // 5 Surf spots
    safe(renderMapViews, 'map-views');
    safe(renderSpotFilters, 'spot-filters');
    safe(renderSpotList, 'spot-list');
    safe(applySpotFilter, 'spot-filter');
    safe(function () { selectSpot((TRIP.spots.filter(function (s) { return s.crew_pick; })[0] || TRIP.spots[0]).id, 'init'); }, 'spot-select');
    safe(initSheet, 'sheet');
    safe(renderBoatTimes, 'boat-times');
    safe(renderAccessRules, 'access-rules');
    safe(renderTides, 'tides');
    safe(renderRhythm, 'rhythm');
    // 6-8, then the extras
    safe(renderCoaching, 'coaching');
    safe(renderTransport, 'transport');
    safe(renderActivities, 'activities');
    safe(renderFood, 'food');
    safe(renderItinerary, 'itinerary');
    safe(renderPrep, 'prep');
    safe(renderSources, 'sources');

    onChange(function (kind) {
      var ae = document.activeElement;
      var focusSel = null;
      if (ae && ae.tagName === 'INPUT' && ae.closest && ae.closest('[data-calc-form]')) {
        if (ae.hasAttribute('data-addon')) focusSel = '[data-addon][value="' + ae.value + '"]';
        else if (ae.name && ae.type === 'radio') focusSel = 'input[name="' + ae.name + '"][value="' + ae.value + '"]';
      }
      var planish = kind === 'plan' || kind === 'reset' || kind === 'init';
      renderCalcControls(planish);
      updateFlightSubs();
      if (focusSel) { var f = $(focusSel); if (f && f !== document.activeElement) f.focus(); }
      renderCalcResult();
      updateCalcSummary(kind);
      updateEstimateMine();
      updatePlanEstimates();
      updateCoachingPlan();
      updateFoodPlan();
      if (planish) {
        updateItineraryBlocks();
        updateTransportPlan();
        updateStayPlan();
        syncPlanInputs();
        if (kind !== 'init') updateMapsPlan();
      }
    });
    syncPlanInputs();
    emit('init');
    safe(initLive, 'live');
    safe(initReveal, 'reveal');
    safe(watchReducedMotion, 'reduced-motion');
    safe(initOverview, 'ov-lists');
    safe(initModuleMapWhenNear, 'map');
    safe(handleInitialHash, 'hash');
    W.MSTBudget = {
      compute: function () { var r = computeBudget(state); return { low: r.lo, high: r.hi, groupLow: r.groupLo, groupHigh: r.groupHi, crew: r.crew, plan: r.plan, choices: r.eff, lines: r.counted.map(function (c) { return c.line.id; }) }; },
      state: function () { return { plan: state.plan, flight: state.flight, coaching: state.coaching, food: state.food, addons: Array.from(state.addons), crew: state.crew }; },
      defaults: function (planId) { return defaultState(planId); }
    };
    // For QA scripts: the state of the two maps (which view, whether the satellite map or the sketch is showing).
    W.MSTMaps = {
      overview: function () { return { view: ov.view, leaflet: ov.leaflet, built: !!(ov.M && ov.M.ready), card: ov.card, stays: staysForPlan(state.plan).map(function (g) { return g.place.id; }) }; },
      module: function () { return { view: mod.view, started: mod.started, fallback: mod.fallback, built: !!(mod.M && mod.M.ready), selected: selectedSpot }; },
      map: function (which) { var M = which === 'module' ? mod.M : ov.M; return M ? M.map : null; }
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
