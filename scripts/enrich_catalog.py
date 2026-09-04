#!/usr/bin/env python3
"""
LuHabit — Katalog-Anreicherung, Phase 1.

Leitet aus name + equipment + secondary + rank automatisch die A-Felder ab.
Nichts wird ueberschrieben: bereits gesetzte Werte im Katalog bleiben stehen.

    python3 enrich_catalog.py lib/exercise-catalog.json -o catalog-enriched.json

Ausgabe zusaetzlich als Patch (nur id + neue Felder):
    python3 enrich_catalog.py lib/exercise-catalog.json --patch patch.json
"""

import argparse
import json
import re
import sys
from collections import Counter, defaultdict

# --------------------------------------------------------------------------
# 1. GUIDANCE  (4 = gefuehrt, 3 = halbgefuehrt, 2 = frei, 1 = instabil)
# --------------------------------------------------------------------------

UNSTABLE = re.compile(
    r"(exercise ball|stability ball|swiss ball|physio ?ball|bosu|balance"
    r"|wobble|suspension|\btrx\b|sling|slack)", re.I)

SEMI_GUIDED_NAME = re.compile(r"(smith|hack squat|pendulum|belt squat)", re.I)

GUIDANCE_BY_EQUIP = {
    "machine": 4,
    "cable": 3,
    "barbell": 2,
    "dumbbell": 2,
    "kettlebell": 2,
    "band": 2,
    "bodyweight": 2,
    "ball": 1,
    "other": 2,
}


def derive_guidance(name, equip):
    if UNSTABLE.search(name):
        return 1
    if SEMI_GUIDED_NAME.search(name):
        return 3
    return GUIDANCE_BY_EQUIP.get(equip, 2)


# --------------------------------------------------------------------------
# 2. RISK (1-5) + JOINT LOAD
# --------------------------------------------------------------------------

JOINT_PATTERNS = {
    "schulter": r"(behind (the )?neck|upright row|\bdip\b|overhead|snatch|jerk"
                r"|push press|around the world|pullover)",
    "lws":      r"(deadlift|good morning|bent[- ]over|romanian|clean|snatch"
                r"|hyperextension|jefferson|zercher|sit[- ]?up|russian twist)",
    "knie":     r"(sissy|jump|plyo|depth|lunge|split squat|step[- ]?up|pistol"
                r"|leg extension)",
    "ellenbogen": r"(skull ?crusher|french press|preacher|drag curl|kickback)",
    "handgelenk": r"(wrist|reverse grip|front squat|clean|upright row|planche)",
    "nacken":   r"(behind (the )?neck|shrug|neck)",
}
JOINT_RE = {k: re.compile(v, re.I) for k, v in JOINT_PATTERNS.items()}

HIGH_RISK = re.compile(
    r"(behind (the )?neck|upright row|good morning|sissy|jefferson"
    r"|snatch|clean|jerk|kipping|depth jump|dislocate)", re.I)

EXPLOSIVE = re.compile(
    r"(jump|plyo|clean|snatch|jerk|swing|slam|throw|toss|explosive|depth"
    r"|kipping|hop|bound)", re.I)


def derive_risk(name, equip, guidance, joint_load):
    """1 = harmlos, 5 = riskant."""
    risk = 2
    if guidance >= 4:
        risk = 1
    elif guidance == 3:
        risk = 2
    elif guidance == 2:
        risk = 3
    else:                      # instabil
        risk = 4
    if equip == "barbell":
        risk += 1
    if HIGH_RISK.search(name):
        risk += 2
    elif EXPLOSIVE.search(name):
        risk += 1
    if len(joint_load) >= 2:
        risk += 1
    if re.search(r"stretch|foam roll|mobility", name, re.I):
        risk = 1
    return max(1, min(5, risk))


# --------------------------------------------------------------------------
# 3. TECH DIFFICULTY (1-5)
# --------------------------------------------------------------------------

HIGH_TECH = re.compile(
    r"(snatch|clean|jerk|muscle[- ]?up|planche|front lever|back lever|human flag"
    r"|handstand|pistol|turkish get[- ]?up|windmill|overhead squat|iron cross)", re.I)
MID_TECH = re.compile(
    r"(deadlift|squat|bent[- ]over row|overhead press|dip|pull[- ]?up|chin[- ]?up"
    r"|romanian|front squat|hip thrust|lunge)", re.I)


def derive_tech(name, guidance):
    if HIGH_TECH.search(name):
        return 5
    if guidance >= 4:
        return 1
    if MID_TECH.search(name):
        return 4 if guidance <= 2 else 3
    return {3: 2, 2: 3, 1: 4}.get(guidance, 3)


# --------------------------------------------------------------------------
# 4. UNILATERAL / MOVEMENT TYPE / SPOTTER / STRETCH
# --------------------------------------------------------------------------

UNILATERAL = re.compile(
    r"(one[- ]arm|single[- ]arm|one[- ]leg|single[- ]leg|alternat|unilateral"
    r"|split squat|lunge|pistol|step[- ]?up|one hand)", re.I)

SPOTTER_LIFT = re.compile(r"(bench press|squat|overhead press|military press)", re.I)
RACK_SAFE = re.compile(r"(smith|machine|lever|cable|hack|leg press)", re.I)

STRETCH_EMPHASIS = re.compile(
    r"(incline (dumbbell )?(fly|curl)|overhead (triceps|extension)|romanian"
    r"|stiff[- ]?leg|pullover|deficit|\bdip\b|seated leg curl|preacher"
    r"|behind (the )?back|\bfly\b|deep|split squat|bulgarian|good morning)", re.I)

ISOLATION_NAME = re.compile(
    r"(curl|extension|raise|fly|flye|kickback|shrug|pullover|calf|crunch"
    r"|pushdown|pull[- ]?over|abduction|adduction|rotation)", re.I)
COMPOUND_NAME = re.compile(
    r"(press|row|squat|deadlift|pull[- ]?up|chin[- ]?up|\bdip\b|lunge|thrust"
    r"|clean|snatch|pulldown|push[- ]?up|step[- ]?up)", re.I)


def derive_movement(name, secondary):
    if COMPOUND_NAME.search(name):
        return "verbund"
    if ISOLATION_NAME.search(name):
        return "isolation"
    return "verbund" if len(secondary) >= 2 else "isolation"


def derive_spotter(name, equip):
    if equip != "barbell":
        return False
    if RACK_SAFE.search(name):
        return False
    return bool(SPOTTER_LIFT.search(name))


# --------------------------------------------------------------------------
# 5. REQUIRED GEAR (Calisthenics-Layer)
# --------------------------------------------------------------------------

GEAR_RULES = [
    (r"(pull[- ]?up|chin[- ]?up|hanging|hang |muscle[- ]?up|front lever"
     r"|back lever|toes to bar|knee raise)", "stange"),
    (r"(\bdip\b|dips|parallel bar)", "dip-barren"),
    (r"(ring |rings)", "ringe"),
    (r"(bench|incline|decline|seated|lying)", "bank"),
    (r"(box|step|bleacher)", "box"),
    (r"(exercise ball|stability ball|swiss ball|bosu)", "ball"),
]


def derive_gear(name, equip):
    gear = []
    for pat, tag in GEAR_RULES:
        if re.search(pat, name, re.I):
            gear.append(tag)
    if not gear and equip == "bodyweight":
        gear.append("nichts")
    return gear


# --------------------------------------------------------------------------
# 6. LADEART + MIN INCREMENT
# --------------------------------------------------------------------------

def derive_ladeart(name, equip, start_factor):
    if equip in ("dumbbell", "kettlebell", "barbell"):
        return "frei"
    if equip in ("bodyweight", "band", "ball"):
        return "ohne" if start_factor in (None, "") else "frei"
    if equip == "cable":
        return "steck"
    if equip == "machine":
        if re.search(r"(smith|plate[- ]?loaded|lever.*v\. ?\d)", name, re.I):
            return "scheiben"
        if re.search(r"(stretch|assisted)", name, re.I) and "assisted" not in name.lower():
            return "ohne"
        return "steck"          # Default Maschine: Stift
    return None


MIN_INCREMENT = {
    "steck": 5.0,
    "scheiben": 2.5,
    "frei": 2.0,
    "ohne": None,
}


def derive_increment(ladeart, equip):
    if equip == "cable":
        return 2.5
    if equip == "barbell":
        return 2.5
    return MIN_INCREMENT.get(ladeart)


# --------------------------------------------------------------------------
# 7. PROGRESSION TYPE
# --------------------------------------------------------------------------

def derive_progression(equip, start_factor, name):
    if re.search(r"(plank|hold|hang|isometric|static|\bl[- ]?sit\b|wall sit)", name, re.I):
        return "zeit"
    if equip == "bodyweight":
        return "zusatzgewicht" if start_factor else "reps"
    if equip == "band":
        return "reps"
    return "gewicht"


# --------------------------------------------------------------------------
# 8. FATIGUE COST (1-5)
# --------------------------------------------------------------------------

BIG_LIFT = re.compile(r"(deadlift|squat|clean|snatch|row.*barbell|barbell row)", re.I)
SMALL_ISO = re.compile(r"(raise|fly|curl|extension|kickback|calf|crunch|shrug)", re.I)


def derive_fatigue(name, movement, guidance, equip):
    if BIG_LIFT.search(name) and guidance <= 2:
        return 5
    if movement == "verbund":
        return 4 if guidance <= 2 else 3
    if SMALL_ISO.search(name):
        return 1 if equip in ("machine", "cable", "band") else 2
    return 2


# --------------------------------------------------------------------------
# 9. REP RANGE
# --------------------------------------------------------------------------

def derive_rep_range(muscle, movement, fatigue):
    if muscle in ("calves", "core"):
        return "12-20"
    if fatigue >= 5:
        return "5-8"
    if movement == "verbund":
        return "6-10"
    return "10-15"


# --------------------------------------------------------------------------
# 10. FAMILY / VARIANT
# --------------------------------------------------------------------------

VARIANT_TOKENS = [
    "v. 2", "v. 3", "v. 4", "v.2", "v.3",
    "on exercise ball", "on stability ball", "with stability ball",
    "one arm", "single arm", "one hand", "alternate", "alternating",
    "self-assisted", "assisted", "reverse grip", "reverse-grip", "palm-in",
    "wide grip", "wide-grip", "close grip", "close-grip", "narrow", "wide",
    "neutral grip", "hammer", "twisted", "partial", "with band", "with barbell",
    "with dumbbell", "to neck", "behind neck", "behind the neck", "slow", "fast",
]


def family_key(name):
    n = name.lower()
    n = re.sub(r"\(.*?\)", " ", n)
    for tok in VARIANT_TOKENS:
        n = n.replace(tok, " ")
    n = re.sub(r"[^a-z ]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n or name.lower()


VARIANT_MARK = re.compile(
    r"(v\. ?\d|\(|one arm|single arm|alternat|assisted|reverse[- ]grip"
    r"|exercise ball|stability ball|palm-in|twisted|partial)", re.I)


# --------------------------------------------------------------------------
# 11. AESTHETIC TAGS
# --------------------------------------------------------------------------

AESTHETIC_BY_REGION = {
    "lats": ["v-taper"],
    "back-upper": ["ruecken-dichte"],
    "traps": ["nacken"],
    "delts-side": ["breite-schulter", "v-taper"],
    "delts-rear": ["haltung"],
    "delts-front": ["schulterkappe"],
    "chest-upper": ["brustkante"],
    "chest-mid": ["brustvolumen"],
    "chest-lower": ["brustkante"],
    "abs": ["bauch-definition"],
    "obliques": ["taille"],
}
AESTHETIC_BY_MUSCLE = {
    "biceps": ["armdicke"],
    "triceps": ["armdicke"],
    "calves": ["waden"],
    "glutes": ["huefte"],
    "quads": ["beinvolumen"],
    "hamstrings": ["beinvolumen"],
}


def derive_aesthetic(muscle, region):
    tags = list(AESTHETIC_BY_REGION.get(region or "", []))
    tags += AESTHETIC_BY_MUSCLE.get(muscle, [])
    return tags


# --------------------------------------------------------------------------
# 12. DEUTSCHER NAME (Baustein-Woerterbuch)
# --------------------------------------------------------------------------

DE = [
    # Geraete / Setup (laengste zuerst!)
    ("smith machine", "Multipresse"), ("smith", "Multipresse"),
    ("exercise ball", "Gymnastikball"), ("stability ball", "Gymnastikball"),
    ("resistance band", "Widerstandsband"),
    ("ez bar", "SZ-Stange"), ("ez-bar", "SZ-Stange"),
    ("barbell", "Langhantel"), ("dumbbell", "Kurzhantel"),
    ("kettlebell", "Kettlebell"), ("cable", "Kabelzug"),
    ("lever", "Maschine"), ("machine", "Maschine"),
    ("band", "Band"), ("weighted", "mit Zusatzgewicht"),
    ("bodyweight", "Eigengewicht"),
    # Bewegungen
    ("bench press", "Bankdrücken"), ("chest press", "Brustpresse"),
    ("shoulder press", "Schulterdrücken"), ("overhead press", "Ueberkopfdrücken"),
    ("military press", "Nackendrücken"), ("push press", "Push Press"),
    ("leg press", "Beinpresse"), ("leg extension", "Beinstrecker"),
    ("leg curl", "Beinbeuger"), ("calf raise", "Wadenheben"),
    ("lat pulldown", "Latzug"), ("pulldown", "Latzug"),
    ("pull-up", "Klimmzug"), ("pull up", "Klimmzug"),
    ("chin-up", "Klimmzug Untergriff"), ("chin up", "Klimmzug Untergriff"),
    ("push-up", "Liegestütz"), ("push up", "Liegestütz"),
    ("deadlift", "Kreuzheben"), ("romanian", "rumänisch"),
    ("stiff leg", "gestrecktes Bein"), ("good morning", "Good Morning"),
    ("hip thrust", "Hip Thrust"), ("glute bridge", "Glute Bridge"),
    ("front squat", "Frontkniebeuge"), ("hack squat", "Hackenschmidt"),
    ("split squat", "Split Squat"), ("squat", "Kniebeuge"),
    ("lunge", "Ausfallschritt"), ("step-up", "Step-up"), ("step up", "Step-up"),
    ("upright row", "Aufrechtes Rudern"), ("bent-over row", "Vorgebeugtes Rudern"),
    ("bent over row", "Vorgebeugtes Rudern"), ("row", "Rudern"),
    ("shrug", "Schulterheben"), ("pullover", "Pullover"),
    ("lateral raise", "Seitheben"), ("front raise", "Frontheben"),
    ("rear delt", "hintere Schulter"), ("reverse fly", "Reverse Fly"),
    ("fly", "Fliegende"), ("flye", "Fliegende"),
    ("preacher curl", "Scottcurl"), ("hammer curl", "Hammercurl"),
    ("concentration curl", "Konzentrationscurl"), ("curl", "Curl"),
    ("skull crusher", "Stirndrücken"), ("french press", "Stirndrücken"),
    ("triceps extension", "Trizepsstrecken"), ("kickback", "Kickback"),
    ("pushdown", "Trizepsdrücken"), ("dip", "Dip"),
    ("crunch", "Crunch"), ("sit-up", "Sit-up"), ("sit up", "Sit-up"),
    ("leg raise", "Beinheben"), ("knee raise", "Knieheben"),
    ("plank", "Unterarmstütz"), ("russian twist", "Russian Twist"),
    ("hyperextension", "Hyperextension"), ("back extension", "Rückenstrecken"),
    ("face pull", "Face Pull"), ("pull-through", "Pull-through"),
    ("thruster", "Thruster"), ("clean", "Umsetzen"), ("snatch", "Reißen"),
    ("swing", "Swing"), ("carry", "Tragen"), ("hold", "Halten"),
    ("stretch", "Dehnung"), ("twist", "Drehung"), ("rotation", "Rotation"),
    ("abduction", "Abduktion"), ("adduction", "Adduktion"),
    ("extension", "Strecken"), ("raise", "Heben"), ("press", "Drücken"),
    # Position / Griff
    ("incline", "Schrägbank"), ("decline", "Negativbank"),
    ("seated", "sitzend"), ("standing", "stehend"), ("lying", "liegend"),
    ("kneeling", "kniend"), ("bent-over", "vorgebeugt"), ("bent over", "vorgebeugt"),
    ("prone", "bauchliegend"), ("supine", "rückenliegend"),
    ("overhead", "überkopf"), ("behind the neck", "hinter dem Nacken"),
    ("behind neck", "hinter dem Nacken"), ("front", "vorne"),
    ("reverse grip", "Untergriff"), ("reverse-grip", "Untergriff"),
    ("neutral grip", "Neutralgriff"), ("wide grip", "weiter Griff"),
    ("wide-grip", "weiter Griff"), ("close grip", "enger Griff"),
    ("close-grip", "enger Griff"), ("narrow", "eng"), ("wide", "weit"),
    ("one arm", "einarmig"), ("single arm", "einarmig"),
    ("one leg", "einbeinig"), ("single leg", "einbeinig"),
    ("alternate", "alternierend"), ("alternating", "alternierend"),
    ("assisted", "unterstützt"), ("self-assisted", "selbst unterstützt"),
    ("partial", "Teilwiederholung"), ("isometric", "isometrisch"),
    ("jump", "Sprung"), ("explosive", "explosiv"),
    ("with", "mit"), ("on", "auf"), ("to", "zum"),
]


def derive_name_de(name):
    n = " " + name.lower() + " "
    total = len(re.sub(r"[^a-z]", "", n))
    covered = 0
    for en, de in DE:
        pat = re.compile(r"(?<![a-z])" + re.escape(en) + r"(?![a-z])", re.I)
        found = pat.findall(n)
        if found:
            covered += len(re.sub(r"[^a-z]", "", en)) * len(found)
            n = pat.sub(" §" + de + "§ ", n)
    n = n.replace("§", "")
    n = re.sub(r"\s+", " ", n).strip()
    n = re.sub(r"\s+([,\)])", r"\1", n)
    parts = [p if p.islower() and p in ("mit", "auf", "zum", "sitzend", "stehend",
                                        "liegend", "kniend", "vorgebeugt", "einarmig",
                                        "einbeinig", "eng", "weit", "überkopf",
                                        "alternierend", "explosiv", "isometrisch")
             else (p[:1].upper() + p[1:] if p else p)
             for p in n.split(" ")]
    out = " ".join(parts)
    # Konfidenz: welcher Anteil des Originalnamens wurde uebersetzt
    ratio = covered / total if total else 0
    conf = "hoch" if ratio >= 0.85 else ("mittel" if ratio >= 0.6 else "niedrig")
    return out, conf


# --------------------------------------------------------------------------
# HAUPTLAUF
# --------------------------------------------------------------------------

DERIVED_FIELDS = [
    "guidance", "risk", "techDifficulty", "jointLoad", "movementType",
    "unilateral", "needsSpotter", "stretchEmphasis", "explosive",
    "requiredGear", "ladeart", "minIncrement", "progressionType",
    "fatigueCost", "repRange", "familyId", "isVariant", "aestheticTags",
    "nameDe", "nameDeConfidence", "rankNorm", "autoHideSuggestion",
]

AUTOHIDE_RULES = [
    ("instabil",        lambda e: e["guidance"] == 1),
    ("geraete-dublette", lambda e: bool(re.search(r"v\. ?\d", e["_name"], re.I))),
    ("einarmig",        lambda e: e["unilateral"] and e["_equip"] != "bodyweight"),
    ("explosiv",        lambda e: e["explosive"]),
    ("hochrisiko",      lambda e: e["risk"] >= 5),
    ("randgeraet",      lambda e: e["_equip"] in ("band", "ball", "kettlebell")),
    ("unterstützt",    lambda e: bool(re.search(r"assisted", e["_name"], re.I))),
]


def enrich(cat, overwrite=False):
    # rankNorm pro Muskelgruppe
    by_muscle = defaultdict(list)
    for ex in cat:
        by_muscle[ex.get("muscle")].append(ex.get("rank") or 0)
    norm = {}
    for m, ranks in by_muscle.items():
        s = sorted(ranks)
        for r in set(ranks):
            below = sum(1 for x in s if x < r)
            equal = sum(1 for x in s if x == r)
            norm[(m, r)] = round((below + equal / 2) / len(s), 3)

    fam_counter = Counter(family_key(ex["name"]) for ex in cat)

    out = []
    for ex in cat:
        name = ex["name"]
        equip = ex.get("equipment")
        muscle = ex.get("muscle")
        region = ex.get("region")
        secondary = ex.get("secondary") or []
        sf = ex.get("startFactor")

        d = {}
        d["guidance"] = derive_guidance(name, equip)
        d["jointLoad"] = [k for k, rx in JOINT_RE.items() if rx.search(name)]
        d["risk"] = derive_risk(name, equip, d["guidance"], d["jointLoad"])
        d["techDifficulty"] = derive_tech(name, d["guidance"])
        d["movementType"] = derive_movement(name, secondary)
        d["unilateral"] = bool(UNILATERAL.search(name))
        d["needsSpotter"] = derive_spotter(name, equip)
        d["stretchEmphasis"] = bool(STRETCH_EMPHASIS.search(name))
        d["explosive"] = bool(EXPLOSIVE.search(name))
        d["requiredGear"] = derive_gear(name, equip)
        d["ladeart"] = ex.get("ladeart") or derive_ladeart(name, equip, sf)
        d["minIncrement"] = derive_increment(d["ladeart"], equip)
        d["progressionType"] = derive_progression(equip, sf, name)
        d["fatigueCost"] = derive_fatigue(name, d["movementType"], d["guidance"], equip)
        d["repRange"] = derive_rep_range(muscle, d["movementType"], d["fatigueCost"])
        fk = family_key(name)
        d["familyId"] = "fam-" + re.sub(r"\s+", "-", fk)[:48]
        d["isVariant"] = fam_counter[fk] > 1 and bool(VARIANT_MARK.search(name))
        d["aestheticTags"] = derive_aesthetic(muscle, region)
        d["nameDe"], d["nameDeConfidence"] = derive_name_de(name)
        d["rankNorm"] = norm.get((muscle, ex.get("rank") or 0), 0.5)

        probe = dict(d, _name=name, _equip=equip)
        d["autoHideSuggestion"] = [tag for tag, fn in AUTOHIDE_RULES if fn(probe)]

        merged = dict(ex)
        for k, v in d.items():
            if overwrite or k not in merged or merged.get(k) in (None, "", []):
                merged[k] = v
        out.append(merged)
    return out


def report(enriched):
    n = len(enriched)
    print(f"\n{'='*66}\n  {n} Uebungen angereichert\n{'='*66}")

    def dist(field):
        c = Counter(
            tuple(e[field]) if isinstance(e[field], list) else e[field]
            for e in enriched)
        return ", ".join(f"{k}: {v}" for k, v in
                         sorted(c.items(), key=lambda x: -x[1])[:6])

    for f in ["guidance", "risk", "techDifficulty", "movementType",
              "progressionType", "repRange", "ladeart", "nameDeConfidence"]:
        print(f"  {f:18s} {dist(f)}")

    print(f"  {'unilateral':18s} {sum(1 for e in enriched if e['unilateral'])}")
    print(f"  {'needsSpotter':18s} {sum(1 for e in enriched if e['needsSpotter'])}")
    print(f"  {'stretchEmphasis':18s} {sum(1 for e in enriched if e['stretchEmphasis'])}")
    print(f"  {'isVariant':18s} {sum(1 for e in enriched if e['isVariant'])}")
    print(f"  {'Familien':18s} {len({e['familyId'] for e in enriched})}")

    jl = Counter(j for e in enriched for j in e["jointLoad"])
    print(f"  {'jointLoad':18s} {dict(jl)}")

    ah = Counter(t for e in enriched for t in e["autoHideSuggestion"])
    print(f"\n  Ausblend-Vorschlaege pro Regel:")
    for k, v in ah.most_common():
        print(f"      {k:20s} {v}")
    hidden = sum(1 for e in enriched if e["autoHideSuggestion"])
    print(f"      {'-> insgesamt':20s} {hidden}  (bleiben sichtbar: {n - hidden})")

    # Profil "Aesthetic": zusaetzlich harte Kriterien
    aes = [e for e in enriched
           if not e["autoHideSuggestion"]
           and not (e["guidance"] <= 2 and e["risk"] >= 4)
           and not e["isVariant"]]
    print(f"\n  Profil 'Aesthetic/gelenkschonend': {len(aes)} Uebungen sichtbar")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("catalog")
    ap.add_argument("-o", "--out")
    ap.add_argument("--patch")
    ap.add_argument("--overwrite", action="store_true",
                    help="bestehende Werte ueberschreiben (Standard: nein)")
    a = ap.parse_args()

    cat = json.load(open(a.catalog, encoding="utf-8"))
    if isinstance(cat, dict):
        cat = cat.get("exercises") or next(v for v in cat.values() if isinstance(v, list))

    enriched = enrich(cat, overwrite=a.overwrite)
    report(enriched)

    if a.out:
        json.dump(enriched, open(a.out, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print(f"\n  geschrieben: {a.out}")
    if a.patch:
        patch = [{"id": e["id"], **{k: e[k] for k in DERIVED_FIELDS}}
                 for e in enriched]
        json.dump(patch, open(a.patch, "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print(f"  geschrieben: {a.patch}")
    if not a.out and not a.patch:
        print("\n  (kein -o / --patch angegeben, nichts geschrieben)")


if __name__ == "__main__":
    main()
