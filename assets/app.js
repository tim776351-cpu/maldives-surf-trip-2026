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

  /* Every hard-coded user-facing string on the page, by stable key. The English
     here is the source of truth: plan/i18n/strings.en.json is extracted from it
     (plus the data-i18n keys in index.html), and translators fill the same keys
     in plan/i18n/strings.zh.json. Missing keys fall back to the English below. */
  var UI_EN = {
    "status.text.older price (2025)": "older price (2025)",
    "status.text.published 2026 rate": "published 2026 rate",
    "status.text.estimate": "estimate",
    "status.text.quote needed": "quote needed",
    "status.text.older price (year unknown)": "older price (year unknown)",
    "status.text.older price (about 2014)": "older price (about 2014)",
    "status.text.quote needed (undated agent price)": "quote needed (undated agent price)",
    "level.short.Advanced": "Advanced",
    "level.short.Intermediate": "Intermediate",
    "level.short.Int-Adv": "Int-Adv",
    "level.short.Beginner-Int": "Beginner-Int",
    "level.short.Int-Adv to Advanced/Expert": "Int-Adv to Advanced/Expert",
    "plan.vhRole": ", {role}",
    "photo.captionDot": "{caption}.",
    /* --- language switcher --- */
    "lang.label": "Language",
    "lang.en": "EN",
    "lang.zh": "中文",
    "lang.enFull": "English",
    "lang.zhFull": "繁體中文",
    "lang.toEn": "Switch the page to English",
    "lang.toZh": "Switch the page to Chinese",
    "lang.switchAria": "Language / 語言",
    "lang.unavailable": "The Chinese version is not ready yet.",
    "lang.switchedZh": "Page switched to Chinese.",
    "lang.switchedEn": "Page switched to English.",

    /* --- head, share card --- */
    "meta.title": "Maldives Surf Trip, 1-10 Nov 2026",
    "meta.description": "Crew trip plan for 11 intermediate shortboarders from Hong Kong: North Malé Atoll, Sun 1 - Tue 10 Nov 2026. Opens on a map of the surf spots and where we could stay, then the November surf outlook, the budget (Budget plan, Mid as the upgrade), flights, stays, surf spots, coaching, boats and more. Prices checked 16 Sep 2026.",
    "meta.ogTitle": "Maldives Surf Trip, 1-10 Nov 2026",
    "meta.ogDescription": "Our crew plan for North Malé Atoll: a map of the breaks and the guesthouse options, the November surf outlook, what it costs each of us in HKD (Budget plan, Mid as the upgrade), flights, boats and coaching. Prices checked 16 Sep 2026, estimates to re-check before booking.",
    "meta.ogImageAlt": "A surfer in a yellow rash guard crouched inside a hollow, glassy wave in the Maldives",
    "noscript.text": "This trip plan needs JavaScript to show its content. Turn JavaScript on and reload the page.",
    "skip.toOverview": "Skip the map, go to 1 Overview",

    /* --- top bar, rail, menu, nav --- */
    "bar.sections": "Sections",
    "bar.surfSpots": "Surf spots",
    "bar.planLegend": "Plan",
    "bar.planBudget": "Budget",
    "bar.planBudgetVh": ", the crew's plan",
    "bar.planMid": "Mid",
    "bar.planMidVh": ", optional upgrade",
    "rail.navAria": "Trip navigation",
    "rail.brandName": "Maldives surf trip",
    "rail.brandDates": "Sun 1 to Tue 10 Nov 2026",
    "rail.spotsTitle": "Surf spots",
    "rail.spotsTaglineFallback": "Map, breaks and boat times",
    "rail.spotsTagline": "{n} breaks on a map, boat times",
    "rail.planLegend": "Plan (estimated cost each)",
    "rail.planEst": "{price} each, default picks (estimate)",
    "nav.aria": "Sections",
    "menu.title": "Sections",
    "menu.close": "Close sections menu",
    "menu.estimate": "{plan} ({role}): {price} each, estimate",

    /* --- section names (nav and headings) --- */
    "sec.top": "Map overview",
    "sec.overview": "Overview",
    "sec.overviewH": "Overview: Maldives surfing in 1-10 Nov",
    "sec.budget": "Budget overall",
    "sec.flights": "Flights",
    "sec.stay": "Accommodation",
    "sec.spots": "Surf spots",
    "sec.coaching": "Surf coaching",
    "sec.transport": "Local transport",
    "sec.activities": "Other activities",
    "sec.food": "Eat & drink",
    "sec.itinerary": "Day-by-day plan",
    "sec.prep": "Before you go",
    "sec.sources": "Sources & photo credits",
    "sec.readFirst": "Read this first",
    "sec.plan30": "The plan in 30 seconds",
    "sec.calls": "The calls we made, and the alternatives",
    "sec.crewDates": "Crew and dates",
    "sec.vibe": "The vibe",
    "sec.calc": "Budget calculator",

    /* --- money, dates, shared words --- */
    "money.hkd": "HKD",
    "money.zero": "HKD 0",
    "date.fmt": "{d} {mon} {y}",
    "date.mon.1": "Jan",
    "date.mon.2": "Feb",
    "date.mon.3": "Mar",
    "date.mon.4": "Apr",
    "date.mon.5": "May",
    "date.mon.6": "Jun",
    "date.mon.7": "Jul",
    "date.mon.8": "Aug",
    "date.mon.9": "Sep",
    "date.mon.10": "Oct",
    "date.mon.11": "Nov",
    "date.mon.12": "Dec",
    "words.listSep": ", ",
    "words.listAnd": " and ",
    "common.details": "Details",
    "common.good": "Good",
    "common.watchOut": "Watch out",
    "common.goodBad": "Good and bad",
    "src.source": "Source",
    "src.sourceLower": "source",
    "src.sourceN": "source {n}",
    "tag.crewPick": "Crew pick",
    "error.section": "This part of the page could not be shown. Reload to try again.",
    "error.noData": "The trip data did not load. Reload the page.",

    /* --- price-confidence labels --- */
    "chip.labeled": "{prefix}: {status}",
    "status.legend.live": "live price {date}",
    "status.legend.liveDesc": "Seen on a booking site for our exact dates on {date}.",
    "status.legend.published": "published 2026 rate",
    "status.legend.publishedDesc": "The seller's own 2026 price, not a quote for our dates or group.",
    "status.legend.estimate": "estimate",
    "status.legend.estimateDesc": "Worked out from guides, ranges or scaling. Could move either way.",
    "status.legend.quote": "quote needed",
    "status.legend.quoteDesc": "No usable price yet. HKD 0 here means not priced, not free.",
    "status.legend.older": "older price",
    "status.legend.olderDesc": "From an earlier year or undated. Expect it to be higher now.",

    /* --- map overview (first screen) --- */
    "ov.title": "Maldives surf trip",
    "ov.dates": "Sun 1 to Tue 10 Nov 2026",
    "ov.countdownFallback": "Fly out Sat 31 Oct",
    "ov.flag": "November surf is a gamble. No charter boat or coaching quote yet. Re-check flights and prices.",
    "ov.flagLink": "Read this first",
    "ov.mapAria": "Map overview: the stay options, the surf spots and the airport",
    "ov.cardAria": "Selected place",
    "ov.moveMap": "Move map",
    "ov.doneMoving": "Done moving",
    "ov.showSouth": "Show South Malé too",
    "ov.backNorth": "Back to North Malé",
    "ov.legendAria": "Map key",
    "ov.legendStay": "Stay options (we book one)",
    "ov.legendPick": "Crew pick",
    "ov.legendOther": "Other break",
    "ov.legendAdv": "Advanced",
    "ov.legendResort": "Resort guests only",
    "ov.legendAirport": "Airport",
    "ov.legendBoat": "Boat from Thulusdhoo",
    "ov.vibeIntro": "Reef, boats, sandbanks and local islands. These are other people's photos from around the Maldives: a caption names a place only where the photographer did.",
    "ov.cardClose": "Close this card",
    "ov.tagResort": "Resort guests only",
    "ov.tagBreak": "Surf break",
    "ov.accessLine": "{type}, {level}. Access: {access}.",
    "ov.aboutKm": ", about {km} km {how}",
    "ov.kmPins": "between the map pins",
    "ov.kmLine": "in a straight line",
    "ov.fromBase": "From {base}:",
    "ov.openSpots": "Open in Surf spots",
    "ov.stayKickerOne": "Stay option on the {plan} plan (we book one)",
    "ov.stayKickerMany": "Stay options on the {plan} plan (we book one)",
    "ov.stayPinNote": "The pin is the approx. island location, not the guesthouse address.",
    "ov.stayBoatNote": " The boat times on this map are from {base}, not from {place}.",
    "ov.eachNights": "{price} each, {nights} nights",
    "ov.openStay": "Open in Accommodation",
    "ov.airportKicker": "Where we land",
    "ov.airportFallbackName": "Malé airport",
    "ov.openTransport": "Open in Local transport",
    "ov.listStayH": "Where we could stay on the {plan} plan (we book one)",
    "ov.approxIsland": "{place} (approx. island location)",
    "ov.listPicksH": "Where we surf: the crew picks",
    "ov.fromBaseShort": "From {base}: {boat}",
    "ov.allBreaks": "All {n} breaks in 5 Surf spots",
    "ov.southNote": "{n} of them are in South Malé, an optional day trip by boat.",

    /* --- maps, sketch, credits --- */
    "map.layerSatellite": "Satellite",
    "map.layerMap": "Map",
    "map.creditSatellite": "Satellite tiles: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP and the GIS User Community. Map by Leaflet. Pins are approximate (about 2-3 km) and nudged apart by up to about 3 km where they would overlap; zoomed out, close pins overlap.",
    "map.creditMap": "Map data: OpenStreetMap contributors (openstreetmap.org/copyright), ODbL. Map by Leaflet. Pins are approximate (about 2-3 km) and nudged apart by up to about 3 km where they would overlap; zoomed out, close pins overlap.",
    "map.routeNote": " Dotted lines show the boat trips from Thulusdhoo to the crew picks, not exact routes.",
    "map.sketchCredit": "Sketch drawn to scale from the approximate pin coordinates in our research (about 2-3 km), not from map images. Pins that would overlap are nudged apart by up to about 3 km. Dotted lines show the boat trips from Thulusdhoo to the crew picks, not exact routes.",
    "map.tilesFellBack": " Satellite tiles did not load, so this shows the street map.",
    "map.ovNoLeaflet": "The satellite map could not load on this connection, so this is a to-scale sketch drawn from the pin coordinates. Everything on it is tappable.",
    "map.ovNoStart": "The map could not start in this browser, so this is a to-scale sketch drawn from the pin coordinates.",
    "map.ovNoTiles": "Map images could not load on this connection, so this is a to-scale sketch drawn from the pin coordinates. Everything on it is tappable.",
    "map.modNoLeaflet": "The satellite map could not load on this connection, so this is a to-scale sketch drawn from the pin coordinates. The spot list works as normal.",
    "map.modNoStart": "The map could not start in this browser, so this is a to-scale sketch drawn from the pin coordinates. The spot list works as normal.",
    "map.modNoTiles": "Map images could not load on this connection, so this is a to-scale sketch drawn from the pin coordinates. The spot list works as normal.",
    "map.approxIsland": "approx. island location",
    "map.stayAriaOne": "Stay option on the {plan} plan (we book one): {names}, on {place} (approx. island location)",
    "map.stayAriaMany": "Stay options on the {plan} plan (we book one): {names}, on {place} (approx. island location)",
    "map.airportBoat": "{duration} to {base}",
    "map.airportBoatFallback": "boat to {base}",
    "map.airportAria": "{name}. {boat}.",
    "sketch.aria": "To-scale sketch of {what}, drawn from the pin coordinates",
    "sketch.whatSouth": "the South Malé breaks",
    "sketch.whatAll": "all {n} breaks, the stay options and the airport",
    "sketch.whatNorth": "the North Malé breaks, the stay options and the airport",
    "sketch.north": "N",
    "sketch.kmBar": "{n} km",

    /* --- boat times --- */
    "boat.paddleText": "No boat needed: it breaks off the island",
    "boat.paddleShort": "paddle out, no boat",
    "boat.noText": "Not an option from our base (resort guests only)",
    "boat.noShort": "guests only",
    "boat.timeText": "About {mins} min by boat",
    "boat.timeTextEachWay": "About {mins} min each way by boat",
    "boat.timeShort": "about {mins} min by boat",
    "boat.unknownText": "Boat time not confirmed",
    "boat.unknownShort": "boat time not confirmed",
    "boat.unknownCompact": "time not confirmed",
    "boat.compactTime": "{name} · {mins} min",
    "boat.ariaFrom": "{text} from {base}",
    "boat.ariaUnknown": "Boat time from {base} not confirmed",

    /* --- surf levels, access, regions --- */
    "level.words.Advanced": "Advanced",
    "level.words.Intermediate": "Intermediate",
    "level.words.Int-Adv": "Intermediate to advanced",
    "level.words.Beginner-Int": "Beginner to intermediate",
    "level.words.Int-Adv to Advanced/Expert": "Intermediate-advanced to Advanced/Expert",
    "access.Public": "Public",
    "access.Limited": "Limited",
    "access.Resort guests only": "Resort guests only",
    "region.North Male": "North Malé",
    "region.South Male": "South Malé",

    /* --- read this first --- */
    "heads.gambleTitle": "November surf is a gamble",
    "heads.charterTitle": "No surf charter boat is confirmed for our dates",
    "heads.coachTitle": "Coaching has no quote yet",
    "heads.coachBody": " Every coaching package price below is a wide estimate until 2-3 coaches quote.",
    "heads.flightsTitle": "Flights and prices need a live re-check",
    "heads.flightCheck": "The {airline} fare ({price} each, {status}) is a {date} snapshot, and its flight numbers come from a 1 Nov search, so confirm both when booking. Online bookings take 9 people at most, so book the crew in two groups. ",
    "heads.details": "Details",
    "top.pricesChecked": "Prices checked {date}.",
    "top.pricesBody": " Every price here is a snapshot or an estimate. Re-check it before anyone books or pays. Price cards and calculator lines carry a label that says how solid each price is; prices written into the day plan and notes say it in brackets, and the matching card has the details.",
    "top.legendSummary": "What the price labels mean",

    /* --- 1 Overview: season --- */
    "season.title": "Surfing here in early November",
    "season.kicker": "Season call for 1-10 Nov",
    "season.factWind": "Wind",
    "season.factSwell": "Swell",
    "season.factWater": "Water",
    "season.factAir": "Air",
    "season.factRain": "Rain",
    "season.moreOn": "More on {label}",
    "season.goSpots": "Where to surf: 5 Surf spots",
    "fold.season": "season details",
    "fold.tides": "sunrise, sunset and tides",
    "fold.show": "Show {label}",
    "fold.hide": "Hide {label}",

    /* --- crew and countdown --- */
    "crew.inMaldives": "In the Maldives",
    "crew.datesNights": "Sun 1 to Tue 10 Nov 2026, {n} nights",
    "crew.flyOut": "Fly out",
    "crew.flyOutVal": "{date}, {flight} leaves Hong Kong at {time}",
    "crew.flyHome": "Fly home",
    "crew.flyHomeVal": "{date}, {flight} leaves Malé at {dep}; lands in Hong Kong Wed 11 Nov at {arr}",
    "crew.flightNote": "Flight times follow our recommended {flights} flights; see 3 Flights.",
    "crew.countdownLabel": "Until the flight leaves Hong Kong",
    "crew.countdownFlight": "{flight} leaves Hong Kong {date} at {time} (HK time)",
    "cd.daysToGo": "{n} days to go",
    "cd.today": "Flying out today",
    "cd.away": "The crew is away",
    "cd.done": "Trip done",
    "cd.day": "day",
    "cd.days": "days",
    "cd.hour": "hour",
    "cd.hours": "hours",
    "cd.min": "min",
    "cd.sec": "sec",
    "cd.aria": "{d} days, {h} hours and {m} minutes to go",
    "cd.labelDuring": "Trip in progress",
    "cd.labelAfter": "Welcome home",

    /* --- plans --- */
    "plan.roleCrew": "The crew's plan",
    "plan.roleUpgrade": "Optional upgrade",
    "plan.roleAlt": "Alternative",
    "plan.recRole": "The crew's plan (organiser's pick)",
    "plan.eachWithFlights": "each, with flights ",
    "plan.crewOf": "Crew of {n}: {price}",
    "plan.defaultPicks": "Default picks: {picks}.",
    "plan.moreThan": "{delta} more each than {plan} (estimate).",
    "plan.changeInCalc": "Change the picks in the calculator",
    "plan.aboveLink": "An all-in surf resort: checked, above our budget",
    "plan.show": "Show this plan",
    "plan.showing": "Showing this plan",
    "plan.tileShow": "Show this plan on the page",
    "plan.tileShowing": "The page is showing this plan",
    "plan.planSuffix": "{plan} plan",
    "picks.noCoaching": "no coaching",
    "picks.coaching": "{name} coaching",
    "picks.food": "{name} food",
    "picks.noAddons": "no add-ons",
    "picks.addonOne": "{n} add-on",
    "picks.addonMany": "{n} add-ons",
    "picks.crewOf": "crew of {n}",
    "decisions.alts": "Alternatives",

    /* --- toasts --- */
    "toast.planSwitched": "{plan} ({role}): about {price} each, estimate",

    /* --- 5 Surf spots --- */
    "spots.lede": "All {n} breaks our research found in North and South Malé, on one map. The crew picks are {picks}. Boat times are as the guides give them from {base}. Tap a pin or a card for the details.",
    "spots.mapAria": "Map of the surf spots",
    "spots.viewAria": "Map view",
    "spots.viewNorth": "Near our base",
    "spots.viewAll": "All {n} spots",
    "spots.viewSouth": "South Malé",
    "spots.hintOne": "The spot that matches is not in this map view.",
    "spots.hintMany": "The {n} spots that match are not in this map view.",
    "spots.hintShowAll": "Show every spot on the map",
    "spots.sheetClose": "Close the spot details",
    "spots.moveMap": "Move the map",
    "spots.doneMovingMap": "Done moving the map",
    "spots.countAll": "All {n} spots",
    "spots.countSome": "{n} of {total} spots match{extra}",
    "spots.countNoneInView": " (none of them in this map view)",
    "spots.countNone": "No spots match these filters. Clear a filter to see more.",
    "spots.crewPickSuffix": ", crew pick",
    "spots.statusDetail": "{name}{pick}. Details {where}",
    "spots.detailsSide": "in the panel at the side of the screen.",
    "spots.detailsBottom": "in the panel at the bottom of the screen.",
    "spots.detailsUnder": "under the map.",
    "spots.aria": "{name}{pick}, {level}, {access} access. {boat}.",
    "spots.levelAria": "Level: {level}",
    "filters.crewOnly": "Crew picks only",
    "filters.regionAria": "Region",
    "filters.allRegions": "All regions",
    "filters.level": "Level",
    "filters.allLevels": "All levels",
    "filters.access": "Access",
    "filters.anyAccess": "Any access",
    "filters.clear": "Clear filters",
    "filters.levelKey": "Levels are as the surf guides rate them. Int-Adv means intermediate to advanced; Beginner-Int means beginner to intermediate.",
    "spot.wave": "Wave",
    "spot.level": "Level",
    "spot.levelVal": "{level}. {note}",
    "spot.access": "Access",
    "spot.accessVal": "{access}. {note}",
    "spot.fromBase": "From {base}",
    "spot.hazards": "Hazards",
    "spot.november": "In November",
    "spot.bestSwell": "Best swell",
    "spot.bestWind": "Best wind",
    "spot.bestTide": "Best tide",
    "spot.mapPin": "Map pin",
    "spot.mapPinVal": "{lat}, {lon} ({note})",
    "spot.moreSummary": "Swell, wind, tide and sources",
    "spot.sourcesLbl": "Sources",
    "spot.regionNear": "{region}, near {island}",
    "spot.meta": "{type}, {region}",
    "spot.showOnMap": "Show on the map",
    "spots.boatTimesTitle": "Boat times from Thulusdhoo",
    "spots.boatIntro": "From {base}, as the surf guides give it. Guides differ, so ask the boat crew; prices per trip are in 7 Local transport. Distances are straight lines.",
    "spots.aboutKm": "about {km} km",
    "spots.betweenPins": " (between the map pins)",
    "spots.accessTitle": "Who can surf where",

    /* --- surf levels, access, regions --- */
    "access.publicH": "Open to anyone who gets there",
    "access.publicIntro": "Listed as public access in our sources. ",
    "access.publicPaddleOne": "{names} is a paddle from {base}; the rest need a boat.",
    "access.publicPaddleMany": "{names} are a paddle from {base}; the rest need a boat.",
    "access.publicAllBoat": "All of them need a boat.",
    "access.limitedH": "Access not confirmed",
    "access.limitedBody": "They break in front of or near a resort, and whether people who are not guests may surf them is not confirmed. Check before planning a day there.",
    "access.resortH": "Resort guests only",
    "access.resortBody": "Only guests on that resort's surf package can surf them, so they are not an option from our base.",

    /* --- 5 Surf spots --- */
    "spots.tidesTitle": "Light and tides, 1 to 10 Nov",
    "tides.below": " Below: sunrise, sunset and a tide outlook worked out from moon phases.",
    "tides.moreSummary": "What we know about the tides",
    "tides.tableAria": "Sunrise, sunset and tide outlook table",
    "tides.day": "Day",
    "tides.sunrise": "Sunrise",
    "tides.sunset": "Sunset",
    "tides.outlook": "Tide outlook (estimate, from moon phases)",
    "tides.about": "about {t}",
    "tides.fine": "Exact sunrise and sunset times are for 1 and 10 Nov; the days between are within a minute of them. Times are Maldives time (HK time minus 3 hours).",
    "spots.rhythmTitle": "A surf day, hour by hour",

    /* --- clipped lists ("Show all N ...") --- */
    "clip.showAll": "Show all {n} {noun}",
    "clip.showFewer": "Show fewer {noun}",
    "clip.noun.spots": "spots",
    "clip.noun.rhythm": "steps of the day",
    "clip.noun.flights": "flight options",
    "clip.noun.bookingTips": "booking tips",
    "clip.noun.notes": "notes",
    "clip.noun.legs": "journeys",
    "clip.noun.props": "places to stay",
    "clip.noun.notAvailable": "checked options",
    "clip.noun.days": "days",
    "clip.noun.coaches": "coaches",
    "clip.noun.places": "places",
    "clip.noun.dishes": "dishes",
    "clip.noun.ideas": "ideas",
    "clip.noun.steps": "steps",
    "clip.noun.confirm": "things to confirm",
    "clip.noun.credits": "photo credits",
    "clip.programmeShow": "Show the {n}-day programme",
    "clip.programmeHide": "Hide the programme",
    "clip.addonsShow": "Show add-ons ({n})",
    "clip.addonsFewer": "Show fewer add-ons",

    /* --- share --- */
    "share.title": "Share the plan with the crew",
    "share.blurb": "One link for everyone. No login, no ads, no analytics.",
    "share.text": "Maldives surf trip plan, 1-10 Nov 2026: {url}",
    "share.copy": "Copy link",
    "share.whatsapp": "Share on WhatsApp",

    /* --- toasts --- */
    "toast.copied": "Link copied. Paste it in the crew chat.",
    "toast.copyFailed": "Copy did not work here. Copy the address bar instead.",

    /* --- photo gallery --- */
    "vibe.aria": "Photo gallery",
    "vibe.ariaScroll": "Photo gallery, scrolls sideways",
    "vibe.hint": "Swipe sideways for more photos.",
    "photo.credit": "{credit}, {license}",

    /* --- 3 Flights --- */
    "flights.dirOut": "Out",
    "flights.dirHome": "Home",
    "flights.via": "via {list}",
    "flights.routeMeta": "{flights}. Total {duration}.",
    "flights.timeUnknown": "time not listed",
    "flights.ourPick": "Our pick",
    "flights.fareLbl": "Return fare, each",
    "flights.boardLbl": "Board bag, each",
    "flights.boardFree": "HKD 0 inside the allowance",
    "flights.confirmWriting": "Confirm in writing",
    "flights.boardRules": "Board rules",
    "flights.fareSearch": "Fare search (Google Flights)",
    "flights.bookingTips": "Booking tips",
    "flights.taxes": "Taxes",
    "flights.sources": "Flight sources ({n})",
    "flights.chipFare": "Fare",
    "flights.chipBoard": "board fee",
    "flights.chipBag": "bag",
    "flights.chipCard": "card fee",
    "flights.chipExtras": "extras",
    "flights.recName": "{airline} ({out} out, {home} home)",
    "flights.recFallback": "recommended",

    /* --- 7 Local transport --- */
    "per.boat": "per boat",
    "per.person": "per person",
    "per.group": "for the group",
    "transport.dailyTitle": "Daily surf boats",
    "transport.perSession": "each, per session",
    "transport.forTrip": "each, for the trip",
    "transport.addsUp": "How this adds up",
    "transport.bothPlans": "Both plans use this",
    "transport.everyPlan": "Every plan uses this",

    /* --- 4 Accommodation --- */
    "stay.planShort": "{plan} plan",
    "stay.stampCrew": "Crew's plan",
    "stay.stayEach": "Stay, each, {nights} nights",
    "stay.wholeTrip": "Whole trip, each, with the calculator picks",
    "stay.covers": "What the price covers",
    "stay.included": "Included",
    "stay.notIncluded": "Not included",
    "stay.figureNote": "This figure: {status}. The package as a whole: ",
    "stay.placesTitle": "Places to stay",
    "stay.placesOnPlan": "Places to stay on the {plan} plan",
    "stay.placesHint": "Room prices were found for a crew of {crew}: group totals cover all {crew} for {nights} nights, and the price each is that total divided by {crew}. Change the plan to see the {other} places.",
    "stay.otherPlan": "other plan's",
    "stay.otherPlans": "other plans'",
    "stay.roomsFor": "Rooms for {n}",
    "stay.meals": "Meals",
    "stay.taxes": "Taxes",
    "stay.cancelling": "Cancelling",
    "stay.rating": "Rating",
    "stay.availability": "Availability",
    "stay.eachNights": "each, {nights} nights",
    "stay.forGroup": "{price} for the group",
    "stay.cancellingLbl": "Cancelling:",
    "stay.roomsSummary": "Rooms, meals, taxes and availability",
    "stay.seeListing": "See the listing",
    "stay.seeIsland": "See the island on the map",
    "stay.naTitle": "Checked, and not available for 1-10 Nov",

    /* --- Book it: the booking and enquiry links, wherever the data carries one --- */
    "book.sumTitle": "Book it",
    "book.sumDeadline": "Earliest free cancellation deadline: {date}, on {name}.",
    "book.sumNoneFlights": "No free-cancellation date is recorded for these fares, so read the airline's own conditions before you pay.",
    "book.sumChecked": "{n} booking links below, all checked on {date}. Prices change, so open a link to see today's price.",
    "book.stayBtn": "Book on {provider}",
    "book.flightBtn": "Open this flight on {provider}",
    "book.enquireBtn": "Enquire with {provider}",
    "book.inlineBook": "Book on {provider}",
    "book.inlineEnquire": "Enquire with {provider}",
    "book.newTab": "opens in a new tab",
    "book.priceSeen": "Price seen: {price}",
    "book.cancelBy": "Free cancellation before {date}",
    "book.checked": "Checked {date}. Prices change, so check the price on the site before you pay.",
    "book.pricesChange": "Prices change, so check the price on the site before you pay.",
    "book.unverified": "This link did not answer when we checked it, so it may have moved.",

    "above.title": "Considered, above our budget",
    "above.eachBefore": "{price} each, before flights",
    "above.moreSummary": "Other reasons, and what the package covers",

    /* --- 6 Surf coaching --- */
    "coach.realityCheck": "Reality check.",
    "coach.realityMore": "The rest of the reality check",
    "coach.packagesBoth": "Coaching packages (both plans)",
    "coach.packagesEvery": "Coaching packages (every plan)",
    "coach.howPriced": "How it is priced",
    "coach.programmeTitle": "The 8-day coaching programme",
    "coach.focus": "Focus:",
    "coach.where": "Where:",
    "coach.drills": "Drills",
    "coach.whoTitle": "Who could coach us",
    "coach.openGroup": "Open to a guesthouse crew",
    "coach.guestsGroup": "Only for their own guests or package buyers",
    "coach.groupCount": "{label} ({n})",
    "coach.filmsTag": "Films sessions",
    "coach.guestsTag": "Guests only",
    "coach.noStayTag": "No stay needed",
    "coach.offer": "What they offer",
    "coach.planCounts": "On the {plan} the budget calculator counts {pkg}{dflt}. Change it in the budget calculator.",
    "coach.planDefault": " (this plan's default)",
    "coach.planNone": "On the {plan} these packages do not apply. What the budget counts instead:",

    /* --- Eat & drink --- */
    "food.alcoholTitle": "Alcohol rules.",
    "food.moreRules": "More drink rules ({n})",
    "food.budgetTitle": "Daily food budget",
    "food.perDay": "each, per day",
    "food.howWorked": "How this is worked out",
    "food.whereTitle": "Where to eat",
    "food.islandAria": "Island",
    "food.everywhere": "Everywhere",
    "food.topOnly": "Top picks only",
    "food.topPick": "Top pick",
    "food.noPrice": "Price not checked",
    "food.eachPrice": "{price} each",
    "food.order": "Order:",
    "food.meta": "{island}, {cuisine}",
    "food.dishesTitle": "Dishes to try",
    "food.noneMatch": "No places match. Pick another island.",
    "food.countAll": "{n} places",
    "food.countSome": "{n} of {total} places match",
    "food.planCounts": "On the {plan} the calculator counts: ",
    "food.planLine": "{label}, {price} each ",
    "food.noLine": "no food line.",
    "food.islandResortFilter": "Resort day passes",
    "food.islandResort": "Resort (day pass)",
    "food.island.Thulusdhoo": "Thulusdhoo",
    "food.island.Male": "Malé",
    "food.island.Hulhumale": "Hulhumalé",
    "food.short.budget": "Budget",
    "food.short.mid": "Cafés plus two nicer dinners",
    "food.short.nicer": "Nicer restaurants every day",
    "food.short.resort-day-pass": "Resort day pass (one day; included once in the Mid plan)",

    /* --- 8 Other activities --- */
    "act.ideasTitle": "Ideas for the rest of the day",
    "act.bestForAria": "Best for",
    "act.everything": "Everything",
    "act.for.flat day": "Flat day",
    "act.for.rest afternoon": "Rest afternoon",
    "act.for.evening": "Evening",
    "act.for.not this trip": "Not this trip",
    "act.for.last day": "Last day",
    "act.free": "Free",
    "act.eachPrice": "{price} each",
    "act.meta": "{where}. {duration}.",
    "act.seasonTax": "Season and tax notes",
    "act.countAll": "{n} ideas",
    "act.countSome": "{n} of {total} ideas match",

    /* --- Day-by-day plan --- */
    "itin.showBoth": "Show both plans' times for each day",
    "itin.showEvery": "Show every plan's times for each day",
    "itin.openAll": "Open all days",
    "itin.closeAll": "Close all days",
    "itin.surf": "Surf:",
    "itin.flat": "If it is flat or windy:",
    "itin.tide": "Tide:",
    "itin.kindFlex": "Flex day",
    "itin.kindBuffer": "Buffer day",
    "itin.kindSurf": "Surf day",
    "itin.kindSurfFly": "Surf, then fly",
    "itin.kindArrive": "Arrive",
    "itin.kindTravel": "Travel",
    "itin.planTag": "{plans} plan",
    "itin.planNote": "Showing the {plan} ({role}). Times marked with a plan name only apply to that plan; change the plan in the top bar (phones) or the side panel (desktop) to compare. Travel times follow our recommended {flights} flights, whichever flight you pick in the budget calculator.",
    "itin.planNoteStrong": "{plan} plan",

    /* --- 2 Budget overall: the calculator --- */
    "budget.lede": "Pick a plan, a flight, coaching, food style and extras. The totals are per person, and group totals are that times the crew size. It opens on {plan}, the crew's plan. Prices checked {date}; all are estimates to re-check before booking.",
    "budget.legPlan": "Plan",
    "budget.legFlight": "Flight",
    "budget.legCoaching": "Coaching",
    "budget.legFood": "Food",
    "budget.legAddons": "Optional add-ons",
    "budget.legCrew": "Crew size",
    "budget.planNote": "Changing the plan loads that plan's own flight, coaching and food picks. Add-ons and crew size stay.",
    "budget.stepDown": "One fewer person",
    "budget.stepUp": "One more person",
    "budget.numPeople": "Number of people",
    "budget.crewSlider": "Crew size slider",
    "budget.crewFine": "From {min} to {max} people. Shared costs (the airport boat, the Mid crew boat, permits) are split across the crew. Room prices were found for {base}, so a different crew size needs new room quotes.",
    "budget.reset": "Reset to the crew's plan ({plan})",
    "budget.eachPerson": "Each person ",
    "budget.wholeCrew": "Whole crew of ",
    "budget.whereMoney": "Where the money goes, each ",
    "budget.barsKey": "Each subtotal is an estimate, added up from the lines below. Darker bar = low end, lighter = high end.",
    "budget.resNote": "That is the per-person figure above, times {n} (worked out before rounding, so a hand check can be a few dollars off).",
    "budget.notPriced": "Not priced yet, counted as HKD 0:",
    "budget.barNone": "Not in this selection",
    "budget.barZeroQuote": "HKD 0, not priced yet",
    "budget.barZeroNone": "HKD 0, none chosen",
    "budget.barZeroIncl": "HKD 0, included",
    "budget.everyLine": "Every line in this total ({n})",
    "budget.notInTotal": "Not included in any total",
    "budget.lineGroup": "{price} for the group, split by {n}",
    "budget.linePerPerson": "per person",
    "budget.working": "Working and source",
    "budget.howWorks": "How the calculator works",
    "budget.dockNote": "Estimate with your picks ({plan})",
    "budget.dockEach": "Each",
    "budget.dockCrewOf": "Crew of {n}",
    "budget.statusLine": "{plan} plan. Each person {pp}, whole crew of {n} {group}. Estimates.",
    "budget.yourPicks": "Your picks in the calculator ({plan}): {price} each (estimate).",
    "budget.optPlanTitle": "{plan}: {desc}",
    "budget.optPlanSub": "{role}, about {price} each",
    "budget.optFlightSub": "{price} each, fare plus bag and board costs",
    "budget.optEach": "{price} each",
    "budget.optFoodSub": "{price} each, for the {nights}-night trip",
    "budget.optAddonGroup": "{group} for the group, {each} each",
    "budget.noCoachOpt": "{plan} plan: no coaching package to choose.",
    "budget.noFoodOpt": "{plan} plan: no food choice.",
    "budget.noAddons": "No add-ons for this plan.",
    "budget.planDefault": "{plan} default",
    "budget.each": " each",
    "budget.forGroup": " for the group",

    /* --- toasts --- */
    "toast.crewRange": "The calculator goes from {min} to {max} people",
    "toast.reset": "Back to the crew's plan: {plan} with its default picks",

    /* --- 2 Budget overall: the calculator --- */
    "cat.Flights": "Flights",
    "cat.Stay": "Stay",
    "cat.Transfers": "Transfers",
    "cat.Surf boats": "Surf boats",
    "cat.Coaching": "Coaching",
    "cat.Food": "Food",
    "cat.Activities": "Activities",
    "cat.Other": "Other",

    /* --- Before you go --- */
    "prep.timeline": "Timeline",
    "prep.why": "Why",
    "prep.link": "Link",
    "prep.packTitle": "Packing checklist",
    "prep.packWarn": "Ticks can't be saved in this browser (private mode or blocked site data), so they will be gone after a reload. The list still works for this visit.",
    "prep.untick": "Untick everything",
    "prep.undo": "Undo",
    "prep.packNote": "Ticks are saved in this browser only, on this device.",
    "prep.packed": "{n} of {total} packed",
    "prep.untickedOne": "Unticked {n} item.",
    "prep.untickedMany": "Unticked {n} items.",
    "prep.essentials": "Essentials",
    "prep.entry": "Entry and visa",
    "prep.taxes": "Taxes and fees",
    "prep.money": "Money",
    "prep.connectivity": "Phone, internet and plugs",
    "prep.health": "Health and safety",
    "prep.culture": "Local rules and culture",
    "prep.weather": "Weather",
    "prep.accSummary": "{label} ({n})",

    /* --- toasts --- */
    "toast.nothingTicked": "Nothing is ticked yet",
    "toast.ticksRestored": "Ticks restored",

    /* --- Sources & photo credits --- */
    "sources.confirmTitle": "To confirm before anyone pays ({n})",
    "sources.who": "Who:",
    "sources.by": "By:",
    "sources.title": "Sources ({n})",
    "sources.photoTitle": "Photo credits ({n})",
    "sources.photoNote": "The photos are shown straight from Wikimedia Commons, Unsplash and Pexels (not copied into this site), under the licence named for each. A caption names a place only where the photo's own page does.",
    "sources.licence": "Licence: {license}",
    "sources.sourcePage": "Source page",
    "srcGroup.Map overview": "Map overview",
    "srcGroup.Season and weather": "1 Overview: season and weather",
    "srcGroup.Budget": "2 Budget overall",
    "srcGroup.Flights": "3 Flights",
    "srcGroup.Where to stay": "4 Accommodation",
    "srcGroup.Above our budget": "4 Accommodation: above our budget",
    "srcGroup.Not available": "4 Accommodation: not available",
    "srcGroup.Surf spots": "5 Surf spots",
    "srcGroup.Coaching": "6 Surf coaching",
    "srcGroup.Transport": "7 Local transport",
    "srcGroup.Activities": "8 Other activities",
    "srcGroup.Food": "Eat & drink",
    "srcGroup.Essentials": "Before you go"
  };

  /* ================================================================== i18n
     English is the source of truth and always ships complete. Traditional
     Chinese (Hong Kong) arrives as an overlay in assets/i18n-zh.js
     (window.TRIP_I18N_ZH), loaded after data.js:
       { data: { "<json path>": "…" }, ui: { "<key>": "…" }, meta: {...} }
     Data strings resolve by their JSON path in plan/trip-data.json
     ("spots[3].november_note"); hard-coded UI strings resolve by a stable key
     ("spots.countAll"). Anything missing falls back to the English source, so a
     half-finished or absent overlay can never blank the page. */
  var LANG_KEY = 'maldives-surf-2026:lang';
  var HTML_LANG = { en: 'en-GB', zh: 'zh-Hant-HK' };
  var lang = 'en';
  var ZH = W.TRIP_I18N_ZH && typeof W.TRIP_I18N_ZH === 'object' ? W.TRIP_I18N_ZH : null;
  var ZH_DATA = (ZH && typeof ZH.data === 'object' && ZH.data) || {};
  var ZH_UI = (ZH && typeof ZH.ui === 'object' && ZH.ui) || {};
  function countKeys(o) { var n = 0, k; for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) n++; return n; }
  var ZH_READY = !!ZH && (countKeys(ZH_DATA) + countKeys(ZH_UI)) > 0;
  function langReady(l) { return l === 'en' || (l === 'zh' && ZH_READY); }
  function htmlLangFor(l) {
    if (l === 'zh' && ZH && ZH.meta && typeof ZH.meta.htmlLang === 'string' && ZH.meta.htmlLang) return ZH.meta.htmlLang;
    return HTML_LANG[l] || HTML_LANG.en;
  }
  // Every object and array in the data is tagged, once, with its JSON path, so
  // any string can be looked up by path without copying the data itself.
  function tagPaths(o, p) {
    if (!o || typeof o !== 'object') return;
    try { Object.defineProperty(o, '__p', { value: p, enumerable: false, configurable: true, writable: true }); }
    catch (e) { return; }
    var i, k;
    if (Object.prototype.toString.call(o) === '[object Array]') {
      for (i = 0; i < o.length; i++) tagPaths(o[i], p + '[' + i + ']');
      return;
    }
    for (k in o) if (Object.prototype.hasOwnProperty.call(o, k) && k !== '__p') tagPaths(o[k], p ? p + '.' + k : k);
  }
  tagPaths(TRIP, '');
  tagPaths(W.TRIP_PHOTOS && W.TRIP_PHOTOS.photos, 'photos');

  function zhAt(path) {
    if (lang !== 'zh') return null;
    var v = ZH_DATA[path];
    return typeof v === 'string' && v ? v : null;
  }
  // tx(obj, field): that field's text in the reader's language, English if untranslated.
  // Logic that parses the data (statuses, levels, boat times, filters) keeps reading obj[field].
  function tx(obj, field) {
    var en = obj ? obj[field] : '';
    if (lang === 'en' || !obj || !obj.__p) return en;
    return zhAt(obj.__p + '.' + field) || en;
  }
  // txi(arr, i) / txs(arr): elements of an array of strings.
  function txi(arr, i) {
    var en = arr ? arr[i] : '';
    if (lang === 'en' || !arr || !arr.__p) return en;
    return zhAt(arr.__p + '[' + i + ']') || en;
  }
  function txs(arr) {
    if (!arr) return [];
    return arr.map(function (v, i) { return txi(arr, i); });
  }
  function isTranslated(obj, field) { return !!(obj && obj.__p && zhAt(obj.__p + '.' + field)); }
  // T(key): a hard-coded UI string. Tv adds {name} placeholders.
  function T(key) {
    if (lang === 'zh') { var v = ZH_UI[key]; if (typeof v === 'string' && v) return v; }
    var e = UI_EN[key];
    return typeof e === 'string' ? e : '';
  }
  function Tv(key, vars) {
    return T(key).replace(/\{(\w+)\}/g, function (m, k) {
      return vars && vars[k] != null ? String(vars[k]) : m;
    });
  }
  function Te(key) { return esc(T(key)); }
  // Tv for a template with HTML in some slots: the words are escaped, the markup is spliced in after.
  function Th(key, vars, htmlVars) {
    var out = esc(Tv(key, vars)), k;
    for (k in htmlVars) if (Object.prototype.hasOwnProperty.call(htmlVars, k)) out = out.replace('{' + k + '}', htmlVars[k]);
    return out;
  }
  function Tve(key, vars) { return esc(Tv(key, vars)); }

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
    var c = T('money.hkd') + ' ';
    return a === b ? c + fmt(a) : c + fmt(a) + '–' + fmt(b);
  }
  // Difference between two rounded totals, so it matches the totals shown next to it.
  function hkdDelta(a, b) { return hkd(Math.round(a.lo) - Math.round(b.lo), Math.round(a.hi) - Math.round(b.hi)); }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48); }
  function sentences(text) {
    var out = [], re = /[.!?]\)?\s+(?=[A-Z0-9])|[\u3002\uff01\uff1f][\u300d\u300f\uff09\u3011]?/g, last = 0, m;
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
    return Tv('date.fmt', { d: d.getUTCDate(), mon: T('date.mon.' + (d.getUTCMonth() + 1)), y: d.getUTCFullYear() });
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
  function chip(status, statusEn) {
    if (!status) return '';
    return '<span class="status status--' + statusKind(statusEn || status) + '">' + esc(cap(status)) + '</span>';
  }
  // A status that comes from the data: shown in the reader's language, classed by the English.
  function chipT(obj, field) { return obj && obj[field] ? chip(tx(obj, field), obj[field]) : ''; }
  // A status parsed out of a longer data sentence gets its own UI key, so the words can
  // be translated while the chip's colour still follows the English status.
  function chipParsed(obj, field) {
    var en = parseStatus(obj[field]);
    return chip(T('status.text.' + en) || en, en);
  }
  function parseStatus(text, fallback) {
    var m = /status:\s*([^.;]+)/i.exec(text || '');
    return m ? m[1].trim() : (fallback || 'estimate');
  }
  var STATUS_KINDS = ['live', 'published', 'estimate', 'quote', 'older'];
  function statusLegend() {
    // The "live price" row carries the date the prices were re-checked: read it from the
    // data (meta.prices_checked) so the legend can never drift behind the chips again.
    var iso = (TRIP && TRIP.meta && TRIP.meta.prices_checked) || '';
    var checked = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? fmtDate(iso) : '';
    var leg = function (k) { return Tv('status.legend.' + k, { date: checked }).replace(/\s+([.,])/g, '$1').trim(); };
    return '<dl class="legend">' + STATUS_KINDS.map(function (k) {
      return '<div><dt><span class="status status--' + k + '">' + esc(cap(leg(k))) + '</span></dt>' +
        '<dd>' + esc(leg(k + 'Desc')) + '</dd></div>';
    }).join('') + '</dl>';
  }
  function srcLink(url, label) {
    var u = safeUrl(url);
    if (!u) return '';
    return '<a class="src" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(label || T('src.source')) + '</a>';
  }
  // Weakest first: a total is only as solid as its weakest line.
  var STATUS_RANK = { none: 0, quote: 0, older: 1, estimate: 2, published: 3, live: 4 };
  function statusRank(s) { return STATUS_RANK[statusKind(s)]; }
  function chipLabeled(prefix, status, text) {
    if (!status) return '';
    return '<span class="status status--' + statusKind(status) + '">' +
      esc(Tv('chip.labeled', { prefix: prefix, status: text || status })) + '</span>';
  }
  function shortHost(u) {
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return T('src.sourceLower'); }
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
  function richHtml(text, block, enText) {
    var r = richText(text), statusEn = r.status;
    if (enText != null && enText !== text) {
      var e0 = richText(enText);
      statusEn = e0.status;
      // A translated tail that no longer reads "(Status: ... Source: ...)": keep the
      // English tail's status and links, shown in the reader's language where we have it.
      if (!r.status) r.status = T('status.text.' + e0.status) || e0.status;
      if (!r.links) r.links = e0.links;
    }
    var ch = r.status ? chip(r.status, statusEn) : '';
    var extra = (ch ? ' ' + ch : '') + (r.links ? '<span class="src-row src-row--inline">' + r.links + '</span>' : '');
    return block ? '<p>' + r.html + (ch ? ' ' + ch : '') + '</p>' + (r.links ? '<p class="src-row">' + r.links + '</p>' : '') : r.html + extra;
  }
  function stripStatusTail(s) {
    return String(s || '').replace(/\s+-\s+status:\s*[^.]*\./i, '.').replace(/\s*Status:\s*[^.]*\.\s*$/i, '').trim();
  }

  /* ----------------------------------------------------------------- booking */
  /* Items in the data can carry a "booking" object: {url, label, checked, price_seen, notes}.
     Nothing here is ever invented: no url means no action at all, no price_seen means no price
     line, and the only cancellation date shown is the one written in booking.notes. Parsing
     (provider, enquiry-or-booking, the date) always reads the English source, as everywhere else. */
  var MONTHS_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function bookingOf(item) {
    var b = item && item.booking;
    return b && safeUrl(b.url) ? b : null;
  }
  // The provider: the head of the label, up to the first comma or dash ("Booking.com, Blue Haven ...").
  function bookProvider(b) {
    var t = String((b && b.label) || '').split(/\s[–—-]\s|[,，]/)[0].trim();
    return t || shortHost(b.url);
  }
  // Where the data still says "quote needed", the link is an enquiry and must never say "book".
  function bookIsEnquiry(item, b) {
    var t = String((b.label || '') + ' ' + (b.price_seen || ''));
    if (/enquir/i.test(t)) return true;
    if (/quote needed|no public price|no price published|no price shown/i.test(t)) return true;
    return !!(item && item.status && statusKind(item.status) === 'quote');
  }
  // "Free cancellation before 31 Oct 2026" in booking.notes: the words as written, plus a sortable number.
  function cancelDate(b) {
    var m = /free cancellation before\s+(\d{1,2}\s+[A-Za-z]{3,9}\.?\s+\d{4})/i.exec(String((b && b.notes) || ''));
    if (!m) return null;
    var text = m[1].replace(/\s+/g, ' ').trim();
    var p = /^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{4})$/.exec(text);
    var mon = p ? MONTHS_EN.indexOf(p[2].toLowerCase()) : -1;
    if (!p || mon === -1) return null;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    // iso lets the page print the deadline in the reader's language (fmtDate); text stays as written.
    return { text: text, iso: p[3] + '-' + pad(mon + 1) + '-' + pad(Number(p[1])),
      sort: Number(p[3]) * 10000 + (mon + 1) * 100 + Number(p[1]) };
  }
  // One booking action. kind: 'stay' (button), 'flight' (button) or 'inline' (small link).
  function bookingAction(item, kind) {
    var b = bookingOf(item);
    if (!b) return '';
    var inline = kind === 'inline', enquiry = bookIsEnquiry(item, b), provider = bookProvider(b);
    var key = enquiry ? (inline ? 'book.inlineEnquire' : 'book.enquireBtn')
      : kind === 'flight' ? 'book.flightBtn' : inline ? 'book.inlineBook' : 'book.stayBtn';
    var out = '<div class="bookit' + (inline ? ' bookit--inline' : '') + '">' +
      '<a class="' + (inline ? 'src book-link' : 'btn btn-book') + '" href="' + esc(b.url) + '" target="_blank" rel="noopener noreferrer">' +
      '<span>' + Tve(key, { provider: provider }) + '</span><span class="vh"> (' + Te('book.newTab') + ')</span></a>';
    if (b.price_seen) out += '<p class="bookit-price">' + Tve('book.priceSeen', { price: tx(b, 'price_seen') }) + '</p>';
    var c = cancelDate(b);
    if (c) out += '<p class="bookit-cancel">' + Tve('book.cancelBy', { date: fmtDate(c.iso) }) + '</p>';
    if (/could not verify/i.test(b.notes || '')) out += '<p class="bookit-warn">' + Te('book.unverified') + '</p>';
    out += '<p class="bookit-checked fine">' + (b.checked ? Tve('book.checked', { date: fmtDate(b.checked) }) : Te('book.pricesChange')) + '</p>';
    return out + '</div>';
  }
  // "Book it" above a set of options: the earliest free-cancellation date in their booking notes.
  function bookSummary(items, o) {
    var bs = (items || []).map(bookingOf).filter(Boolean);
    if (!bs.length) return '';
    var dated = (items || []).filter(function (it) { var b = bookingOf(it); return b && cancelDate(b); })
      .sort(function (a, b) { return cancelDate(bookingOf(a)).sort - cancelDate(bookingOf(b)).sort; });
    var first = dated[0] ? cancelDate(bookingOf(dated[0])) : null;
    var checked = bs.map(function (b) { return b.checked; }).filter(Boolean).sort()[0];
    return '<aside class="bookit-sum" aria-labelledby="' + esc(o.id) + '">' +
      '<h3 class="bookit-sum-h" id="' + esc(o.id) + '" data-i18n="book.sumTitle">' + Te('book.sumTitle') + '</h3>' +
      '<p class="bookit-sum-line">' + (first ? Tve('book.sumDeadline', { date: fmtDate(first.iso), name: tx(dated[0], o.nameField) }) : Te(o.noneKey)) + '</p>' +
      (checked ? '<p class="fine">' + Tve('book.sumChecked', { n: bs.length, date: fmtDate(checked) }) + '</p>' : '') +
      '</aside>';
  }

  /* ------------------------------------------------------------------- plans */
  // Plan names come from the data ("Budget: shared guesthouse, boats per trip"): the short name is the part before the colon.
  function planById(id) { return (TRIP.plans || []).filter(function (p) { return p.id === id; })[0]; }
  function planShort(id) {
    var p = planById(id);
    if (!p) return String(id);
    var n = String(tx(p, 'name')), i = n.search(/[:\uff1a]/);
    return (i === -1 ? n : n.slice(0, i)).trim();
  }
  function planDesc(id) {
    var p = planById(id);
    if (!p) return '';
    var n = String(tx(p, 'name')), i = n.search(/[:\uff1a]/);
    return i === -1 ? '' : n.slice(i + 1).trim();
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
    if (id === rec.id) return T('plan.roleCrew');
    var a = computeBudget(defaultState(id)), b = computeBudget(defaultState(rec.id));
    return a.hi >= b.hi && a.lo >= b.lo ? T('plan.roleUpgrade') : T('plan.roleAlt');
  }
  // "Budget plan, Emirates, no coaching, budget food, no add-ons, crew of 11". Short form drops the plan and the crew.
  function picksText(state, short) {
    var r = computeBudget(state);
    var parts = short ? [] : [Tv('plan.planSuffix', { plan: planShort(state.plan) })];
    var fo = (TRIP.flights.options || []).filter(function (o) { return o.id === r.eff.flight; })[0];
    if (fo) parts.push(tx(fo, 'airline'));
    if (r.eff.coaching === 'none') parts.push(T('picks.noCoaching'));
    else if (r.eff.coaching) {
      var pk = (TRIP.coaching.packages || []).filter(function (p) { return p.id === r.eff.coaching; })[0];
      parts.push(Tv('picks.coaching', { name: pk ? String(tx(pk, 'name')).split(' - ')[0] : r.eff.coaching }));
    }
    if (r.eff.food) {
      var fn = foodName(r.eff.food).toLowerCase();
      parts.push(/\s/.test(fn) ? fn : Tv('picks.food', { name: fn }));
    }
    var n = 0;
    state.addons.forEach(function (id) {
      var l = TRIP.budget.lines.filter(function (x) { return x.id === id; })[0];
      if (l && appliesTo(l.plans, state.plan)) n++;
    });
    parts.push(n ? Tv(n === 1 ? 'picks.addonOne' : 'picks.addonMany', { n: n }) : T('picks.noAddons'));
    if (!short) parts.push(Tv('picks.crewOf', { n: r.crew }));
    return parts.join(T('words.listSep'));
  }
  function foodName(id) {
    var k = T('food.short.' + id);
    if (k) return k;
    var f = (TRIP.food.daily_budget || []).filter(function (x) { return x.id === id; })[0];
    if (f) return f.style.replace(/^Local island - /i, '').replace(/^./, function (c) { return c.toUpperCase(); });
    return cap(id);
  }

  /* ------------------------------------------------------------ surf levels */
  function levelWords(level) {
    var k = T('level.words.' + String(level || ''));
    if (k) return k;
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
  function placeName(pl) { return pl ? tx(pl, 'name') : ''; }
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
  function spotShort(s) { return String(tx(s, 'name')).split(' (')[0].split('\uff08')[0]; }
  function accessKind(s) { var a = String(s.access || '').toLowerCase(); return /resort/.test(a) ? 'resort' : /limited/.test(a) ? 'limited' : 'public'; }
  function isAdvanced(s) { return levelRange(s.level)[0] >= 2; }
  // Boat time from the base, read from the spot's own text ("boat time about 5-15 min", "About 20 min by boat").
  // Nothing is invented: no minutes in the text means "not confirmed".
  function boatTime(s) {
    var t = String(s.boat_from_thulusdhoo || '');
    var km = /about\s+([\d.]+)\s*km/i.exec(t);
    var out = { km: km ? Number(km[1]) : Math.round(distKm(s, basePlace()) * 10) / 10, kmFrom: km ? 'text' : 'pins' };
    if (/^no real boat trip/i.test(t)) { out.kind = 'paddle'; out.text = T('boat.paddleText'); out.short = T('boat.paddleShort'); return out; }
    if (/^not an option/i.test(t)) { out.kind = 'no'; out.text = T('boat.noText'); out.short = T('boat.noShort'); return out; }
    var m = /(\d+(?:\s*-\s*\d+)?)\s*min\b/i.exec(t);
    if (m) {
      var mins = m[1].replace(/\s+/g, ''), each = /each way/i.test(t);
      out.kind = 'time'; out.mins = mins; out.eachWay = each;
      out.text = Tv(each ? 'boat.timeTextEachWay' : 'boat.timeText', { mins: mins });
      out.short = Tv('boat.timeShort', { mins: mins });
      return out;
    }
    out.kind = 'unknown'; out.text = T('boat.unknownText'); out.short = T('boat.unknownShort');
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
          var temp = 14000 * Math.pow(0.002, st / steps);
          var li = Math.floor(rnd() * n), lc = cands[li], c = lc[Math.floor(Math.pow(rnd(), 1.5) * lc.length)];
          if (c === pick[li]) continue;
          var delta = labelTotal(li, c) - labelTotal(li, pick[li]);
          if (delta < 0 || rnd() < Math.exp(-delta / temp)) {
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
    module.exports = { UI_EN: UI_EN, setLangForTest: function (l) { lang = l; }, computeBudget: computeBudget, defaultState: defaultState, defaultChoice: defaultChoice, applyPlanDefaults: applyPlanDefaults, stateForPlan: stateForPlan, choiceIds: choiceIds, effectiveChoice: effectiveChoice, planShort: planShort, planRole: planRole, sentences: sentences, richText: richText, stripStatusTail: stripStatusTail, picksText: picksText, boatTime: boatTime, staysForPlan: staysForPlan, spreadPoints: spreadPoints, placeLabels: placeLabels, projectBox: projectBox, geoBox: geoBox, viewPoints: viewPoints };
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
      toast(Tv('toast.planSwitched', { plan: planShort(id), role: planRole(id).toLowerCase(), price: hkd(r.lo, r.hi) }));
    }
  }
  function syncPlanInputs() {
    $$('input[data-plan-input]').forEach(function (inp) { inp.checked = inp.value === state.plan; });
    $$('[data-plan-choose]').forEach(function (b) {
      var on = b.getAttribute('data-plan-choose') === state.plan;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = T(on ? 'plan.showing' : 'plan.show');
    });
    $$('[data-plan-tile]').forEach(function (b) {
      var on = b.getAttribute('data-plan-tile') === state.plan;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var st = $('[data-pick-state]', b);
      if (st) st.textContent = T(on ? 'plan.tileShowing' : 'plan.tileShow');
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
    ['top', 'sec.top', ''], ['overview', 'sec.overview', '1'], ['budget', 'sec.budget', '2'], ['flights', 'sec.flights', '3'],
    ['stay', 'sec.stay', '4'], ['spots', 'sec.spots', '5'], ['coaching', 'sec.coaching', '6'], ['transport', 'sec.transport', '7'],
    ['activities', 'sec.activities', '8'], ['food', 'sec.food', ''], ['itinerary', 'sec.itinerary', ''], ['prep', 'sec.prep', ''],
    ['sources', 'sec.sources', '']
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
          esc(planShort(p.id)) + '<span class="vh">' + Tve('plan.vhRole', { role: planRole(p.id).toLowerCase() }) + '</span></span>';
        if (g === 'rail') inner += '<span class="seg-role" aria-hidden="true">' + esc(planRole(p.id)) + '</span><span class="seg-est" data-plan-est="' + esc(p.id) + '"></span>';
        return '<label class="seg-opt"><input type="radio" name="plan-' + g + '" value="' + esc(p.id) + '" data-plan-input>' + inner + '</label>';
      }).join('');
      fs.innerHTML = '';
      if (legend) fs.appendChild(legend);
      fs.insertAdjacentHTML('beforeend', html);
      bindOnce(fs, 'plan-group', 'change', function (e) {
        if (e.target && e.target.name === 'plan-' + g) setPlan(e.target.value, g);
      });
    });
  }
  function updatePlanEstimates() {
    // The desktop rail compares the plans as 2 Budget overall does: each at its own default picks (crew of 11, no
    // add-ons), labelled so. Only the calculator, its dock and the "Your picks" line follow the reader's changes.
    $$('[data-plan-est]').forEach(function (el) {
      var r = computeBudget(defaultState(el.getAttribute('data-plan-est')));
      el.textContent = Tv('rail.planEst', { price: hkd(r.lo, r.hi) });
    });
    $$('[data-plan-total]').forEach(function (el) {
      var r = computeBudget(stateForPlan(state, el.getAttribute('data-plan-total')));
      el.textContent = hkd(r.lo, r.hi);
    });
  }

  var navWatched = false;
  function renderNav() {
    $$('[data-nav]').forEach(function (ul) {
      ul.innerHTML = SECTIONS.map(function (s) {
        var num = s[2] ? '<span class="nav-num">' + esc(s[2]) + '</span> ' :
          s[0] === 'top' ? '<span class="nav-num nav-num--map" aria-hidden="true"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M2.5 5.5l5-2 5 2 5-2v11l-5 2-5-2-5 2z M7.5 3.5v11 M12.5 5.5v11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></span>' :
          '<span class="nav-num nav-num--none" aria-hidden="true"></span>';
        return '<li><a href="#' + s[0] + '" data-nav-link="' + s[0] + '"' + (s[0] === 'spots' ? ' class="nav-spots"' : '') + '>' + num + '<span class="nav-label">' + esc(T(s[1])) + '</span></a></li>';
      }).join('');
    });
    if ('IntersectionObserver' in W && !navWatched) {
      navWatched = true;
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
      bind('menu-estimate', Tv('menu.estimate', { plan: planShort(state.plan), role: planRole(state.plan).toLowerCase(), price: hkd(r.lo, r.hi) }));
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
  // One listener per element, however many times a render runs (a language switch re-renders everything).
  function bindOnce(el, key, type, fn) {
    if (!el || el.getAttribute('data-bound-' + key)) return;
    el.setAttribute('data-bound-' + key, '1');
    el.addEventListener(type, fn);
  }
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
      c = clips[key] = { open: c ? c.open : false, btn: btn, list: list };
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
    c.btn.textContent = c.text ? c.text(c.open, items.length) :
      Tv(c.open ? 'clip.showFewer' : 'clip.showAll', { n: items.length, noun: T('clip.noun.' + c.noun) });
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
    if (f && !f.btn.parentNode) f = null;   // a re-render threw the old button away
    if (!f) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-quiet clip-more fold-more';
      btn.setAttribute('data-fold-btn', key);
      btn.setAttribute('aria-controls', els.map(function (el, i) { if (!el.id) el.id = 'fold-' + key + '-' + i; return el.id; }).join(' '));
      els[0].insertAdjacentElement('beforebegin', btn);
      f = folds[key] = { open: (folds[key] && folds[key].open) || false, btn: btn };
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
    f.btn.textContent = Tv(f.open ? 'fold.hide' : 'fold.show', { label: T('fold.' + f.label) });
  }
  function isWide() { return !!(W.matchMedia && W.matchMedia('(min-width: 900px)').matches); }

  /* ------------------------------------------------------------------- share */
  var shareBound = false;
  function shareUrl() { return String(W.location.href).split('#')[0]; }
  function renderShare() {
    var text = Tv('share.text', { url: shareUrl() });
    var wa = 'https://wa.me/?text=' + encodeURIComponent(text);
    $$('[data-share-slot]').forEach(function (slot) {
      slot.innerHTML = '<div class="share">' +
        '<button type="button" class="btn btn-solid" data-copy-link>' +
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<span>' + Te('share.copy') + '</span></button>' +
        '<a class="btn btn-wa" href="' + esc(wa) + '" target="_blank" rel="noopener noreferrer">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
        '<span>' + Te('share.whatsapp') + '</span></a>' +
        '</div>';
    });
    if (shareBound) return;
    shareBound = true;
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-copy-link]');
      if (!b) return;
      copyText(shareUrl()).then(function (ok) {
        toast(T(ok ? 'toast.copied' : 'toast.copyFailed'));
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
      ' alt="' + esc(tx(p, 'alt')) + '" loading="lazy" decoding="async">';
    if (p.src_large === p.src_small) return '<picture>' + img + '</picture>';
    return '<picture><source media="' + LARGE_MEDIA + '" srcset="' + esc(p.src_small) + ' ' + sw + 'w, ' + esc(p.src_large) + ' ' + lw + 'w" sizes="' + esc(sizes) + '">' + img + '</picture>';
  }
  function creditText(p) { return Tv('photo.credit', { credit: tx(p, 'credit'), license: tx(p, 'license') }); }
  function captionText(p) {
    var c = String(tx(p, 'caption') || '').trim();
    return /[.!?\u3002\uff01\uff1f]$/.test(c) ? c : Tv('photo.captionDot', { caption: c });
  }
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
      var capEl = $('.plate-cap', el);
      if (p && capEl) {
        markUsed(p);
        capEl.innerHTML = esc(captionText(p)) + ' <span class="credit">' + esc(creditText(p)) + '</span>';
        var pimg = $('.plate-media img', el);
        if (pimg) pimg.setAttribute('alt', tx(p, 'alt'));
      }
      if (p && !capEl) {
        var media = document.createElement('div');
        media.className = 'plate-media ph';
        media.innerHTML = picture(p, { sizes: sizes });
        el.insertBefore(media, el.firstChild);
        var copy = $('.plate-copy', el);
        if (copy) copy.insertAdjacentHTML('beforeend', '<p class="plate-cap">' + esc(captionText(p)) + ' <span class="credit">' + esc(creditText(p)) + '</span></p>');
      }
      if ($('.edge', el)) return;
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
  var vibeBound = false;
  function renderVibe() {
    var list = VIBE.map(photoById).filter(Boolean);
    var sizes = '(min-width: 1100px) calc((100vw - 380px) / 2), (min-width: 1000px) 46vw, 84vw';
    renderInto('vibe', '<ul class="vibe" aria-label="' + Te('vibe.aria') + '">' + list.map(function (p) {
      var ar = (Number(p.width) / Number(p.height)).toFixed(3);
      return '<li><figure style="--ar:' + ar + '"><span class="ph">' + picture(p, { sizes: sizes }) + '</span>' + figcap(p) + '</figure></li>';
    }).join('') + '</ul><p class="vibe-hint">' + Te('vibe.hint') + '</p>');
    syncVibeScroller();
    if (vibeBound) return;
    vibeBound = true;
    var t;
    W.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(syncVibeScroller, 150); });
  }
  // The gallery is a keyboard stop (arrow keys scroll it) only while it actually scrolls sideways, as on phones.
  function syncVibeScroller() {
    var ul = $('.vibe');
    if (!ul) return;
    if (ul.scrollWidth > ul.clientWidth + 2) {
      ul.setAttribute('tabindex', '0');
      ul.setAttribute('aria-label', T('vibe.ariaScroll'));
    } else {
      ul.removeAttribute('tabindex');
      ul.setAttribute('aria-label', T('vibe.aria'));
    }
  }

  /* ------------------------------------------------ top line, crew and dates */
  // The countdown digits live in "Crew and dates" (1 Overview); the first screen carries a short "N days to go" chip.
  var cdLive = false;
  function recFlight() { return (TRIP.flights.options || []).filter(function (o) { return o.recommended; })[0] || null; }
  function renderTop() {
    var m = TRIP.meta;
    bind('checked-strip',
      '<p><strong>' + Tve('top.pricesChecked', { date: fmtDate(m.prices_checked) }) + '</strong>' + Te('top.pricesBody') + '</p>' +
      '<details class="legend-wrap"><summary>' + Te('top.legendSummary') + '</summary>' + statusLegend() + '</details>', true);
    bind('footer-note', tx(m, 'disclaimer'));
    var picks = TRIP.spots.filter(function (s) { return s.crew_pick; }).map(spotShort);
    bind('spots-tagline', Tv('rail.spotsTagline', { n: TRIP.spots.length }));
    bind('spots-lede', Tv('spots.lede', { n: TRIP.spots.length, picks: listWords(picks), base: placeName(basePlace()) }));
  }
  function listWords(arr) {
    if (arr.length < 2) return arr.join('');
    return arr.slice(0, -1).join(T('words.listSep')) + T('words.listAnd') + arr[arr.length - 1];
  }
  function renderCrew() {
    var rec = recFlight(), nights = tripNights();
    var rows = [[T('crew.inMaldives'), Tv('crew.datesNights', { n: nights })]];
    if (rec) {
      var o0 = rec.outbound.legs[0], r0 = rec.return.legs[0], rz = rec.return.legs[rec.return.legs.length - 1];
      rows.push([T('crew.flyOut'), Tv('crew.flyOutVal', { date: tx(rec.outbound, 'date').replace(/ 2026$/, ''), flight: o0.flight, time: o0.dep })]);
      rows.push([T('crew.flyHome'), Tv('crew.flyHomeVal', { date: tx(rec.return, 'date').replace(/ 2026$/, ''), flight: r0.flight, dep: r0.dep, arr: String(rz.arr).replace(/\s*\(\+1\)/, '') })]);
    }
    var html = '<div class="crew-facts"><p class="crew-who">' + esc(tx(TRIP.meta, 'subtitle')) + '</p>' +
      '<dl class="crew-dl">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="fine">' + Tve('crew.flightNote', { flights: recFlightName() }) + '</p></div>' +
      '<div class="countdown" id="countdown" role="timer" data-live>' +
      '<p class="countdown-label" data-bind="countdown-label">' + Te('crew.countdownLabel') + '</p>' +
      '<div class="countdown-digits" data-bind="countdown"></div>' +
      '<p class="countdown-flight" data-bind="countdown-flight"></p></div>';
    renderInto('crew', html);
    if (rec) {
      var leg = rec.outbound.legs[0];
      bind('countdown-flight', Tv('crew.countdownFlight', { flight: leg.flight, date: tx(rec.outbound, 'date').replace(/ 2026$/, ''), time: leg.dep }));
    }
    tickCountdown(true);
    scheduleTick();
  }
  function scheduleTick() {
    setTimeout(function () { tickCountdown(false); scheduleTick(); }, 1000 - (Date.now() % 1000) + 15);
  }
  var cdLast = {}, chipLast = null;
  function tickCountdown(force) {
    var dep = Date.parse(TRIP.meta.depart_hk);
    var end = Date.parse(TRIP.meta.trip_end + 'T23:59:00+05:00');
    var now = Date.now(), diff = dep - now;
    // The chip on the first screen: whole days only, so it changes at most once an hour.
    var chipText = diff > 864e5 ? Tv('cd.daysToGo', { n: Math.floor(diff / 864e5) }) : diff > 0 ? T('cd.today') : now < end ? T('cd.away') : T('cd.done');
    if (chipText !== chipLast) { bind('countdown-chip', chipText); chipLast = chipText; }
    if (!force && (!cdLive || document.hidden)) return;
    var el = $('[data-bind="countdown"]');
    if (!el) return;
    if (diff > 0) {
      var v = { d: Math.floor(diff / 864e5), h: Math.floor(diff % 864e5 / 36e5), m: Math.floor(diff % 36e5 / 6e4), s: Math.floor(diff % 6e4 / 1e3) };
      if (!$('[data-cd="d"]', el)) {
        el.innerHTML = unit('d', T(v.d === 1 ? 'cd.day' : 'cd.days')) + unit('h', T(v.h === 1 ? 'cd.hour' : 'cd.hours')) + unit('m', T('cd.min')) + unit('s', T('cd.sec'));
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
      if (dl) dl.textContent = T(v.d === 1 ? 'cd.day' : 'cd.days');
      if (hl) hl.textContent = T(v.h === 1 ? 'cd.hour' : 'cd.hours');
      if (force || v.s === 0) el.setAttribute('aria-label', Tv('cd.aria', { d: v.d, h: v.h, m: v.m }));
      bind('countdown-label', T('crew.countdownLabel'));
    } else if (now < end) {
      el.innerHTML = '<span class="cd-now">' + Te('cd.away') + '</span>';
      bind('countdown-label', T('cd.labelDuring'));
    } else {
      el.innerHTML = '<span class="cd-now">' + Te('cd.done') + '</span>';
      bind('countdown-label', T('cd.labelAfter'));
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
      bind('estimate-mine', Tv('budget.yourPicks', { plan: planShort(state.plan), price: hkd(q.lo, q.hi) }));
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
      [T('heads.gambleTitle'), tx(TRIP.season, 'verdict'), '#season-title'],
      [T('heads.charterTitle'), charterSummary(charter), '#stay-not-available'],
      [T('heads.coachTitle'), firstSentences(tx(TRIP.coaching, 'reality_check'), 1) + T('heads.coachBody'), '#coaching'],
      [T('heads.flightsTitle'), flightCheckText(), '#flights']
    ];
    renderInto('heads', items.map(function (it) {
      return '<li class="head">' + ICON.hazard + '<div><h4>' + esc(it[0]) + '</h4><p>' + esc(it[1]) + '</p>' +
        '<a class="more" href="' + it[2] + '">' + Te('heads.details') + '</a></div></li>';
    }).join(''));
  }

  // Pick sentences by their position in the English text, so the same sentences are
  // kept once the text is translated (a Chinese sentence never matches an English regex).
  function pickSentences(obj, field, test) {
    var en = sentences(obj ? obj[field] : ''), keepIdx = [];
    en.forEach(function (x, i) { if (test(x, i)) keepIdx.push(i); });
    var t = tx(obj, field);
    if (t === (obj ? obj[field] : '')) return keepIdx.map(function (i) { return en[i]; });
    var zh = sentences(t);
    if (zh.length !== en.length) return zh;   // split differently: keep everything rather than lose meaning
    return keepIdx.map(function (i) { return zh[i]; });
  }
  function charterSummary(charter) {
    // Keep the nuance: nothing dated for our week, some boats run into November, asking is a long shot.
    return pickSentences(charter, 'why', function (x, i) { return i === 0 || /november|long shot/i.test(x); }).join(' ');
  }
  function flightCheckText() {
    var rec = (TRIP.flights.options || []).filter(function (o) { return o.recommended; })[0];
    var out = '';
    if (rec) {
      out = Tv('heads.flightCheck', {
        airline: tx(rec, 'airline'),
        price: hkd(rec.fare_pp_hkd.low, rec.fare_pp_hkd.high),
        status: tx(rec, 'fare_status'),
        date: fmtDate(TRIP.meta.prices_checked).replace(/ \d{4}$/, '')
      });
    }
    var ds = pickSentences(TRIP.meta, 'disclaimer', function (x) { return /^confirm every price/i.test(x); });
    return out + (ds[0] || firstSentences(restSentences(tx(TRIP.meta, 'disclaimer'), 1), 1));
  }
  function renderKeypoints() {
    renderInto('keypoints', txs(TRIP.headline.key_points).map(function (k) {
      var m = /[:\uff1a]\s*/.exec(k), i = m ? m.index : -1;
      if (i > 0 && i <= 34) return '<li><strong>' + esc(k.slice(0, i)) + '</strong> ' + esc(k.slice(i + m[0].length)) + '</li>';
      return '<li>' + esc(k) + '</li>';
    }).join(''));
  }

  // 2 Budget overall: the crew's plan next to the upgrade, both at their own default picks, with the crew total.
  // Tapping a tile shows that plan everywhere (map stays, stay cards, day plan, calculator).
  function renderPlanPick() {
    var rec = recPlan(), rs = computeBudget(defaultState(rec.id));
    var html = '<p class="lede">' + esc(tx(TRIP.headline, 'one_liner')) + '</p>' +
      '<div class="pick-tiles">' + TRIP.plans.map(function (p) {
        var ds = defaultState(p.id), r = computeBudget(ds), isRec = p.id === rec.id;
        var more = !isRec && r.lo >= rs.lo && r.hi >= rs.hi;
        return '<button type="button" class="pick-tile' + (isRec ? ' is-rec' : '') + '" data-plan-tile="' + esc(p.id) + '" aria-pressed="false">' +
          '<span class="pick-role">' + esc(isRec ? T('plan.recRole') : planRole(p.id)) + '</span>' +
          '<span class="pick-name">' + esc(planShort(p.id)) + '</span>' +
          '<span class="pick-desc">' + esc(planDesc(p.id)) + '</span>' +
          '<span class="pick-price">' + esc(hkd(r.lo, r.hi)) + '</span>' +
          '<span class="pick-each">' + Te('plan.eachWithFlights') + chip(T('status.legend.estimate'), 'estimate') + '</span>' +
          '<span class="pick-group">' + Tve('plan.crewOf', { n: r.crew, price: hkd(r.groupLo, r.groupHi) }) + '</span>' +
          '<span class="pick-picks">' + Tve('plan.defaultPicks', { picks: picksText(ds, true) }) + '</span>' +
          (more ? '<span class="pick-delta">' + Tve('plan.moreThan', { delta: hkdDelta(r, rs), plan: planShort(rec.id) }) + '</span>' : '') +
          '<span class="pick-state" data-pick-state></span></button>';
      }).join('') + '</div>' +
      '<p class="estimate-mine" data-bind="estimate-mine" hidden></p>' +
      '<p class="pick-links"><a class="more" href="#calc-title">' + Te('plan.changeInCalc') + '</a>' +
      ((TRIP.above_budget || []).length ? '<a class="more" href="#above-budget">' + Te('plan.aboveLink') + '</a>' : '') + '</p>';
    var root = renderInto('plan-pick', html);
    if (root) bindOnce(root, 'plan-pick', 'click', function (e) {
      var b = e.target.closest('[data-plan-tile]');
      if (b) setPlan(b.getAttribute('data-plan-tile'), 'pick');
    });
  }

  function renderDecisions() {
    renderInto('decisions', TRIP.headline.big_decisions.map(function (d, i) {
      return '<details class="decision"' + (i === 0 && isWide() ? ' open' : '') + '><summary><span class="q">' + esc(tx(d, 'question')) + '</span>' +
        '<span class="pick">' + esc(tx(d, 'our_pick')) + '</span></summary>' +
        '<div class="decision-body"><p>' + esc(tx(d, 'why')) + '</p>' +
        (d.alternatives && d.alternatives.length ? '<p class="alt-h">' + Te('decisions.alts') + '</p><ul class="alts">' + txs(d.alternatives).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' : '') +
        '</div></details>';
    }).join(''));
  }

  /* -------------------------------------------------------------------- surf */
  var EXPECT_ICON = ['big', 'small', 'flat', 'crowd', 'reef', 'ask'];
  // 1 Overview: what surfing in early November looks like.
  function renderSeason() {
    var s = TRIP.season;
    var facts = [[T('season.factWind'), tx(s, 'wind')], [T('season.factSwell'), tx(s, 'swell')], [T('season.factWater'), tx(s, 'water_temp')],
      [T('season.factAir'), tx(s, 'air_temp')], [T('season.factRain'), tx(s, 'rain')]];
    var html = '<h3 class="h-sub h-first" id="season-title">' + Te('season.title') + '</h3>' +
      '<div class="verdict"><p class="verdict-kicker">' + Te('season.kicker') + '</p><p class="verdict-text">' + esc(tx(s, 'verdict')) + '</p></div>' +
      '<ul class="expect">' + s.expectations.map(function (e, i) {
        return '<li class="expect-item"><span class="expect-icon">' + (ICON[EXPECT_ICON[i]] || ICON.ask) + '</span><div><h4>' + esc(tx(e, 'label')) + '</h4><p>' + esc(tx(e, 'note')) + '</p></div></li>';
      }).join('') + '</ul>' +
      '<div class="facts">' + facts.map(function (f) {
        var rest = restSentences(f[1], 1);
        return '<div class="fact"><h4>' + esc(f[0]) + '</h4><p>' + esc(firstSentences(f[1], 1)) + '</p>' +
          (rest ? '<details class="more-d"><summary>' + Tve('season.moreOn', { label: f[0].toLowerCase() }) + '</summary><p>' + esc(rest) + '</p></details>' : '') + '</div>';
      }).join('') + '</div>' +
      '<p class="season-go"><a class="more" href="#spots">' + Te('season.goSpots') + '</a></p>';
    var root = renderInto('season', html);
    if (root) foldBlock('season', [$('.expect', root), $('.facts', root)], 'season');
  }

  /* ------------------------------------------------------ 5 Surf spots module */
  var LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  function levelBar(level) {
    var r = levelRange(level);
    return '<span class="lvl" role="img" aria-label="' + Tve('spots.levelAria', { level: levelWords(level) }) + '">' + LEVELS.map(function (n, i) {
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
      '<button type="button" class="toggle" aria-pressed="false" data-spot-pick>' + Te('filters.crewOnly') + '</button>' +
      '<div class="seg-inline" role="group" aria-label="' + Te('filters.regionAria') + '">' +
      ['all'].concat(uniq('region')).map(function (r) {
        return '<button type="button" class="toggle" data-spot-region="' + esc(r) + '" aria-pressed="' + (r === 'all') + '">' + esc(r === 'all' ? T('filters.allRegions') : regionLabel(r)) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="filter-row">' +
      '<label class="select"><span>' + Te('filters.level') + '</span><select data-spot-level>' + opt('all', T('filters.allLevels')) + levels.map(function (l) { return opt(l, levelWords(l)); }).join('') + '</select></label>' +
      '<label class="select"><span>' + Te('filters.access') + '</span><select data-spot-access>' + opt('all', T('filters.anyAccess')) + uniq('access').map(function (a) { return opt(a, accessLabel(a)); }).join('') + '</select></label>' +
      '<button type="button" class="btn btn-quiet" data-spot-reset>' + Te('filters.clear') + '</button>' +
      '</div>' +
      '<p class="fine level-key">' + Te('filters.levelKey') + '</p>';
    var el = renderInto('spot-filters', html);
    syncSpotFilterInputs(el);
    bindOnce(el, 'spot-filters-click', 'click', function (e) {
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
    bindOnce(el, 'spot-filters-change', 'change', function (e) {
      if (e.target.hasAttribute('data-spot-level')) spotFilter.level = e.target.value;
      if (e.target.hasAttribute('data-spot-access')) spotFilter.access = e.target.value;
      applySpotFilter();
    });
  }
  // Put the reader's filters back on freshly built controls (after a language switch).
  function syncSpotFilterInputs(el) {
    if (!el) return;
    var pk = $('[data-spot-pick]', el), lv = $('[data-spot-level]', el), ac = $('[data-spot-access]', el);
    if (pk) pk.setAttribute('aria-pressed', String(spotFilter.pick));
    $$('[data-spot-region]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-spot-region') === spotFilter.region)); });
    try {
      if (lv && lv.value !== spotFilter.level) lv.value = spotFilter.level;
      if (ac && ac.value !== spotFilter.access) ac.value = spotFilter.access;
    } catch (e) { /* engines where <select>.value is read-only */ }
  }
  function regionLabel(r) { return T('region.' + r) || String(r).replace('Male', 'Malé'); }
  function accessLabel(a) { return T('access.' + a) || a; }
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
      [T('spot.wave'), tx(s, 'type')],
      [T('spot.level'), Tv('spot.levelVal', { level: levelWords(s.level), note: tx(s, 'level_note') })],
      [T('spot.access'), Tv('spot.accessVal', { access: accessLabel(s.access), note: tx(s, 'access_note') })],
      [Tv('spot.fromBase', { base: placeName(basePlace()) }), tx(s, 'boat_from_thulusdhoo')],
      [T('spot.hazards'), tx(s, 'hazards')], [T('spot.november'), tx(s, 'november_note')]
    ];
    var more = [
      [T('spot.bestSwell'), tx(s, 'best_swell')], [T('spot.bestWind'), tx(s, 'best_wind')], [T('spot.bestTide'), tx(s, 'best_tide')],
      [T('spot.mapPin'), Tv('spot.mapPinVal', { lat: s.lat.toFixed(3), lon: s.lon.toFixed(3), note: tx(s, 'coord_note') })]
    ];
    return kv(main) + '<details class="more-d spot-more"><summary>' + Te('spot.moreSummary') + '</summary>' + kv(more) +
      '<p class="src-row"><span class="src-lbl">' + Te('spot.sourcesLbl') + '</span> ' + s.sources.map(function (u, i) {
        var host = ''; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { host = Tv('src.sourceN', { n: i + 1 }); }
        return srcLink(u, host);
      }).join(' ') + '</p></details>';
  }
  function spotRegionLabel(s) { return Tv('spot.regionNear', { region: regionLabel(s.region), island: tx(s, 'nearest_island') }); }
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
  function levelShort(level) { return T('level.short.' + String(level || '')) || String(level || ''); }
  function renderSpotList() {
    var ul = $('#spot-list');
    ul.innerHTML = TRIP.spots.map(function (s) {
      // The card id is card-<id>, not spot-<id>: a shared "#spot-<id>" link must have no element of its own, or the browser's
      // own fragment scroll moves the page to the card after openSpotLink has aligned the map (which closed the sheet).
      return '<li class="spot' + (s.crew_pick ? ' is-pick' : '') + '" id="card-' + esc(s.id) + '" data-spot="' + esc(s.id) + '">' +
        '<div class="spot-head">' +
        '<button type="button" class="spot-toggle" aria-expanded="false" aria-controls="spot-body-' + esc(s.id) + '" data-spot-open="' + esc(s.id) + '">' +
        '<span class="spot-name">' + esc(tx(s, 'name')) + '</span>' +
        '<span class="spot-meta">' + Tve('spot.meta', { type: tx(s, 'type'), region: spotRegionLabel(s) }) + '</span>' +
        '</button>' +
        '<div class="spot-tags">' + (s.crew_pick ? '<span class="tag tag-pick">' + Te('tag.crewPick') + '</span>' : '') +
        '<span class="tag">' + esc(accessLabel(s.access)) + '</span>' + levelBar(s.level) + '<span class="lvl-text">' + esc(levelShort(s.level)) + '</span></div>' +
        '</div>' +
        '<div class="spot-body" id="spot-body-' + esc(s.id) + '" hidden>' + spotPhotoHtml(s) + spotFacts(s) +
        '<button type="button" class="btn btn-quiet" data-spot-map="' + esc(s.id) + '">' + Te('spot.showOnMap') + '</button></div>' +
        '</li>';
    }).join('');
    bindOnce(ul, 'spot-list', 'click', function (e) {
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
    if (c) c.textContent = n === TRIP.spots.length ? Tv('spots.countAll', { n: n }) :
      n ? Tv('spots.countSome', { n: n, total: TRIP.spots.length, extra: mapViewEmpty() ? T('spots.countNoneInView') : '' }) : T('spots.countNone');
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
    if (st && from !== 'init' && from !== 'built') st.textContent = Tv('spots.statusDetail', {
      name: tx(s, 'name'), pick: s.crew_pick ? T('spots.crewPickSuffix') : '',
      where: T(sheet ? (sheetSide() ? 'spots.detailsSide' : 'spots.detailsBottom') : 'spots.detailsUnder')
    });
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
    d.innerHTML = '<div class="detail-head"><h3 id="spot-detail-title">' + esc(tx(s, 'name')) + '</h3>' +
      (s.crew_pick ? '<span class="tag tag-pick">' + Te('tag.crewPick') + '</span>' : '') + '</div>' +
      '<p class="detail-sub">' + Tve('spot.meta', { type: tx(s, 'type'), region: spotRegionLabel(s) }) + '</p>' + spotPhotoHtml(s) + spotFacts(s);
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
    var bt = boatTime(s), base = placeName(basePlace());
    var boat = bt.kind === 'time' ? Tv('boat.ariaFrom', { text: bt.text, base: base }) :
      bt.kind === 'unknown' ? Tv('boat.ariaUnknown', { base: base }) : bt.text;
    return Tv('spots.aria', {
      name: tx(s, 'name'), pick: s.crew_pick ? T('spots.crewPickSuffix') : '',
      level: levelWords(s.level), access: accessLabel(s.access), boat: boat
    });
  }
  // Nothing is booked: a plan lists stay options, and the crew books one of them.
  function stayAria(g) {
    var names = g.options.map(function (o) { return tx(o, 'name'); }).join(T('words.listSep'));
    return Tv(g.options.length > 1 ? 'map.stayAriaMany' : 'map.stayAriaOne', { plan: planShort(state.plan), names: names, place: placeName(g.place) });
  }
  function airportLeg() { return (TRIP.transport.legs || []).filter(function (l) { return /^airport-to/.test(l.id); })[0] || null; }
  function airportBoatText() {
    var leg = airportLeg(), o = leg && (leg.options || []).filter(function (x) { return /\d+\s*-?\s*\d*\s*min/.test(x.duration); })[0];
    return o ? Tv('map.airportBoat', { duration: tx(o, 'duration'), base: placeName(basePlace()) }) : Tv('map.airportBoatFallback', { base: placeName(basePlace()) });
  }
  function sketchCredit() { return T('map.sketchCredit'); }
  function mapCredit(kind) { return T('map.credit' + kind) + T('map.routeNote'); }
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
  // The base-layer switcher's own labels, rebuilt when the language changes.
  function addLayerControl(M) {
    var L = W.L;
    if (!M || !M.esri || !M.osm || !L) return;
    if (M.layerControl) { try { M.map.removeControl(M.layerControl); } catch (e) { /* already gone */ } }
    var opts = {};
    opts[T('map.layerSatellite')] = M.esri;
    opts[T('map.layerMap')] = M.osm;
    M.layerControl = L.control.layers(opts, null, { position: 'topright' }).addTo(M.map);
  }
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
        credit(mapCredit('Map') + T('map.tilesFellBack'));
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
    credit(mapCredit('Satellite'));
    if (cfg.layers) {
      M.esri = esri; M.osm = osm;
      addLayerControl(M);
      map.on('baselayerchange', function (e) { if (!t.failed) credit(mapCredit(e.name === T('map.layerMap') ? 'Map' : 'Satellite')); });
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
        me.setAttribute('aria-label', Tv('map.airportAria', { name: tx(air, 'name'), boat: airportBoatText() }));
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
      if (cfg.tooltips && !s.crew_pick) mk.bindTooltip(tx(s, 'name'), { direction: 'top', offset: [0, -18], className: 'spot-label' });
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
    var full = [[name, 'lbl-b', 'f'], [bt.kind === 'unknown' ? T('boat.unknownShort') : bt.short, 'lbl-s', 'f']];
    var compact = bt.kind === 'time' && bt.mins ? [[Tv('boat.compactTime', { name: name, mins: bt.mins }), 'lbl-b', 'c']] :
      [[name, 'lbl-b', 'c'], [bt.kind === 'unknown' ? T('boat.unknownCompact') : bt.short, 'lbl-s', 'c']];
    return full.concat(compact);
  }
  function mapLabelSpecs(stays, spots, hasAirport, narrow) {
    var out = [];
    stays.forEach(function (g) {
      out.push({ id: 'stay-' + g.place.id, kind: 'stay', lat: g.place.lat, lon: g.place.lon, prio: 3, g: 20, must: true, key: true,
        lines: (narrow ? [] : [[placeName(g.place), 'lbl-k']]).concat(g.options.map(function (o) { return [tx(o, 'name'), 'lbl-b']; })).concat([[T('map.approxIsland'), 'lbl-s']]) });
    });
    spots.forEach(function (s) {
      if (!s.crew_pick) return;
      out.push({ id: s.id, kind: 'pick', spot: s, lat: s.lat, lon: s.lon, prio: 2.8, g: 18, must: true, key: true,
        lines: pickLabelLines(s) });
    });
    var air = airportPlace();
    if (air && hasAirport) out.push({ id: 'airport', kind: 'air', lat: air.lat, lon: air.lon, prio: 2.5, g: 18, key: true, lines: [[tx(air, 'name'), 'lbl-b'], [airportBoatText(), 'lbl-s', 'f']] });
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
    setCredit($('#ov-credit'), sketchCredit());
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
      if (!ok) { ovNoteKey = 'map.ovNoLeaflet'; ovNote(T(ovNoteKey)); return; }
      try { buildOverviewMap(); } catch (e) {
        reportError(e);
        ovNoteKey = 'map.ovNoStart';
        ovNote(T(ovNoteKey));
      }
    });
  }
  var ovNoteKey = '';
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
    ovNoteKey = '';
    ovNote('');
    setCredit($('#ov-credit'), ov.M.creditText || mapCredit('Satellite'));
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
    setCredit($('#ov-credit'), sketchCredit());
    ovNoteKey = 'map.ovNoTiles';
    ovNote(T(ovNoteKey));
    drawSchematic('ov');
  }
  function setOvDrag(on) {
    var M = ov.M, mv = $('#ov-move');
    if (!M || !M.touch || !mv) return;
    if (on) M.map.dragging.enable(); else M.map.dragging.disable();
    // The words say the state ("Move map" / "Done moving"), so the button has no pressed state as well.
    mv.classList.toggle('is-on', on);
    mv.textContent = T(on ? 'ov.doneMoving' : 'ov.moveMap');
    $('#ov-box').classList.toggle('map-dragging', on);
  }
  function setOvView(v) {
    ov.view = v;
    var b = $('#ov-south');
    if (b) {
      b.classList.toggle('is-on', v === 'all');
      b.textContent = T(v === 'all' ? 'ov.backNorth' : 'ov.showSouth');
    }
    if (ov.leaflet && ov.M) fitView(ov.M, v, true);
    else drawSchematic('ov');
  }
  function ovCardTop(kickerHtml) {
    return '<div class="ov-card-top"><p class="ov-card-kicker">' + kickerHtml + '</p>' +
      '<button type="button" class="icon-btn ov-card-x" data-ov-close aria-label="' + Te('ov.cardClose') + '">' + CLOSE_SVG + '</button></div>';
  }
  function ovCardSpot(s) {
    var bt = boatTime(s);
    var kick = s.crew_pick ? '<span class="tag tag-pick">' + Te('tag.crewPick') + '</span>' : '<span class="tag">' + Te(accessKind(s) === 'resort' ? 'ov.tagResort' : 'ov.tagBreak') + '</span>';
    var km = (bt.kind === 'time' || bt.kind === 'unknown') ? Tv('ov.aboutKm', { km: bt.km, how: T(bt.kmFrom === 'pins' ? 'ov.kmPins' : 'ov.kmLine') }) : '';
    return ovCardTop(kick) + '<p class="ov-card-name">' + esc(tx(s, 'name')) + '</p>' +
      '<p class="ov-card-meta">' + Tve('ov.accessLine', { type: tx(s, 'type'), level: levelWords(s.level), access: accessLabel(s.access) }) + '</p>' +
      '<p class="ov-card-boat"><strong>' + Tve('ov.fromBase', { base: placeName(basePlace()) }) + '</strong> ' + esc(bt.text) + esc(km) + '.</p>' +
      '<a class="btn btn-solid ov-card-go" href="#spot-' + esc(s.id) + '">' + Te('ov.openSpots') + '</a>';
  }
  function ovCardStay(g) {
    var base = basePlace();
    return ovCardTop(Tve(g.options.length > 1 ? 'ov.stayKickerMany' : 'ov.stayKickerOne', { plan: planShort(state.plan) })) +
      '<p class="ov-card-name">' + esc(placeName(g.place)) + '</p><p class="ov-card-meta">' + Te('ov.stayPinNote') +
      (g.place.id !== base.id ? Tve('ov.stayBoatNote', { base: placeName(base), place: placeName(g.place) }) : '') + '</p>' +
      '<ul class="ov-card-list">' + g.options.map(function (o) {
        return '<li><span class="ov-card-li-name">' + esc(tx(o, 'name')) + '</span> <span class="ov-card-li-price">' +
          Tve('ov.eachNights', { price: hkd(o.pp_hkd.low, o.pp_hkd.high), nights: tripNights() }) + '</span> ' + chipT(o, 'status') + '</li>';
      }).join('') + '</ul>' +
      '<a class="btn btn-solid ov-card-go" href="#stay">' + Te('ov.openStay') + '</a>';
  }
  function ovCardAirport() {
    var air = airportPlace(), leg = airportLeg();
    return ovCardTop(Te('ov.airportKicker')) + '<p class="ov-card-name">' + esc(air ? tx(air, 'name') : T('ov.airportFallbackName')) + '</p>' +
      (leg ? '<p class="ov-card-meta">' + esc(tx(leg, 'title')) + ':</p><ul class="ov-card-list">' + leg.options.map(function (o) {
        return '<li><span class="ov-card-li-name">' + esc(tx(o, 'mode')) + '</span> <span class="ov-card-li-price">' + esc(tx(o, 'duration')) + ', ' +
          (o.cost_hkd.high === 0 ? Te('money.zero') : esc(hkd(o.cost_hkd.low, o.cost_hkd.high))) + ' ' + esc(perLabel(o.per)) + '</span> ' + chipT(o, 'status') + '</li>';
      }).join('') + '</ul>' : '') +
      '<a class="btn btn-solid ov-card-go" href="#transport">' + Te('ov.openTransport') + '</a>';
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
    el.innerHTML = '<div class="ov-list"><p class="ov-list-h">' + Tve('ov.listStayH', { plan: planShort(state.plan) }) + '</p><ul class="ov-rows">' +
      stays.map(function (g) {
        return g.options.map(function (o) {
          return '<li><a class="ov-row" href="#stay"><span class="ov-row-ic" aria-hidden="true">' + STAY_SVG + '</span>' +
            '<span class="ov-row-main"><span class="ov-row-name">' + esc(tx(o, 'name')) + '</span><span class="ov-row-sub">' + Tve('ov.approxIsland', { place: placeName(g.place) }) + '</span></span>' +
            '<span class="ov-row-side"><span class="ov-row-price">' + Tve('ov.eachNights', { price: hkd(o.pp_hkd.low, o.pp_hkd.high), nights: nights }) + '</span>' + chipT(o, 'status') + '</span></a></li>';
        }).join('');
      }).join('') + '</ul></div>' +
      '<div class="ov-list"><p class="ov-list-h">' + Te('ov.listPicksH') + '</p><ul class="ov-rows">' + picks.map(function (s) {
        return '<li><a class="ov-row" href="#spot-' + esc(s.id) + '"><span class="ov-row-ic" aria-hidden="true">' + PICK_SVG + '</span>' +
          '<span class="ov-row-main"><span class="ov-row-name">' + esc(tx(s, 'name')) + '</span><span class="ov-row-sub">' + Tve('ov.fromBaseShort', { base: placeName(base), boat: boatTime(s).short }) + '</span></span>' +
          '<span class="ov-row-side"><span class="ov-row-lvl">' + esc(levelWords(s.level)) + '</span></span></a></li>';
      }).join('') + '</ul>' +
      '<p class="ov-more"><a class="more" href="#spots">' + Tve('ov.allBreaks', { n: TRIP.spots.length }) + '</a>' +
      (southN ? '<span class="fine">' + Tve('ov.southNote', { n: southN }) + '</span>' : '') + '</p></div>';
  }

  /* ========================================================= the module map */
  var mod = { view: 'north', started: false, fallback: false, M: null, pendingSpot: null };
  function renderMapViews() {
    var root = renderInto('map-views', '<div class="seg-inline" role="group" aria-label="' + Te('spots.viewAria') + '">' +
      ['north', 'all', 'south'].map(function (v) {
        return '<button type="button" class="toggle" data-view="' + v + '" aria-pressed="' + (v === mod.view) + '">' +
          (v === 'all' ? Tve('spots.viewAll', { n: TRIP.spots.length }) : Te(v === 'north' ? 'spots.viewNorth' : 'spots.viewSouth')) + '</button>';
      }).join('') + '</div>');
    if (root) bindOnce(root, 'map-views', 'click', function (e) {
      var b = e.target.closest('[data-view]');
      if (b) setModView(b.getAttribute('data-view'));
    });
    var hint = $('#map-hint');
    if (hint) bindOnce(hint, 'map-hint', 'click', function (e) {
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
    if (n) $('[data-hint-text]', hint).textContent = n === 1 ? T('spots.hintOne') : Tv('spots.hintMany', { n: n });
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
      if (!ok) { moduleFallback('map.modNoLeaflet'); return; }
      try { buildModuleMap(); } catch (e) {
        reportError(e);
        moduleFallback('map.modNoStart');
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
      onTilesFailed: function () { moduleFallback('map.modNoTiles'); }
    });
    // A spot chosen before the map was ready (a fresh #spot-<id> link, "Open in Surf spots", a card): centre on it now.
    if (selectedSpot) selectSpot(selectedSpot, mod.pendingSpot === selectedSpot ? 'built' : 'init');
    mod.pendingSpot = null;
    var touchWrap = $('#map-touch'), touchBtn = $('[data-map-touch]');
    function setDrag(on) {
      if (!M.touch || !touchBtn) return;
      if (on) M.map.dragging.enable(); else M.map.dragging.disable();
      touchBtn.classList.toggle('is-on', on);
      touchBtn.textContent = T(on ? 'spots.doneMovingMap' : 'spots.moveMap');
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
  function moduleFallback(msgKey) {
    mod.fallback = true;
    mod.fallbackKey = msgKey;
    var el = $('#spot-map'), mt = $('#map-touch'), sk = $('#spot-schematic'), fb = $('#map-fallback'), box = $('#map-box');
    if (el) el.hidden = true;
    if (mt) mt.hidden = true;
    if (box) box.classList.add('is-sketch');
    if (sk) { sk.hidden = false; bindSchematic(sk, 'mod'); }
    if (fb) { fb.hidden = false; fb.textContent = T(msgKey); }
    setCredit($('#map-credit'), sketchCredit());
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
        ' aria-label="' + Tve('map.airportAria', { name: tx(air, 'name'), boat: airportBoatText() }) + '"><circle class="sk-hit" r="22"/><circle class="sk-ring" r="17"/><circle class="sk-air-disc" r="11"/>' +
        '<path class="sk-air-plane" transform="translate(-10 -10)" d="' + PLANE_PATH + '"/></g>');
    }
    // North arrow and scale bar, top left.
    var kmBar = [1, 2, 5, 10, 20, 50].filter(function (k) { return k * prj.sc >= 56; })[0] || 50, barW = kmBar * prj.sc;
    parts.push('<g class="sk-scale" aria-hidden="true"><path class="sk-north" d="M20 14l6 16-6-4-6 4z"/><text x="20" y="46" text-anchor="middle">' + Te('sketch.north') + '</text>' +
      '<path class="sk-bar" d="M40 30v6H' + r1(40 + barW) + 'v-6"/><text x="' + r1(40 + barW / 2) + '" y="24" text-anchor="middle">' + Tve('sketch.kmBar', { n: kmBar }) + '</text></g>');
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
      Tve('sketch.aria', { what: view === 'south' ? T('sketch.whatSouth') : view === 'all' ? Tv('sketch.whatAll', { n: TRIP.spots.length }) : T('sketch.whatNorth') }) + '">' + parts.join('') + '</svg>';
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
    var html = '<p class="fine">' + Tve('spots.boatIntro', { base: placeName(base) }) + '</p>' +
      '<ul class="bt-list">' + rows.map(function (s) {
        var bt = boatTime(s);
        var km = bt.kind === 'time' || bt.kind === 'unknown' ? Tv('spots.aboutKm', { km: bt.km }) + (bt.kmFrom === 'pins' ? T('spots.betweenPins') : '') : '';
        return '<li class="bt bt--' + bt.kind + (s.crew_pick ? ' is-pick' : '') + '">' +
          '<a class="bt-name" href="#spot-' + esc(s.id) + '">' + esc(tx(s, 'name')) + '</a>' +
          '<span class="bt-tags">' + (s.crew_pick ? '<span class="tag tag-pick">' + Te('tag.crewPick') + '</span>' : '') + '<span class="tag">' + esc(regionLabel(s.region)) + '</span></span>' +
          '<span class="bt-time">' + esc(bt.text) + '</span>' + (km ? '<span class="bt-km">' + esc(km) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    var root = renderInto('boat-times', html);
    if (root) clipList('boat-times', $('.bt-list', root), 'spots', 3, function (li) { return li.classList.contains('is-pick'); });
  }
  function renderAccessRules() {
    var groups = [
      ['public', T('access.publicH'), function (names, paddle) {
        return T('access.publicIntro') + (paddle.length ?
          Tv(paddle.length === 1 ? 'access.publicPaddleOne' : 'access.publicPaddleMany', { names: listWords(paddle), base: placeName(basePlace()) }) :
          T('access.publicAllBoat'));
      }],
      ['limited', T('access.limitedH'), function () { return T('access.limitedBody'); }],
      ['resort', T('access.resortH'), function () { return T('access.resortBody'); }]
    ];
    var culture = TRIP.essentials.culture || [];
    var ruleIdx = -1;
    culture.forEach(function (x, i) { if (ruleIdx === -1 && /guests only/i.test(x) && /surf|wave/i.test(x)) ruleIdx = i; });
    var rule = ruleIdx === -1 ? null : txi(culture, ruleIdx);
    var html = '<ul class="access-list">' + groups.map(function (g) {
      var ss = TRIP.spots.filter(function (s) { return accessKind(s) === g[0]; });
      if (!ss.length) return '';
      var paddle = ss.filter(function (s) { return boatTime(s).kind === 'paddle'; }).map(spotShort);
      return '<li class="access access--' + g[0] + '"><p class="access-h"><span class="access-n">' + ss.length + '</span> ' + esc(g[1]) + '</p>' +
        '<p>' + esc(g[2](ss, paddle)) + '</p><p class="access-spots">' + ss.map(function (s) {
          return '<a href="#spot-' + esc(s.id) + '">' + esc(spotShort(s)) + '</a>';
        }).join(', ') + '</p></li>';
    }).join('') + '</ul>' + (rule ? '<p class="fine">' + richHtml(rule, false, culture[ruleIdx]) + '</p>' : '');
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
      var sr = x ? x.sunrise : Tv('tides.about', { t: typical.sunrise }), ss = x ? x.sunset : Tv('tides.about', { t: typical.sunset });
      return '<tr><th scope="row">' + esc(tx(d, 'label')) + '</th><td>' + esc(sr) + '</td><td>' + esc(ss) + '</td><td>' + esc(tx(d, 'tide_hint')) + '</td></tr>';
    }).join('');
    var tideCount = (s.tides || []).length;
    var tideNote = tx(s, 'tide_note');
    renderInto('tides', '<div class="note note-warn">' + ICON.hazard + '<p><strong>' + esc(firstSentences(tideNote, 1)) + '</strong>' + (tideCount ? '' : Te('tides.below')) +
      '</p></div><details class="more-d"><summary>' + Te('tides.moreSummary') + '</summary><p>' + esc(restSentences(tideNote, 1)) + '</p></details>' +
      '<div class="table-wrap" tabindex="0" role="region" aria-label="' + Te('tides.tableAria') + '"><table class="tide-table"><thead><tr><th scope="col">' + Te('tides.day') + '</th><th scope="col">' + Te('tides.sunrise') + '</th><th scope="col">' + Te('tides.sunset') + '</th><th scope="col">' + Te('tides.outlook') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="fine">' + Te('tides.fine') + '</p>');
    var root = $('[data-render="tides"]');
    if (root) foldBlock('tides', [$('details', root), $('.table-wrap', root), $('.fine', root)], 'tides');
  }

  function renderRhythm() {
    var root = renderInto('rhythm', txs(TRIP.season.daily_rhythm).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join(''));
    clipList('rhythm', root, 'rhythm', 2);
  }

  /* --------------------------------------------------------------- itinerary */
  var showAllPlans = false;
  function dayKind(d) {
    var t = d.title;
    if (/flex/i.test(t)) return [T('itin.kindFlex'), 'flex'];
    if (/buffer/i.test(t)) return [T('itin.kindBuffer'), 'buffer'];
    if (/^surf day/i.test(t)) return [T('itin.kindSurf'), 'surf'];
    if (/last surf/i.test(t)) return [T('itin.kindSurfFly'), 'surf'];
    if (/^land in malé/i.test(t)) return [T('itin.kindArrive'), 'travel'];
    return [T('itin.kindTravel'), 'travel'];
  }
  function renderItinerary() {
    var html = '<div class="itin-tools">' +
      '<p class="itin-plan" data-itin-plan></p>' +
      '<label class="check"><input type="checkbox" data-itin-all' + (showAllPlans ? ' checked' : '') + '><span>' + Te(TRIP.plans.length === 2 ? 'itin.showBoth' : 'itin.showEvery') + '</span></label>' +
      '<div class="itin-btns"><button type="button" class="btn btn-quiet" data-itin-expand="1">' + Te('itin.openAll') + '</button>' +
      '<button type="button" class="btn btn-quiet" data-itin-expand="0">' + Te('itin.closeAll') + '</button></div></div>' +
      '<div class="days-wrap"><span class="days-progress" aria-hidden="true"></span><ol class="days">' + TRIP.itinerary.map(function (d, i) {
        var k = dayKind(d);
        return '<li class="day day--' + k[1] + '" id="day-' + esc(d.date) + '">' +
          '<h3 class="day-h"><button type="button" class="day-toggle" aria-expanded="' + (i === 0 ? 'true' : 'false') + '" aria-controls="day-body-' + i + '">' +
          '<span class="day-date">' + esc(tx(d, 'label')) + '</span>' +
          '<span class="day-title">' + esc(tx(d, 'title')) + '</span>' +
          '<span class="day-kind">' + esc(k[0]) + '</span>' +
          '</button></h3>' +
          '<div class="day-body" id="day-body-' + i + '"' + (i === 0 ? '' : ' hidden') + '>' +
          '<p class="day-surf"><strong>' + Te('itin.surf') + '</strong> ' + esc(tx(d, 'surf')) + '</p>' +
          '<ol class="blocks" data-day-blocks="' + i + '"></ol>' +
          '<div class="day-extra"><p><strong>' + Te('itin.flat') + '</strong> ' + esc(tx(d, 'flat_day_alt')) + '</p>' +
          '<p><strong>' + Te('itin.tide') + '</strong> ' + esc(tx(d, 'tide_hint')) + '</p></div>' +
          '</div></li>';
      }).join('') + '</ol></div>';
    var root = renderInto('itinerary', html);
    bindOnce(root, 'itin-click', 'click', function (e) {
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
    bindOnce(root, 'itin-change', 'change', function (e) {
      if (e.target.hasAttribute('data-itin-all')) { showAllPlans = e.target.checked; updateItineraryBlocks(); }
    });
    updateItineraryBlocks();
    initTimeline();
  }
  // The line down the side of the days fills as you scroll through them (a transform, updated once per frame).
  var timelineNudge = function () {};
  var timelineIO = null, timelineBound = false;
  function initTimeline() {
    var wrap = $('.days-wrap'), bar = $('.days-progress');
    if (!wrap || !bar) return;
    if (timelineIO) { try { timelineIO.disconnect(); } catch (e) { /* ignore */ } timelineIO = null; }
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
      timelineIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { active = en.isIntersecting; if (active) onScroll(); });
      }, { rootMargin: '200px 0px' });
      timelineIO.observe(wrap);
    }
    if (!timelineBound) {
      timelineBound = true;
      W.addEventListener('scroll', function () { timelineNudge(); }, { passive: true });
      W.addEventListener('resize', function () { timelineNudge(); });
    }
    update();
  }
  function recFlightName() {
    var rec = (TRIP.flights.options || []).filter(function (o) { return o.recommended; })[0];
    if (!rec) return T('flights.recFallback');
    return Tv('flights.recName', { airline: tx(rec, 'airline'), out: rec.outbound.legs[0].flight, home: rec.return.legs[0].flight });
  }
  function updateItineraryBlocks() {
    var p = state.plan;
    var planP = $('[data-itin-plan]');
    if (planP) planP.innerHTML = Th('itin.planNote', { role: planRole(p).toLowerCase(), flights: recFlightName() },
      { plan: '<strong>' + Tve('itin.planNoteStrong', { plan: planShort(p) }) + '</strong>' });
    TRIP.itinerary.forEach(function (d, i) {
      var ol = $('[data-day-blocks="' + i + '"]');
      if (!ol) return;
      ol.innerHTML = d.blocks.filter(function (b) { return showAllPlans || appliesTo(b.plans, p); }).map(function (b) {
        var specific = b.plans && b.plans.indexOf('all') === -1;
        var tag = specific ? '<span class="plan-tag plan-tag--' + esc(b.plans[0]) + '">' +
          Tve('itin.planTag', { plans: b.plans.map(function (x) { return planShort(x); }).join(T('words.listAnd')) }) + '</span>' : '';
        var dim = specific && !appliesTo(b.plans, p) ? ' is-other' : '';
        return '<li class="block' + (specific ? ' is-specific' : '') + dim + '"><span class="block-time">' + esc(tx(b, 'time')) + '</span><div class="block-what">' + tag + '<p>' + esc(tx(b, 'what')) + '</p></div></li>';
      }).join('');
    });
  }

  /* ----------------------------------------------------------------- flights */
  function legTime(t) {
    if (!t || /--:--/.test(t)) return '<span class="t-unknown">' + Te('flights.timeUnknown') + '</span>';
    return esc(t);
  }
  function routeHtml(dir, j) {
    var legs = j.legs, a = legs[0], z = legs[legs.length - 1];
    var vias = legs.slice(0, -1).map(function (l) { return l.to; });
    return '<div class="route">' +
      '<p class="route-dir">' + esc(dir) + ' <span>' + esc(tx(j, 'date')) + '</span></p>' +
      '<div class="route-line">' +
      '<div class="port"><span class="code">' + esc(a.from) + '</span><span class="time">' + legTime(a.dep) + '</span></div>' +
      '<div class="via"><span class="via-track" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M2 13l8-1 6-8h2l-3 8 5 .5 2-2.5h2l-1.5 4 1.5 4h-2l-2-2.5-5 .5 3 8h-2l-6-8-8-1z" fill="currentColor"/></svg></span>' +
      '<span class="via-text">' + Tve('flights.via', { list: vias.join(T('words.listSep')) }) + '</span><span class="via-lay">' + esc(tx(j, 'layover')) + '</span></div>' +
      '<div class="port port-end"><span class="code">' + esc(z.to) + '</span><span class="time">' + legTime(z.arr) + '</span></div>' +
      '</div>' +
      '<p class="route-meta">' + Tve('flights.routeMeta', { flights: legs.map(function (l) { return l.flight; }).join(' + '), duration: tx(j, 'duration') }) + '</p>' +
      '</div>';
  }
  function boardChip(o) {
    var l = TRIP.budget.lines.filter(function (x) { return x.choice === 'flight' && x.choice_id === o.id && /board/i.test(x.id); })[0];
    return l ? chipT(l, 'status') : '<span class="status status--quote">' + Te('flights.confirmWriting') + '</span>';
  }
  function renderFlights() {
    var F = TRIP.flights;
    var opts = F.options.slice().sort(function (a, b) { return (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0); });
    var html = '<p class="lede">' + esc(tx(F, 'summary')) + '</p>' +
      bookSummary(opts, { id: 'bookit-flights', nameField: 'airline', noneKey: 'book.sumNoneFlights' }) +
      '<div class="passes">' + opts.map(function (o) {
        var fee = o.board.fee_pp_hkd;
        return '<article class="pass' + (o.recommended ? ' is-rec' : '') + '" id="flight-' + esc(o.id) + '">' +
          '<div class="pass-main">' +
          '<header class="pass-head"><p class="pass-airline">' + esc(tx(o, 'airline')) + '</p>' +
          (o.recommended ? '<span class="stamp">' + Te('flights.ourPick') + '</span>' : '') +
          '<h3 class="pass-title">' + esc(tx(o, 'label')) + '</h3></header>' +
          routeHtml(T('flights.dirOut'), o.outbound) + routeHtml(T('flights.dirHome'), o.return) +
          '</div>' +
          '<div class="pass-stub">' +
          '<p class="stub-lbl">' + Te('flights.fareLbl') + '</p><p class="stub-fare">' + esc(hkd(o.fare_pp_hkd.low, o.fare_pp_hkd.high)) + '</p>' + chipT(o, 'fare_status') +
          '<p class="stub-lbl">' + Te('flights.boardLbl') + '</p><p class="stub-board">' + (fee.high === 0 ? Te('flights.boardFree') : esc(hkd(fee.low, fee.high))) + '</p>' + boardChip(o) +
          '</div>' +
          '<div class="pass-more">' +
          bookingAction(o, 'flight') +
          '<details class="more-d"><summary>' + Te('flights.boardRules') + '</summary><p>' + esc(tx(o.board, 'policy')) + '</p><p>' + esc(tx(o.board, 'limits')) + '</p></details>' +
          '<details class="more-d"><summary>' + Te('common.goodBad') + '</summary><div class="procon"><div><p class="pc-h">' + Te('common.good') + '</p><ul>' + txs(o.pros).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '<div><p class="pc-h">' + Te('common.watchOut') + '</p><ul>' + txs(o.cons).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div></details>' +
          srcLink(o.source, T('flights.fareSearch')) +
          '</div></article>';
      }).join('') + '</div>' +
      '<div class="two-col"><div><h3 class="h-sub">' + Te('flights.bookingTips') + '</h3><ul class="ticks">' + txs(F.booking_tips).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h3 class="h-sub">' + Te('flights.taxes') + '</h3><p>' + esc(tx(F, 'taxes_note')) + '</p>' +
      '<details class="more-d"><summary>' + Tve('flights.sources', { n: F.sources.length }) + '</summary><ul class="src-list">' + F.sources.map(function (u) { return '<li>' + srcLink(u, hostOf(u)) + '</li>'; }).join('') + '</ul></details></div></div>';
    var root = renderInto('flights', html);
    clipList('flights', $('.passes', root), 'flights', 1);
    clipList('booking-tips', $('.two-col .ticks', root), 'bookingTips', 3);
  }
  function hostOf(u) {
    try { var x = new URL(u); return x.hostname.replace(/^www\./, '') + (x.pathname.length > 1 ? x.pathname.replace(/\/$/, '').slice(0, 40) : ''); } catch (e) { return u; }
  }

  /* --------------------------------------------------------------- transport */
  function perLabel(per) { return T('per.' + per) || per; }
  // The airport boat and the daily surf boats are part of both plans; the South Malé day and airport taxis are extras.
  var CORE_LEGS = ['airport-to-thulusdhoo', 'daily-surf-boats'];
  function transportRelevant(legId) { return CORE_LEGS.indexOf(legId) !== -1; }
  function renderTransport() {
    var TR = TRIP.transport;
    var notes = txs(TR.notes);
    var html = '<div class="notes-grid"><ul class="ticks">' + notes.slice(0, 4).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' +
      '<ul class="ticks">' + notes.slice(4).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="boats-box"><h3>' + Te('transport.dailyTitle') + '</h3><p>' + esc(tx(TR.daily_boats, 'summary')) + '</p>' +
      '<div class="boats-nums"><p><span class="num">' + esc(hkd(TR.daily_boats.cost_pp_trip_hkd.low, TR.daily_boats.cost_pp_trip_hkd.high)) + '</span> ' + Te('transport.perSession') + '</p>' +
      '<p><span class="num">' + esc(hkd(TR.daily_boats.cost_pp_stay_hkd.low, TR.daily_boats.cost_pp_stay_hkd.high)) + '</span> ' + Te('transport.forTrip') + '</p>' + chip(T('status.legend.estimate'), 'estimate') + '</div>' +
      '<details class="more-d"><summary>' + Te('transport.addsUp') + '</summary><p>' + esc(tx(TR.daily_boats, 'basis')) + '</p>' + srcLink(TR.daily_boats.source) + '</details></div>' +
      '<div class="legs">' + TR.legs.map(function (leg) {
        return '<article class="leg" data-leg="' + esc(leg.id) + '">' + photoFigure(photoById(LEG_PHOTOS[leg.id]), 'card-ph', '(min-width: 1000px) 45vw, 92vw') + '<header class="leg-head"><h3>' + esc(tx(leg, 'title')) + '</h3><span class="tag tag-plan" data-leg-tag hidden>' + Te(TRIP.plans.length === 2 ? 'transport.bothPlans' : 'transport.everyPlan') + '</span></header>' +
          '<ul class="leg-opts">' + leg.options.map(function (o) {
            return '<li class="leg-opt"><div class="leg-main"><h4>' + esc(tx(o, 'mode')) + '</h4><p class="leg-dur">' + esc(tx(o, 'duration')) + '</p></div>' +
              '<div class="leg-price"><p class="num">' + (o.cost_hkd.high === 0 ? Te('money.zero') : esc(hkd(o.cost_hkd.low, o.cost_hkd.high))) + '</p><p class="per">' + esc(perLabel(o.per)) + '</p>' + chipT(o, 'status') + '</div>' +
              '<details class="more-d leg-notes"><summary>' + Te('common.details') + '</summary><p>' + esc(tx(o, 'notes')) + '</p>' + srcLink(o.source) + '</details>' +
              bookingAction(o, 'inline') + '</li>';
          }).join('') + '</ul></article>';
      }).join('') + '</div>';
    var root = renderInto('transport', html);
    var noteLists = $$('.notes-grid > .ticks', root);
    clipList('transport-notes', noteLists[0], 'notes', 3, null, { more: noteLists.slice(1), after: $('.notes-grid', root) });
    clipList('legs', $('.legs', root), 'legs', 2, function (el) { return transportRelevant(el.getAttribute('data-leg')); });
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
  // items: the strings to show (already in the reader's language); en: the English source, so the
  // status chip and the source links survive translation.
  function list(items, cls, en) {
    return '<ul class="' + (cls || 'ticks') + '">' + (items || []).map(function (x, i) {
      return '<li>' + richHtml(x, false, en && en[i]) + '</li>';
    }).join('') + '</ul>';
  }
  function listOf(arr, cls) { return list(txs(arr), cls, arr); }
  function stayChips(p) {
    var line = TRIP.budget.lines.filter(function (l) {
      return l.category === 'Stay' && !l.optional && !l.choice && l.high_hkd > 0 && (l.plans || []).indexOf(p.id) !== -1;
    })[0];
    var src = line || p;
    var out = chipT(src, 'status');
    if (line && statusKind(line.status) !== statusKind(p.status)) out += '<p class="fine plan-status-note">' + Tve('stay.figureNote', { status: tx(line, 'status') }) + chipT(p, 'status') + '</p>';
    return out;
  }
  function renderStay() {
    // "Book it" sits above the plan cards and follows the chosen plan (see updateStayPlan).
    var html = '<div data-book-stay></div><div class="plans">' + TRIP.plans.map(function (p, i) {
      return '<article class="plan-card" data-plan-card="' + esc(p.id) + '">' + photoFigure(photoById(STAY_PHOTOS[i]), 'card-ph', '(min-width: 1100px) 40vw, (min-width: 900px) 45vw, 92vw') +
        '<header><p class="plan-short">' + Tve('stay.planShort', { plan: planShort(p.id) }) + '</p>' + (p.recommended ? '<span class="stamp">' + Te('stay.stampCrew') + '</span>' : '<span class="stamp stamp-quiet">' + esc(planRole(p.id)) + '</span>') +
        '<h3>' + esc(tx(p, 'name')) + '</h3><p class="plan-tag-line">' + esc(tx(p, 'tagline')) + '</p></header>' +
        '<p class="plan-base">' + esc(tx(p, 'base')) + '</p>' +
        '<div class="plan-price"><p class="stub-lbl">' + Tve('stay.stayEach', { nights: tripNights() }) + '</p><p class="num">' + esc(hkd(p.stay_pp_hkd.low, p.stay_pp_hkd.high)) + '</p>' + stayChips(p) +
        '<p class="stub-lbl">' + Te('stay.wholeTrip') + '</p><p class="num num-sm" data-plan-total="' + esc(p.id) + '"></p>' + chip(T('status.legend.estimate'), 'estimate') + '</div>' +
        '<button type="button" class="btn btn-choose" data-plan-choose="' + esc(p.id) + '" aria-pressed="false">' + Te('plan.show') + '</button>' +
        '<p class="plan-who">' + esc(tx(p, 'who_for')) + '</p>' +
        '<details class="more-d"><summary>' + Te('stay.covers') + '</summary><p class="pc-h">' + Te('stay.included') + '</p>' + listOf(p.includes) + '<p class="pc-h">' + Te('stay.notIncluded') + '</p>' + listOf(p.excludes) + '<p class="fine">' + esc(tx(p, 'stay_basis')) + '</p></details>' +
        '<details class="more-d"><summary>' + Te('common.goodBad') + '</summary><p class="pc-h">' + Te('common.good') + '</p>' + listOf(p.pros) + '<p class="pc-h">' + Te('common.watchOut') + '</p>' + listOf(p.cons) + '</details>' +
        '</article>';
    }).join('') + '</div>' +
      '<h3 class="h-sub" id="stay-options-title" data-stay-title>' + Te('stay.placesTitle') + '</h3><p class="fine" data-stay-hint></p>' +
      '<div class="props" data-props></div>' +
      aboveBudgetHtml() +
      '<h3 class="h-sub" id="stay-not-available">' + Te('stay.naTitle') + '</h3>' +
      '<ul class="na-list">' + TRIP.not_available.map(function (n, i) {
        return '<li class="na' + (i === 0 ? ' na-lead' : '') + '"><h4>' + esc(tx(n, 'name')) + '</h4><p>' + esc(tx(n, 'why')) + '</p>' + srcLink(n.source) + '</li>';
      }).join('') + '</ul>';
    var root = renderInto('stay', html);
    bindOnce(root, 'stay-click', 'click', function (e) {
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
    clipList('not-available', $('.na-list', root), 'notAvailable', 2);
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
    return '<aside class="above" id="above-budget" aria-labelledby="above-budget-title"><h3 id="above-budget-title">' + Te('above.title') + '</h3><ul class="above-list">' + A.map(function (a) {
      var whyNot = tx(a, 'why_not');
      return '<li class="above-item"><h4>' + esc(tx(a, 'name')) + '</h4>' +
        '<p class="above-price"><span class="num num-sm">' + Tve('above.eachBefore', { price: hkd(a.pp_hkd.low, a.pp_hkd.high) }) + '</span>' + chipT(a, 'status') + '</p>' +
        '<p>' + esc(firstSentences(whyNot, 1)) + '</p>' +
        '<details class="more-d"><summary>' + Te('above.moreSummary') + '</summary><p>' + esc(restSentences(whyNot, 1)) + '</p><p>' + esc(tx(a, 'what')) + '</p></details>' +
        srcLink(a.source) + '</li>';
    }).join('') + '</ul></aside>';
  }
  function updateStayPlan() {
    var p = planById(state.plan);
    $$('[data-plan-card]').forEach(function (c) { c.classList.toggle('is-selected', c.getAttribute('data-plan-card') === state.plan); });
    updatePlanEstimates();
    var t = $('[data-stay-title]');
    if (t) t.textContent = Tv('stay.placesOnPlan', { plan: planShort(p.id) });
    var hint = $('[data-stay-hint]');
    var crewN = crewBase(), nights = tripNights();
    if (hint) hint.textContent = Tv('stay.placesHint', { crew: crewN, nights: nights, other: T(TRIP.plans.length === 2 ? 'stay.otherPlan' : 'stay.otherPlans') });
    var box = $('[data-props]');
    if (!box) return;
    box.innerHTML = p.options.map(function (o) {
      var rows = [[Tv('stay.roomsFor', { n: crewN }), tx(o, 'rooms_for_11')], [T('stay.meals'), tx(o, 'meals')], [T('stay.taxes'), tx(o, 'taxes')],
        [T('stay.cancelling'), tx(o, 'cancellation')], [T('stay.rating'), tx(o, 'rating')], [T('stay.availability'), tx(o, 'availability')]];
      return '<article class="prop"><header class="prop-head"><div><h4>' + esc(tx(o, 'name')) + '</h4><p class="prop-island">' + esc(tx(o, 'island')) + '</p><p class="prop-type">' + esc(tx(o, 'type')) + '</p></div>' +
        '<div class="prop-price"><p class="num">' + esc(hkd(o.pp_hkd.low, o.pp_hkd.high)) + '</p><p class="per">' + Tve('stay.eachNights', { nights: nights }) + '</p>' +
        '<p class="per">' + Tve('stay.forGroup', { price: hkd(o.total_group_hkd.low, o.total_group_hkd.high) }) + '</p>' + chipT(o, 'status') + '</div></header>' +
        '<p class="prop-cancel"><strong>' + Te('stay.cancellingLbl') + '</strong> ' + esc(tx(o, 'cancellation')) + '</p>' +
        '<details class="more-d"><summary>' + Te('stay.roomsSummary') + '</summary><dl class="kv">' + rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl></details>' +
        bookingAction(o, 'stay') +
        '<p class="src-row">' + srcLink(o.url, T('stay.seeListing')) + (stayPlaceId(o) ? '<a class="map-link" href="#top" data-ov-stay="' + esc(stayPlaceId(o)) + '">' + Te('stay.seeIsland') + '</a>' : '') + '</p></article>';
    }).join('');
    var sum = $('[data-book-stay]');
    if (sum) sum.innerHTML = bookSummary(p.options, { id: 'bookit-stay', nameField: 'name', noneKey: 'book.pricesChange' });
    clipList('props', box, 'props', 1);
  }

  /* ---------------------------------------------------------------- coaching */
  function renderCoaching() {
    var C = TRIP.coaching;
    var reality = tx(C, 'reality_check');
    var html = '<p class="lede">' + esc(tx(C, 'summary')) + '</p>' +
      '<div class="note note-warn">' + ICON.hazard + '<div><p><strong>' + Te('coach.realityCheck') + '</strong> ' + esc(firstSentences(reality, 2)) + '</p>' +
      '<details class="more-d"><summary>' + Te('coach.realityMore') + '</summary><p>' + esc(restSentences(reality, 2)) + '</p></details></div></div>' +
      '<div class="coach-plan" data-coach-plan></div>' +
      '<h3 class="h-sub">' + Te(TRIP.plans.length === 2 ? 'coach.packagesBoth' : 'coach.packagesEvery') + '</h3>' +
      '<ol class="packages">' + C.packages.map(function (k) {
        return '<li class="package" data-package="' + esc(k.id) + '"><header><h4>' + esc(tx(k, 'name')) + '</h4>' + defaultTags('coaching', k.id) + '</header>' +
          '<p class="num">' + (k.pp_hkd.high === 0 ? Te('money.zero') : esc(hkd(k.pp_hkd.low, k.pp_hkd.high))) + '</p><p class="per">' + Te('transport.forTrip') + '</p>' + chipT(k, 'status') +
          '<p>' + esc(tx(k, 'what')) + '</p><p class="fine">' + esc(tx(k, 'ratio')) + '</p>' +
          '<details class="more-d"><summary>' + Te('coach.howPriced') + '</summary><p>' + esc(tx(k, 'basis')) + '</p></details></li>';
      }).join('') + '</ol>' +
      '<h3 class="h-sub">' + Te('coach.programmeTitle') + '</h3>' +
      '<ol class="programme">' + C.programme.map(function (d) {
        return '<li><h4>' + esc(tx(d, 'day')) + '</h4><p><strong>' + Te('coach.focus') + '</strong> ' + esc(tx(d, 'focus')) + '</p><p><strong>' + Te('coach.where') + '</strong> ' + esc(tx(d, 'spot_idea')) + '</p>' +
          '<details class="more-d"><summary>' + Te('coach.drills') + '</summary><p>' + esc(tx(d, 'drills')) + '</p></details></li>';
      }).join('') + '</ol>' +
      '<h3 class="h-sub">' + Te('coach.whoTitle') + '</h3>' +
      '<div class="two-col">' + [[false, T('coach.openGroup')], [true, T('coach.guestsGroup')]].map(function (g) {
        var ps = C.providers.filter(function (p) { return !!p.guests_only === g[0]; });
        return '<div><h4 class="group-h">' + Tve('coach.groupCount', { label: g[1], n: ps.length }) + '</h4><ul class="providers">' + ps.map(function (p) {
          return '<li class="provider"><h5>' + esc(tx(p, 'name')) + '</h5><p class="fine">' + esc(tx(p, 'where')) + '</p>' +
            '<p class="tags">' + (p.video ? '<span class="tag">' + Te('coach.filmsTag') + '</span>' : '') + '<span class="tag">' + Te(p.guests_only ? 'coach.guestsTag' : 'coach.noStayTag') + '</span>' + chipT(p, 'status') + '</p>' +
            '<p>' + esc(tx(p, 'price_note')) + '</p><details class="more-d"><summary>' + Te('coach.offer') + '</summary><p>' + esc(tx(p, 'offer')) + '</p></details>' + srcLink(p.source) +
            bookingAction(p, 'inline') + '</li>';
        }).join('') + '</ul></div>';
      }).join('') + '</div>';
    var root = renderInto('coaching', html);
    clipList('programme', $('.programme', root), 'days', 0, null, { text: function (open, n) { return open ? T('clip.programmeHide') : Tv('clip.programmeShow', { n: n }); } });
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
      box.innerHTML = '<p>' + Th('coach.planCounts', { dflt: r.eff.coaching === defaultChoice('coaching', state.plan) ? T('coach.planDefault') : '' }, {
        plan: '<strong>' + Tve('stay.planShort', { plan: planShort(state.plan) }) + '</strong>',
        pkg: '<strong>' + esc(pk ? tx(pk, 'name') : r.eff.coaching) + '</strong>'
      }) + '</p>';
    } else {
      $$('[data-package]').forEach(function (li) { li.classList.remove('is-chosen'); });
      var lines = TRIP.budget.lines.filter(function (l) { return l.category === 'Coaching' && !l.choice && appliesTo(l.plans, state.plan) && l.plans.indexOf('all') === -1; });
      box.innerHTML = '<p>' + Th('coach.planNone', {}, { plan: '<strong>' + Tve('stay.planShort', { plan: planShort(state.plan) }) + '</strong>' }) + '</p><ul class="ticks">' +
        lines.map(function (l) { return '<li>' + esc(tx(l, 'label')) + ': ' + (l.high_hkd === 0 ? Te('money.zero') : esc(hkd(l.low_hkd, l.high_hkd))) + Te(l.basis === 'per_group' ? 'budget.forGroup' : 'budget.each') + ' ' + chipT(l, 'status') + '</li>'; }).join('') + '</ul>';
    }
  }
  // "Budget default" / "Mid default" tags, from budget.defaults.
  function defaultTags(group, id) {
    return TRIP.plans.filter(function (p) { return defaultChoice(group, p.id) === id; }).map(function (p) {
      return '<span class="stamp stamp-sm">' + Tve('budget.planDefault', { plan: planShort(p.id) }) + '</span>';
    }).join('');
  }
  function C_pkg(id) { return (TRIP.coaching.packages || []).filter(function (p) { return p.id === id; })[0]; }

  /* -------------------------------------------------------------------- food */
  var foodFilter = { island: 'all', top: false };
  function islandLabel(i, filter) {
    if (/^resort day pass$/i.test(i)) return T(filter ? 'food.islandResortFilter' : 'food.islandResort');
    return T('food.island.' + i) || i.replace(/^Male$/, 'Malé').replace(/^Hulhumale$/, 'Hulhumalé');
  }
  function renderFood() {
    var Fd = TRIP.food;
    var islands = [];
    Fd.restaurants.forEach(function (r) { if (islands.indexOf(r.island) === -1) islands.push(r.island); });
    var alcohol = txs(Fd.alcohol);
    var html = '<div class="note note-warn">' + ICON.hazard + '<div><p><strong>' + Te('food.alcoholTitle') + '</strong> ' + esc(alcohol[0]) + ' ' + esc(alcohol[1]) + '</p>' +
      '<details class="more-d"><summary>' + Tve('food.moreRules', { n: Math.max(0, Fd.alcohol.length - 2) }) + '</summary>' + list(alcohol.slice(2), null, Fd.alcohol.slice(2)) + '</details></div></div>' +
      '<h3 class="h-sub">' + Te('food.budgetTitle') + '</h3><div class="food-budget">' + Fd.daily_budget.map(function (b) {
        return '<div class="fb" data-food-style="' + esc(b.id) + '"><p class="fb-style">' + esc(tx(b, 'style')) + '</p><p class="fb-tags">' + defaultTags('food', b.id) + '</p>' +
          '<p class="num">' + esc(hkd(b.pp_day_hkd.low, b.pp_day_hkd.high)) + '</p><p class="per">' + Te('food.perDay') + '</p>' + chipParsed(b, 'basis') +
          '<details class="more-d"><summary>' + Te('food.howWorked') + '</summary><p>' + esc(tx(b, 'basis').replace(/^Status:[^.]*\.\s*/i, '')) + '</p></details></div>';
      }).join('') + '</div><p class="fine" data-food-plan></p>' +
      '<h3 class="h-sub">' + Te('food.whereTitle') + '</h3>' +
      '<div class="filters"><div class="filter-row"><div class="seg-inline" role="group" aria-label="' + Te('food.islandAria') + '">' + ['all'].concat(islands).map(function (i) {
        return '<button type="button" class="toggle" data-food-island="' + esc(i) + '" aria-pressed="' + (i === foodFilter.island) + '">' + esc(i === 'all' ? T('food.everywhere') : islandLabel(i, true)) + '</button>';
      }).join('') + '</div><button type="button" class="toggle" data-food-top aria-pressed="' + foodFilter.top + '">' + Te('food.topOnly') + '</button></div></div>' +
      '<p class="count" data-food-count aria-live="polite"></p>' +
      '<ul class="eats">' + Fd.restaurants.map(function (r, i) {
        var price = r.pp_hkd ? '<p class="num num-sm">' + Tve('food.eachPrice', { price: hkd(r.pp_hkd.low, r.pp_hkd.high) }) + '</p>' + chipParsed(r, 'group_note') : '<span class="status status--none">' + Te('food.noPrice') + '</span>';
        return '<li class="eat' + (r.top_pick ? ' is-top' : '') + '" data-eat="' + i + '"><div class="eat-main"><h4>' + esc(tx(r, 'name')) + (r.top_pick ? ' <span class="tag tag-pick">' + Te('food.topPick') + '</span>' : '') + '</h4>' +
          '<p class="fine">' + Tve('food.meta', { island: islandLabel(r.island, false), cuisine: tx(r, 'cuisine') }) + '</p>' +
          '<p><strong>' + Te('food.order') + '</strong> ' + esc(tx(r, 'order')) + '</p><p>' + esc(r.pp_hkd ? stripStatusTail(tx(r, 'group_note')) : tx(r, 'group_note')) + '</p></div>' +
          '<div class="eat-side"><p class="fine">' + esc(tx(r, 'rating')) + '</p>' + price + srcLink(r.source) + '</div></li>';
      }).join('') + '</ul>' +
      '<h3 class="h-sub">' + Te('food.dishesTitle') + '</h3><div class="dishes-wrap">' + photoFigure(photoById(DISH_PHOTO), '', '(min-width: 1000px) 320px, 92vw', 'dish-ph') +
      '<dl class="dishes">' + Fd.dishes.map(function (d) { return '<div><dt>' + esc(tx(d, 'name')) + '</dt><dd>' + esc(tx(d, 'what')) + '</dd></div>'; }).join('') + '</dl></div>';
    var root = renderInto('food', html);
    bindOnce(root, 'food-click', 'click', function (e) {
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
    if (c) c.textContent = !n ? T('food.noneMatch') : n === total ? Tv('food.countAll', { n: total }) : Tv('food.countSome', { n: n, total: total });
    clipList('eats', $('.eats'), 'places', 4);
  }
  function updateFoodPlan() {
    var el = $('[data-food-plan]');
    if (!el) return;
    var r = computeBudget(state);
    $$('[data-food-style]').forEach(function (d) { d.classList.toggle('is-chosen', d.getAttribute('data-food-style') === r.eff.food); });
    var line = r.counted.filter(function (c) { return c.line.category === 'Food'; })[0];
    el.innerHTML = Th('food.planCounts', {}, { plan: '<strong>' + Tve('stay.planShort', { plan: planShort(state.plan) }) + '</strong>' }) +
      (line ? Tve('food.planLine', { label: tx(line.line, 'label'), price: hkd(line.lo, line.hi) }) + chipT(line.line, 'status') : Te('food.noLine'));
  }

  /* -------------------------------------------------------------- activities */
  var actFilter = 'all';
  function actForLabel(t) { return T('act.for.' + t) || cap(t); }
  function renderActivities() {
    var A = TRIP.activities;
    var tags = [];
    A.forEach(function (a) { if (tags.indexOf(a.best_for) === -1) tags.push(a.best_for); });
    var flat = TRIP.headline.big_decisions.filter(function (d) { return /flat/i.test(d.question); })[0];
    var html = (flat ? '<div class="flatplan"><h3>' + esc(tx(flat, 'question')) + '</h3><p class="flat-pick">' + esc(tx(flat, 'our_pick')) + '</p><p>' + esc(tx(flat, 'why')) + '</p>' + listOf(flat.alternatives) + '</div>' : '') +
      '<h3 class="h-sub">' + Te('act.ideasTitle') + '</h3>' +
      '<div class="filters"><div class="filter-row"><div class="seg-inline" role="group" aria-label="' + Te('act.bestForAria') + '">' + ['all'].concat(tags).map(function (t) {
        return '<button type="button" class="toggle" data-act="' + esc(t) + '" aria-pressed="' + (t === actFilter) + '">' + esc(t === 'all' ? T('act.everything') : actForLabel(t)) + '</button>';
      }).join('') + '</div></div></div><p class="count" data-act-count aria-live="polite"></p>' +
      '<ul class="acts">' + A.map(function (a, i) {
        var free = a.pp_hkd.high === 0 && statusKind(a.status) !== 'quote';
        var ph = photoById(ACT_PHOTOS[a.id]);
        return '<li class="act' + (ph ? ' has-ph' : '') + '" data-act-i="' + i + '">' + (ph ? photoFigure(ph, 'card-ph', '(min-width: 1200px) 30vw, (min-width: 700px) 45vw, 92vw') : '') +
          '<header><span class="tag tag-for">' + esc(actForLabel(a.best_for)) + '</span><h4>' + esc(tx(a, 'name')) + '</h4></header>' +
          '<p class="fine">' + Tve('act.meta', { where: tx(a, 'where'), duration: tx(a, 'duration') }) + '</p>' +
          '<p class="act-price"><span class="num num-sm">' + (free ? Te('act.free') : Tve('act.eachPrice', { price: hkd(a.pp_hkd.low, a.pp_hkd.high) })) + '</span> ' + chipT(a, 'status') + '</p>' +
          '<p>' + esc(tx(a, 'group_note')) + '</p>' +
          '<details class="more-d"><summary>' + Te('act.seasonTax') + '</summary><p>' + esc(tx(a, 'season_note')) + '</p><p>' + esc(tx(a, 'tax_note')) + '</p></details>' + srcLink(a.source) +
          bookingAction(a, 'inline') + '</li>';
      }).join('') + '</ul>';
    var root = renderInto('activities', html);
    bindOnce(root, 'act-click', 'click', function (e) {
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
    if (c) c.textContent = n === total ? Tv('act.countAll', { n: total }) : Tv('act.countSome', { n: n, total: total });
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
    var html = '<p class="lede">' + Tve('budget.lede', { plan: planShort(rec.id), date: fmtDate(TRIP.meta.prices_checked) }) + '</p>' +
      '<div class="calc">' +
      '<form class="calc-controls" data-calc-form onsubmit="return false">' +
      '<fieldset class="cf"><legend>' + Te('budget.legPlan') + '</legend><p class="calc-note">' + Te('budget.planNote') + '</p><div class="opts" data-calc-plan></div></fieldset>' +
      '<fieldset class="cf"><legend>' + Te('budget.legFlight') + '</legend><div class="opts" data-calc-flight></div></fieldset>' +
      '<fieldset class="cf"><legend>' + Te('budget.legCoaching') + '</legend><div class="opts" data-calc-coaching></div></fieldset>' +
      '<fieldset class="cf"><legend>' + Te('budget.legFood') + '</legend><div class="opts" data-calc-food></div></fieldset>' +
      '<fieldset class="cf"><legend>' + Te('budget.legAddons') + '</legend><div class="opts" data-calc-addons></div></fieldset>' +
      '<fieldset class="cf"><legend>' + Te('budget.legCrew') + '</legend><div class="crew">' +
      '<button type="button" class="step" data-crew-step="-1" aria-label="' + Te('budget.stepDown') + '">−</button>' +
      '<label class="crew-num"><span class="vh">' + Te('budget.numPeople') + '</span><input type="number" inputmode="numeric" min="' + crewMin() + '" max="' + crewMax() + '" step="1" value="' + state.crew + '" data-crew-input></label>' +
      '<button type="button" class="step" data-crew-step="1" aria-label="' + Te('budget.stepUp') + '">+</button>' +
      '<input type="range" min="' + crewMin() + '" max="' + crewMax() + '" step="1" value="' + state.crew + '" data-crew-range aria-label="' + Te('budget.crewSlider') + '">' +
      '</div><p class="fine">' + Tve('budget.crewFine', { min: crewMin(), max: crewMax(), base: crewBase() }) + '</p></fieldset>' +
      '<button type="button" class="btn btn-quiet" data-calc-reset>' + Tve('budget.reset', { plan: planShort(rec.id) }) + '</button>' +
      '</form>' +
      // The totals block is built once and updated in place, so its numbers can tween and the dock can watch it.
      '<div class="calc-result" data-calc-result>' +
      '<div class="res-head" data-res-head>' +
      '<p class="res-lbl">' + Te('budget.eachPerson') + chip(T('status.legend.estimate'), 'estimate') + '</p><p class="res-pp" data-res-pp data-pp-low="" data-pp-high=""></p>' +
      '<p class="res-lbl">' + Te('budget.wholeCrew') + '<span data-res-crew></span></p><p class="res-group" data-res-group data-group-low="" data-group-high=""></p>' +
      '<p class="res-note" data-res-note></p>' +
      '<p class="res-picks" data-res-picks></p></div>' +
      '<div data-res-warn></div>' +
      '<p class="res-sub">' + Te('budget.whereMoney') + chip(T('status.legend.estimate'), 'estimate') + '</p>' +
      '<p class="res-key">' + Te('budget.barsKey') + '</p>' +
      '<ul class="bars" data-res-bars>' + CATEGORY_ORDER.map(function (c) {
        return '<li class="bar" data-cat="' + esc(c) + '"><div class="bar-top"><span class="bar-name">' + esc(T('cat.' + c) || c) + '</span><span class="bar-val"></span></div>' +
          '<span class="bar-track is-new" aria-hidden="true"><span class="bar-hi"></span><span class="bar-lo"></span></span></li>';
      }).join('') + '</ul>' +
      '<div data-res-lines></div>' +
      '</div>' +
      '</div>' +
      '<p class="vh" role="status" data-calc-status></p>' +
      '<div class="calc-dock" data-calc-dock hidden><div class="dock-nums"><p class="dock-note">' + Th('budget.dockNote', {}, { plan: '<span data-dock-plan></span>' }) + '</p>' +
      '<p class="dock-row"><span class="dock-lbl">' + Te('budget.dockEach') + '</span> <span class="dock-pp" data-dock-pp></span></p>' +
      '<p class="dock-row"><span class="dock-lbl">' + Th('budget.dockCrewOf', {}, { n: '<span data-dock-crew></span>' }) + '</span> <span class="dock-group" data-dock-group></span></p></div>' +
      '<button type="button" class="btn btn-solid dock-btn" data-dock-jump>' + Te('common.details') + '</button></div>' +
      '<details class="more-d method"><summary>' + Te('budget.howWorks') + '</summary><p>' + esc(tx(B, 'method_note')) + '</p></details>';
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
        if (s.getAttribute('aria-disabled') === 'true') { toast(Tv('toast.crewRange', { min: crewMin(), max: crewMax() })); return; }
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
        toast(Tv('toast.reset', { plan: planShort(d.plan) }));
      }
    });
  }
  var calcDockIOs = [];
  function initCalcDock(root) {
    var dock = $('[data-calc-dock]', root), controls = $('[data-calc-form]', root), head = $('[data-res-head]', root), result = $('[data-calc-result]', root);
    if (!dock || !controls || !head) return;
    calcDockIOs.forEach(function (io) { try { io.disconnect(); } catch (e) { /* ignore */ } });
    calcDockIOs = [];
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
    var io1 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { controlsIn = en.isIntersecting; });
      sync();
    }, { rootMargin: '0px 0px -80px 0px' });
    io1.observe(controls);
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { headIn = en.isIntersecting && en.intersectionRatio >= 0.85; });
      sync();
    }, { threshold: [0, 0.5, 0.85, 1] });
    io2.observe(head);
    calcDockIOs = [io1, io2];
    if (calcDockMq) return;
    calcDockMq = true;
    if (mq.addEventListener) mq.addEventListener('change', sync); else if (mq.addListener) mq.addListener(sync);
  }

  var calcDockMq = false;
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
      if (st) st.textContent = Tv('budget.statusLine', { plan: planShort(q.plan), pp: hkd(q.lo, q.hi), n: q.crew, group: hkd(q.groupLo, q.groupHi) });
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
    return defaultChoice(group, plan) === id ? ' <span class="stamp stamp-sm">' + Tve('budget.planDefault', { plan: planShort(plan) }) + '</span>' : '';
  }
  function renderCalcControls(all) {
    var crew = state.crew, plan = state.plan;
    var r = computeBudget(state);
    if (all) {
      $('[data-calc-plan]').innerHTML = TRIP.plans.map(function (p) {
        var est = computeBudget(stateForPlan(state, p.id));
        return radio('calc-plan', p.id, p.id === plan, Tv('budget.optPlanTitle', { plan: planShort(p.id), desc: planDesc(p.id) }),
          Th('budget.optPlanSub', { role: planRole(p.id) }, { price: '<span data-plan-est-calc="' + esc(p.id) + '">' + esc(hkd(est.lo, est.hi)) + '</span>' }), chip(T('status.legend.estimate'), 'estimate'));
      }).join('');
      $$('[data-calc-plan] input').forEach(function (i) { i.setAttribute('data-plan-input', ''); });
      var fl = $('[data-calc-flight]');
      fl.innerHTML = TRIP.flights.options.map(function (o) {
        var s = sumLines(choiceLines('flight', o.id, plan), crew);
        return radio('calc-flight', o.id, o.id === r.eff.flight, tx(o, 'label'), Tve('budget.optFlightSub', { price: hkd(s[0], s[1]) }) + defaultStamp('flight', o.id, plan), flightChips(o, plan));
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
    var coachSub = function (id) { var s = sumLines(choiceLines('coaching', id, plan), crew); return Tve('budget.optEach', { price: hkd(s[0], s[1]) }) + defaultStamp('coaching', id, plan); };
    var foodSub = function (id) { var s = sumLines(choiceLines('food', id, plan), crew); return Tve('budget.optFoodSub', { price: hkd(s[0], s[1]), nights: tripNights() }) + defaultStamp('food', id, plan); };
    var addonSub = function (l) {
      var d = l.basis === 'per_group' ? crew : 1;
      return l.basis === 'per_group' ? Tve('budget.optAddonGroup', { group: hkd(l.low_hkd, l.high_hkd), each: hkd(l.low_hkd / d, l.high_hkd / d) }) : Tve('budget.optEach', { price: hkd(l.low_hkd, l.high_hkd) });
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
        return radio('calc-coaching', id, id === r.eff.coaching, pk ? tx(pk, 'name') : id, coachSub(id), ls[0] ? chipT(ls[0], 'status') : '');
      }).join('') : '<p class="opt-none">' + Tve('budget.noCoachOpt', { plan: planShort(plan) }) + '</p>';
      $('[data-calc-food]').innerHTML = foodIds.length ? foodIds.map(function (id) {
        var ls = choiceLines('food', id, plan);
        return radio('calc-food', id, id === r.eff.food, foodName(id), foodSub(id), ls[0] ? chipT(ls[0], 'status') : '');
      }).join('') : '<p class="opt-none">' + Tve('budget.noFoodOpt', { plan: planShort(plan) }) + '</p>';
      $('[data-calc-addons]').innerHTML = addons.length ? addons.map(function (l) {
        return '<label class="opt opt-check"><input type="checkbox" value="' + esc(l.id) + '" data-addon' + (state.addons.has(l.id) ? ' checked' : '') + '>' +
          '<span class="opt-body"><span class="opt-title">' + esc(tx(l, 'label')) + '</span><span class="opt-sub">' + addonSub(l) + '</span>' + chipT(l, 'status') + '</span></label>';
      }).join('') : '<p class="opt-none">' + Te('budget.noAddons') + '</p>';
    }
    var inp = $('[data-crew-input]'), rng = $('[data-crew-range]');
    if (inp && document.activeElement !== inp) inp.value = crew;
    if (rng) rng.value = crew;
    syncCrewSteps(crew);
    $$('[data-calc-plan] input').forEach(function (i) { i.checked = i.value === plan; });
    clipList('addons', $('[data-calc-addons]'), 'addons', 0, function (el) {
      var box = el.querySelector && el.querySelector('input');
      return !box || box.checked;
    }, { text: function (open, n) { return open ? T('clip.addonsFewer') : Tv('clip.addonsShow', { n: n }); } });
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
    var fareRank = statusRank(o.fare_status), weaker = {}, weakLine = {};
    choiceLines('flight', o.id, plan).forEach(function (l) {
      if (/fare/.test(l.id) || statusRank(l.status) >= fareRank) return;
      var name = T(/board/.test(l.id) ? 'flights.chipBoard' : /bag/.test(l.id) ? 'flights.chipBag' : /card/.test(l.id) ? 'flights.chipCard' : 'flights.chipExtras');
      (weaker[l.status] = weaker[l.status] || []).push(name);
      weakLine[l.status] = weakLine[l.status] || l;
    });
    var out = chipLabeled(T('flights.chipFare'), o.fare_status, tx(o, 'fare_status'));
    Object.keys(weaker).forEach(function (st) { out += chipLabeled(cap(weaker[st].join(T('words.listSep'))), st, tx(weakLine[st], 'status')); });
    return '<span class="chips">' + out + '</span>';
  }
  function updateFlightSubs() {
    // Flight radios keep focus; refresh only their price text when the crew changes.
    var plan = state.plan, crew = state.crew;
    $$('[data-calc-flight] .opt').forEach(function (lab) {
      var inp = $('input', lab), sub = $('.opt-sub', lab);
      if (!inp || !sub) return;
      var s = sumLines(choiceLines('flight', inp.value, plan), crew);
      sub.innerHTML = Tve('budget.optFlightSub', { price: hkd(s[0], s[1]) }) + defaultStamp('flight', inp.value, plan);
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
    $('[data-res-note]', box).textContent = Tv('budget.resNote', { n: r.crew });
    $('[data-res-picks]', box).textContent = cap(picksText(state)) + '.';
    var unpriced = r.unpriced.map(function (l) { return tx(l, 'label'); });
    $('[data-res-warn]', box).innerHTML = unpriced.length ? '<div class="res-warn">' + ICON.hazard + '<div><p><strong>' + Te('budget.notPriced') + '</strong></p><ul>' + unpriced.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div></div>' : '';
    var maxHi = 0;
    CATEGORY_ORDER.forEach(function (c) { maxHi = Math.max(maxHi, r.cats[c].hi); });
    CATEGORY_ORDER.forEach(function (c) {
      var li = $('.bar[data-cat="' + c + '"]', box);
      if (!li) return;
      var k = r.cats[c];
      var value = !k.n ? T('budget.barNone') : k.hi === 0 ? T(k.quote ? 'budget.barZeroQuote' : (c === 'Coaching' && r.eff.coaching === 'none') ? 'budget.barZeroNone' : 'budget.barZeroIncl') : hkd(k.lo, k.hi);
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
      return '<li class="cl-group"><p class="cl-cat">' + esc(T('cat.' + c) || c) + '</p><ul>' + rows.map(function (x) {
        var l = x.line;
        var basis = l.basis === 'per_group' ? Tve('budget.lineGroup', { price: hkd(l.low_hkd, l.high_hkd), n: r.crew }) : Te('budget.linePerPerson');
        return '<li class="cl"><div class="cl-row"><span class="cl-label">' + esc(tx(l, 'label')) + '</span><span class="cl-amt">' + esc(hkd(x.lo, x.hi)) + '</span></div>' +
          '<p class="cl-basis">' + basis + ' ' + chipT(l, 'status') + '</p>' +
          '<details class="more-d"><summary>' + Te('budget.working') + '</summary>' + richHtml(tx(l, 'note'), true, l.note) + srcLink(l.source) + '</details></li>';
      }).join('') + '</ul></li>';
    }).join('');
    linesBox.innerHTML = '<details class="more-d res-lines"' + (open[0] ? ' open' : '') + '><summary>' + Tve('budget.everyLine', { n: r.counted.length }) + '</summary><ul class="cl-list">' + counted + '</ul></details>' +
      '<details class="more-d res-lines"' + (open[open.length - 1] && open.length > 1 ? ' open' : '') + '><summary>' + Te('budget.notInTotal') + '</summary>' + listOf(TRIP.budget.not_included) + '</details>';
  }

  /* --------------------------------------------------------------- prep */
  var store = {
    get: function (k) { try { return W.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { W.localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    remove: function (k) { try { W.localStorage.removeItem(k); } catch (e) { /* storage blocked */ } }
  };
  var PACK_KEY = 'maldives-surf-2026:packing:v2';
  var PACK_KEY_V1 = 'maldives-surf-2026:packing:v1';
  var ESSENTIALS = [['entry', 'prep.entry'], ['taxes', 'prep.taxes'], ['money', 'prep.money'], ['connectivity', 'prep.connectivity'], ['health', 'prep.health'], ['culture', 'prep.culture'], ['weather', 'prep.weather']];
  function packItem(it, gi, ii, arr) {
    // Items carry stable ids in the data; plain strings (older data) fall back to position + text.
    var text = typeof it === 'string' ? it : it.text;
    var shown = typeof it === 'string' ? txi(arr, ii) : tx(it, 'text');
    var legacy = 'p' + gi + '-' + ii + '-' + slug(text).slice(0, 24);
    return { id: typeof it === 'string' ? legacy : it.id, text: shown, legacy: legacy };
  }
  function storageWorks() {
    try {
      var k = 'maldives-surf-2026:probe';
      W.localStorage.setItem(k, '1');
      W.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }
  var packTicks = null;
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
      return { group: tx(g, 'group'), items: g.items.map(function (it, ii) { return packItem(it, gi, ii, g.items); }) };
    });
    var allItems = [];
    groups.forEach(function (g) { allItems = allItems.concat(g.items); });
    var ticked = packTicks || readTicks(allItems);
    var canSave = storageWorks();
    var html = '<div class="prep-grid"><div><h3 class="h-sub">' + Te('prep.timeline') + '</h3><ol class="timeline">' + E.todo.map(function (t) {
      return '<li><p class="tl-when">' + esc(tx(t, 'when')) + '</p><p class="tl-task">' + esc(tx(t, 'task')) + '</p>' +
        '<details class="more-d"><summary>' + Te('prep.why') + '</summary>' + richHtml(tx(t, 'why'), true, t.why) + (safeUrl(t.link) ? srcLink(t.link, T('prep.link')) : '') + '</details></li>';
    }).join('') + '</ol></div>' +
      '<div><h3 class="h-sub">' + Te('prep.packTitle') + '</h3><p class="pack-progress" data-pack-progress aria-live="polite"></p>' +
      '<span class="pack-meter" aria-hidden="true"><span data-pack-meter></span></span>' +
      (canSave ? '' : '<p class="pack-warn" data-pack-warn>' + Te('prep.packWarn') + '</p>') +
      '<div class="pack" data-pack>' + groups.map(function (g) {
        return '<fieldset class="pack-group"><legend>' + esc(g.group) + '</legend>' + g.items.map(function (it) {
          return '<label class="check"><input type="checkbox" value="' + esc(it.id) + '"' + (ticked.indexOf(it.id) !== -1 ? ' checked' : '') + '><span>' + esc(it.text) + '</span></label>';
        }).join('') + '</fieldset>';
      }).join('') + '</div>' +
      '<div class="pack-tools"><button type="button" class="btn btn-quiet" data-pack-clear>' + Te('prep.untick') + '</button>' +
      '<p class="pack-undo" data-pack-undo-row hidden><span data-pack-undo-msg></span> <button type="button" class="btn btn-quiet" data-pack-undo>' + Te('prep.undo') + '</button></p></div>' +
      '<p class="fine" data-pack-note>' + (canSave ? Te('prep.packNote') : '') + '</p>' +
      '<h3 class="h-sub">' + Te('prep.essentials') + '</h3><div class="accordions">' + ESSENTIALS.map(function (k) {
        return '<details class="acc"><summary>' + Tve('prep.accSummary', { label: T(k[1]), n: (E[k[0]] || []).length }).replace(/ \(/, ' <span class="acc-n">(') + '</span></summary>' + listOf(E[k[0]]) + '</details>';
      }).join('') + '</div></div></div>';
    var root = renderInto('prep', html);
    clipList('timeline', $('.timeline', root), 'steps', 6);
    var pack = $('[data-pack]', root);
    function checkedIds() {
      return $$('input[type=checkbox]', pack).filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
    }
    function save() {
      packTicks = checkedIds();
      var ok = store.set(PACK_KEY, JSON.stringify(packTicks));
      if (!ok && !$('[data-pack-warn]', root)) {
        $('[data-pack-progress]', root).insertAdjacentHTML('afterend', '<p class="pack-warn" data-pack-warn>' + Te('prep.packWarn') + '</p>');
        $('[data-pack-note]', root).textContent = '';
      }
      progress();
    }
    function progress() {
      var all = $$('input[type=checkbox]', pack), on = all.filter(function (i) { return i.checked; }).length;
      $('[data-pack-progress]', root).textContent = Tv('prep.packed', { n: on, total: all.length });
      $('[data-pack-meter]', root).style.setProperty('--w', (all.length ? on / all.length : 0).toFixed(4));
    }
    var undoIds = null, undoTimer;
    var undoRow = $('[data-pack-undo-row]', root);
    function hideUndo() { undoIds = null; undoRow.hidden = true; clearTimeout(undoTimer); }
    pack.addEventListener('change', function () { hideUndo(); save(); });
    $('[data-pack-clear]', root).addEventListener('click', function () {
      var before = checkedIds();
      if (!before.length) { toast(T('toast.nothingTicked')); return; }
      $$('input[type=checkbox]', pack).forEach(function (i) { i.checked = false; });
      save();
      undoIds = before;
      $('[data-pack-undo-msg]', root).textContent = Tv(before.length === 1 ? 'prep.untickedOne' : 'prep.untickedMany', { n: before.length });
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
      toast(T('toast.ticksRestored'));
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
  function sourceLabel(g) { return T('srcGroup.' + g) || SOURCE_LABELS[g] || g; }
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
    var html = '<div class="disclaimer"><p><strong>' + Tve('top.pricesChecked', { date: fmtDate(m.prices_checked) }) + '</strong> ' + esc(tx(m, 'disclaimer')) + '</p><p class="fine">' + esc(tx(m.fx, 'note')) + '</p></div>' +
      '<h3 class="h-sub">' + Tve('sources.confirmTitle', { n: TRIP.to_confirm.length }) + '</h3>' +
      '<ul class="confirm">' + TRIP.to_confirm.map(function (c) {
        return '<li class="confirm-item">' + ICON.hazard + '<div><p class="confirm-what">' + esc(tx(c, 'item')) + '</p>' +
          '<p class="confirm-meta"><span><strong>' + Te('sources.who') + '</strong> ' + esc(tx(c, 'who')) + '</span><span><strong>' + Te('sources.by') + '</strong> ' + esc(tx(c, 'by_when')) + '</span></p>' +
          '<p class="fine">' + esc(tx(c, 'why')) + '</p></div></li>';
      }).join('') + '</ul>' +
      '<h3 class="h-sub">' + Tve('sources.title', { n: TRIP.sources.length }) + '</h3><div class="accordions">' + names.map(function (g) {
        return '<details class="acc"><summary>' + esc(sourceLabel(g)) + ' <span class="acc-n">(' + groups[g].length + ')</span></summary><ul class="src-list">' + groups[g].map(function (s) {
          var uf = tx(s, 'used_for');
          return '<li>' + srcLink(s.url, tx(s, 'title')) + '<span class="fine">' + esc(uf === s.used_for ? relabelUsedFor(uf) : uf) + '</span></li>';
        }).join('') + '</ul></details>';
      }).join('') + '</div>' + photoCreditsHtml();
    var root = renderInto('sources', html);
    clipList('confirm', $('.confirm', root), 'confirm', 3);
    clipList('credits', $('.credits', root), 'credits', 4);
  }
  // Every photo on the page, in page order, with its licence and source page.
  function photoCreditsHtml() {
    if (!usedPhotos.length) return '';
    return '<h3 class="h-sub" id="photo-credits">' + Tve('sources.photoTitle', { n: usedPhotos.length }) + '</h3>' +
      '<p class="fine">' + Te('sources.photoNote') + '</p>' +
      '<ul class="credits">' + usedPhotos.map(function (p) {
        return '<li><p class="credit-who">' + esc(tx(p, 'credit')) + '</p><p class="fine">' + esc(captionText(p)) + '</p>' +
          '<p class="credit-links">' + srcLink(p.license_url, Tv('sources.licence', { license: tx(p, 'license') })) + srcLink(p.source_page, T('sources.sourcePage')) + '</p></li>';
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

  /* ------------------------------------------------------------ language */
  // Static markup carries data-i18n (text) and data-i18n-attr (one attribute).
  function applyI18nDom(root) {
    $$('[data-i18n]', root || document).forEach(function (el) {
      var val = T(el.getAttribute('data-i18n'));
      if (!val) return;
      var attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, val); else el.textContent = val;
    });
    document.documentElement.setAttribute('lang', htmlLangFor(lang));
  }
  // The switcher: a two-state EN / 中文 control in the menu panel and in the desktop
  // rail, plus a compact always-visible button in the sticky top bar on phones.
  function renderLangUI() {
    $$('[data-lang-seg]').forEach(function (box) {
      box.innerHTML = ['en', 'zh'].map(function (l) {
        var on = l === lang, off = !langReady(l);
        return '<button type="button" class="lang-opt' + (on ? ' is-on' : '') + (off ? ' is-off' : '') + '" data-lang-set="' + l + '"' +
          ' lang="' + (l === 'zh' ? htmlLangFor('zh') : 'en') + '"' +
          ' aria-pressed="' + on + '"' + (on ? ' aria-current="true"' : '') + '>' +
          '<span class="lang-opt-code">' + Te('lang.' + l) + '</span><span class="vh"> ' + Te('lang.' + l + 'Full') + '</span></button>';
      }).join('');
    });
    var b = $('#lang-btn');
    if (!b) return;
    var other = lang === 'en' ? 'zh' : 'en';
    b.setAttribute('data-lang-set', other);
    b.setAttribute('aria-pressed', lang === 'zh' ? 'true' : 'false');
    b.setAttribute('aria-label', T(other === 'zh' ? 'lang.toZh' : 'lang.toEn'));
    b.setAttribute('lang', other === 'zh' ? htmlLangFor('zh') : 'en');
    var txt = $('.lang-btn-text', b);
    if (txt) txt.textContent = T('lang.' + other);
  }
  // What the reader had open and where they were, so a switch lands in the same place.
  function captureView() {
    var bar = $('#topbar'), barH = bar && bar.offsetHeight ? bar.offsetHeight : 0;
    var anchor = null;
    $$('main > section, main > footer').forEach(function (s) {
      if (!s.getBoundingClientRect) return;
      var top = s.getBoundingClientRect().top;
      if (top <= barH + 8) anchor = { id: s.id, delta: top };
    });
    return {
      anchor: anchor,
      y: scrollTopNow(),
      details: $$('details').map(function (d) { return !!d.open; }),
      spots: $$('[data-spot-open]').filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })
        .map(function (b) { return b.getAttribute('data-spot-open'); }),
      days: $$('.day-toggle').map(function (b) { return b.getAttribute('aria-expanded') === 'true'; }),
      sheet: !!($('#spot-sheet') && $('#spot-sheet').classList.contains('is-open'))
    };
  }
  function restoreView(v) {
    $$('details').forEach(function (d, i) { if (v.details[i] !== undefined) d.open = v.details[i]; });
    v.spots.forEach(function (id) {
      var b = $('[data-spot-open="' + id + '"]'), body = $('#spot-body-' + id);
      if (b) b.setAttribute('aria-expanded', 'true');
      if (body) body.hidden = false;
    });
    $$('.day-toggle').forEach(function (b, i) {
      if (v.days[i] === undefined) return;
      b.setAttribute('aria-expanded', String(v.days[i]));
      var body = document.getElementById(b.getAttribute('aria-controls'));
      if (body) body.hidden = !v.days[i];
    });
    if (v.sheet && isSheetMode()) openSheet();
    if (typeof W.scrollTo !== 'function') return;
    var go = function () {
      var y = v.y;
      if (v.anchor) {
        var el = document.getElementById(v.anchor.id);
        if (el && el.getBoundingClientRect) y = Math.max(0, el.getBoundingClientRect().top + scrollTopNow() - v.anchor.delta);
      }
      scrollInstant(function () { W.scrollTo(0, y); });
    };
    go();
    if (W.requestAnimationFrame) W.requestAnimationFrame(go);
  }
  // Everything the language touches, rebuilt in place. State (plan, calculator picks,
  // filters, checklist ticks, the chosen spot) lives outside the DOM, so it survives.
  function rerenderAll() {
    [renderPlanPickers, renderNav, renderShare, renderTop, renderPlates, renderSeason, renderHeads, renderKeypoints,
      renderDecisions, renderCrew, renderVibe, renderPlanPick, renderBudget, renderFlights, renderStay, renderMapViews,
      renderSpotFilters, renderSpotList, applySpotFilter, renderBoatTimes, renderAccessRules, renderTides, renderRhythm,
      renderCoaching, renderTransport, renderActivities, renderFood, renderItinerary, renderPrep, renderSources
    ].forEach(function (fn, i) { safe(fn, 'lang-' + i); });
    emit('init');
    syncPlanInputs();
    safe(refreshMapsLang, 'lang-maps');
    // A language switch is not an arrival: nothing should fade in again.
    $$('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
    $$('.bar-track.is-new').forEach(function (t) { t.classList.remove('is-new'); });
    var st = $('#spot-status');
    if (st) st.textContent = '';   // a live region must not keep the other language's line
    if (selectedSpot) safe(function () { selectSpot(selectedSpot, 'init'); }, 'lang-spot');
  }
  function refreshMapsLang() {
    if (ovNoteKey) ovNote(T(ovNoteKey));
    setCredit($('#ov-credit'), ov.leaflet ? ((ov.M && ov.M.creditText) || mapCredit('Satellite')) : sketchCredit());
    var south = $('#ov-south');
    if (south) south.textContent = T(ov.view === 'all' ? 'ov.backNorth' : 'ov.showSouth');
    var mv = $('#ov-move');
    if (mv) mv.textContent = T(mv.classList.contains('is-on') ? 'ov.doneMoving' : 'ov.moveMap');
    var tb = $('[data-map-touch]');
    if (tb) tb.textContent = T(tb.classList.contains('is-on') ? 'spots.doneMovingMap' : 'spots.moveMap');
    var fb = $('#map-fallback');
    if (fb && mod.fallbackKey) fb.textContent = T(mod.fallbackKey);
    if (mod.fallback) setCredit($('#map-credit'), sketchCredit());
    renderOverviewLists();
    [ov.M, mod.M].forEach(function (M) {
      if (!M || !M.ready) return;
      var air = airportPlace();
      Object.keys(M.markers).forEach(function (k) {
        var mk = M.markers[k], s = spotById(k), el = mk.getElement && mk.getElement();
        if (el && s) el.setAttribute('aria-label', spotAria(s));
        if (s && mk.getTooltip && mk.getTooltip() && mk.setTooltipContent) mk.setTooltipContent(tx(s, 'name'));
      });
      if (M.airport && air) {
        var ael = M.airport.getElement && M.airport.getElement();
        if (ael) ael.setAttribute('aria-label', Tv('map.airportAria', { name: tx(air, 'name'), boat: airportBoatText() }));
      }
      addLayerControl(M);
      setMapStays(M);
    });
    if (ov.card) ovSelect(ov.card.type, ov.card.id);
    if (!ov.leaflet) drawSchematic('ov');
    if (mod.fallback) drawSchematic('mod');
  }
  function setLang(next) {
    next = next === 'zh' ? 'zh' : 'en';
    if (next === lang) { renderLangUI(); return true; }
    if (!langReady(next)) { toast(T('lang.unavailable')); renderLangUI(); return false; }
    var view = captureView();
    lang = next;
    store.set(LANG_KEY, lang);
    applyI18nDom();
    renderLangUI();
    rerenderAll();
    restoreView(view);
    toast(T(lang === 'zh' ? 'lang.switchedZh' : 'lang.switchedEn'));
    return true;
  }
  function initLang() {
    var saved = store.get(LANG_KEY);
    if (saved === 'zh' && langReady('zh')) lang = 'zh';
    else if (saved && saved !== 'en') store.remove(LANG_KEY);
    applyI18nDom();
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-lang-set]');
      if (!b) return;
      e.preventDefault();
      setLang(b.getAttribute('data-lang-set'));
    });
  }

  /* ---------------------------------------------------------------- init */
  function safe(fn, name) {
    try { fn(); } catch (e) {
      reportError(name + ': ' + (e && e.message));
      var el = $('[data-render="' + name + '"]');
      if (el && !el.innerHTML) el.innerHTML = '<p class="note">' + Te('error.section') + '</p>';
    }
  }
  function init() {
    if (!TRIP) {
      var main = $('#main');
      if (main) main.insertAdjacentHTML('afterbegin', '<p class="note">' + Te('error.noData') + '</p>');
      return;
    }
    // First visit: the recommended plan. Returning visitor: the plan they last looked at, if it still exists.
    // A plan tapped in the placeholder switcher before this script arrived (slow connections) wins over both.
    var early = $$('input[data-plan-input]').filter(function (i) { return i.checked && !i.hasAttribute('checked') && planById(i.value); })[0];
    if (early) savePlan(early.value);
    safe(initLang, 'lang');
    state = defaultState(early ? early.value : savedPlan() || recPlan().id);
    document.documentElement.classList.add('js');
    if (!reduceMotion) document.documentElement.classList.add('motion');
    safe(renderLangUI, 'lang-ui');
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
    W.MSTLang = {
      get: function () { return lang; },
      set: function (l) { return setLang(l); },
      available: function () { return { en: true, zh: langReady('zh') }; }
    };
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
