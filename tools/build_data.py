"""Build app/data/trophies.json for the v2 entry.

Official names, descriptions and grades are read verbatim from the v1 app (the
PlayStation list, which the gate checks). Everything else - chapter, stage,
counts, numbered guide steps and inline citations - is written here and expanded
into per-trophy source objects with a shared source register.
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
V1 = HERE.parent / 'gta6-trophy-atlas' / 'app' / 'data' / 'trophies.json'
OUT = HERE / 'app' / 'data' / 'trophies.json'
READ = '2026-11-19'

SOURCES = {
    'psn': ('PSNProfiles — GTA VI trophy list', 'https://psnprofiles.com/trophies/43531-grand-theft-auto-vi'),
    'gba': ('GTABase — GTA 6 Trophy Guide & Achievements', 'https://www.gtabase.com/articles/gta-6/gta-6-achievements-trophies-list-ps5-xbox-series'),
    'ppx': ('PowerPyx — GTA 6 Trophy Guide & Roadmap', 'https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/'),
    'p100': ('PowerPyx — GTA 6 100% Completion Checklist', 'https://www.powerpyx.com/gta-6-100-completion-checklist-guide/'),
    'psg': ('Push Square — GTA 6 Trophy Guide & Roadmap', 'https://www.pushsquare.com/guides/gta-6-trophy-guide-and-roadmap'),
    'ps100': ('Push Square — GTA 6 100% Checklist', 'https://www.pushsquare.com/guides/gta-6-100percent-completion-checklist'),
    'six': ('SixShore — Trophies, Missables & Roadmap', 'https://sixshore.com/gta-6/guides/trophies-and-achievements/'),
    'fg': ('GTA6 Field Guide — Trophy list', 'https://gta6fieldguide.com/trophies'),
    'exo': ('ExPhase — GTA VI PS5 trophies', 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/'),
    'tt': ('TrueTrophies — GTA VI trophies', 'https://www.truetrophies.com/game/Grand-Theft-Auto-VI/trophies'),
    'cards': ('PowerPyx — All Collectible Card Sets', 'https://www.powerpyx.com/gta-6-all-collectible-card-sets-locations/'),
    'bank': ('PowerPyx — All Bank Jobs & Vaults', 'https://www.powerpyx.com/gta-6-all-bank-jobs-locations-bank-vaults/'),
    'range': ('PowerPyx — Shooting Range Gold Medals', 'https://www.powerpyx.com/gta-6-all-shooting-range-gold-medal-challenges/'),
    'gang': ('PowerPyx — Illegal Gang Operations', 'https://www.powerpyx.com/gta-6-all-illegal-gang-operations-locations/'),
    'ign': ('IGN — GTA 6 100% Guide', 'https://widgets.ign.com/wikis/gta-6/GTA_6_100_Percent_Guide'),
}

# id|kind|chapter|stage|flags|count label|numeric target|source keys|guide (¶ separates steps)
ROWS = r"""
1|completion|Platinum|5||all 54 other trophies|54|ppx,gba,psn|Nothing to hunt here: it fires when the other 54 are registered [1][2]. All 55 are offline, so no multiplayer is required [1]. Treat the Gold A Long Road as the real gate and work the five stages in order [1][3].
2|story|Ch.1 · Gone Fishing|1||automatic|0|ppx,gba,fg|Just play the opening mission, Gone Fishing; the trophy arrives with it [1][2]. It is automatic and cannot be missed [2]. Story trophies stay hidden on PlayStation until earned, so expect it to appear only then [3].
3|story|Ch.1 · first mission|1||automatic|0|ppx,gba,fg|Clear the first mission of Chapter 1 and this one comes in on its own [2][1]. GTABase marks it unmissable [2]. No special choice or medal is involved [1].
4|story|Ch.2 · opening|1||automatic|0|ppx,gba,fg|Start Chapter 2 with What's in the Bag? and the trophy pops [2]. PowerPyx lists it as an automatic story unlock that cannot be missed [1]. Nothing optional gates it [3].
5|story|Ch.3 · opening|1||automatic|0|ppx,gba,fg|Finish Chapter 2; the trophy lands as Chapter 3 begins, after Welcome to Vice City [2]. PowerPyx notes it is automatic [1]. A previous manual save at the chapter boundary is enough to replay it if needed [1].
6|story|Ch.4 · opening|1||automatic|0|ppx,gba,fg|The Chapter 3 close-out pays this trophy off after the first two missions of Chapter 4, Ocean Beach and Another Life [2]. It is automatic and cannot be missed [1]. No collectible or side activity is involved [3].
7|story|Ch.4 · final mission|1||automatic|0|ppx,gba,fg|Finish the story's last main mission, Starting From Zero, and the Gold arrives [1][2]. Free roam continues afterwards, so every cleanup trophy remains available [1]. There is no New Game+ and no mission replay, so save before the finale [1].
8|story|Ch.2 · Breakfast Run|1||automatic|0|ppx,gba,fg|Complete Breakfast Run in Chapter 2; the trophy follows the mission [2][1]. It is an automatic story award and cannot be missed [2]. Keep a chapter-boundary save as a precaution [1].
9|story|Ch.3 · The Cartel Heist|1||automatic|0|ppx,gba,fg|The Cartel Heist in Chapter 3 awards this trophy on completion [2][1]. No grading or optional objective changes the unlock [1]. It is listed as unmissable [2].
10|story|Ch.4 · Child's Play|1||automatic|0|ppx,gba,fg|Finish Child's Play in Chapter 4 and it unlocks automatically [2][1]. There is no alternate outcome to chase [1]. The trophy is not missable [2].
11|story|Ch.4 · Headliners|1||automatic|0|ppx,gba,fg|Clear Headliners in Chapter 4 for this story trophy [2][1]. It is automatic; nothing in the mission is flagged for a trophy by the guides [1]. It cannot be missed [2].
12|story|Ch.4 · VCIA Takedown|1||automatic|0|ppx,gba,fg|The VCIA Takedown mission in Chapter 4 hands this one over automatically [2][1]. No special approach is documented by the sources [1]. It cannot be missed [2].
13|story|Ch.5 · Operation Savage Glory|1||automatic|0|ppx,gba,fg,six|Play Operation Savage Glory in Chapter 5; the trophy follows the mission [2][1]. All twelve story trophies are automatic and unmissable [4]. Save at the chapter start and end, since there is no mission replay [1].
14|completion|Post-story · 100%|3||100% checklist|100|gba,p100,ps100,ppx|The Gold for the in-game 100% checklist, hidden until the story ends and then found under Progress > Stats > 100% Completion [1][2]. Work done during the story already counts [2]. Only five categories need everything: robberies, underwater finds, shooting ranges, drone races and Bret's hunts; most other lines need only a share (300 of 397 stunts, 70 of 80 challenges, 200 of 277 base vehicles, 15 of 18 meditations) [2][3]. PowerPyx calls it closer to 60% true completion and says nothing on the checklist is missable [4][2].
15|activities|Free roam · Stunts|3||250 stunts|250|gba,ppx,psg,psn|Any 250 of the 397 stunts count, in any mix [1][2]. Under-the-bridge flights are the fastest way to stack them [2]. The optional challenge attached to a stunt is not needed; performing it once is enough [2]. Track progress under Progress > Activities > Stunts; 100% asks for 300 [1][3].
16|activities|Free roam · Activities|3||9 activity types|9|gba,ppx,psn|Try each of nine activities once: fishing, hunting, golf, a shooting range, pool, basketball, an arcade game, a race win and a stunt [1][2]. A single basket is enough for basketball [1]. Progress > Activities shows which types are still outstanding [2]. Most are introduced by the story or appear as the map opens up [2].
17|activities|Ch.1+ · Shooting ranges|3||42 gold medals|42|gba,psg,range,ppx|Gold-medal every shooting-range challenge: 42 golds across 12 challenges at two ranges, Rodgers Ranch in Port Gellhorn and Griffin Range north-west of Vice City [1][2]. Buy the $5 Waiver Pass from the clerk so challenges appear on the map; rented weapons will do [3]. Play as Lucia at Griffin, where she runs faster, and bank the permanent Focus upgrade each finished challenge grants [3]. All 42 are also a 100% requirement [4].
18|activities|Free roam · Top Fun|3||14 drone locations|14|gba,psg,psn|Win a Top Fun drone race at each of the 14 locations; one win per site is enough [1]. Some sites charge an entry fee [2]. Find them under Touch Pad > Activities > Drones > Top Fun Drones [2]. The 100% checklist is stricter: all 42 time trials across the 14 sites [2].
19|activities|Free roam · Racing|3||20 different races|20|gba,psg,psn|Win 20 different races; repeating the same one does not advance the count [1][2]. Track the set in Touch Pad > Activities > Racing [2]. Most race locations let you hire a car, so a fast ride is never far away [2]. For 100%, aim at 30 unique wins rather than 20 [3].
20|side|Ch.1 · Cal (fishing)|2||fishing challenge|0|gba,ppx,psg|After the Chapter 1 mission Feng Shui, Cal texts you and marks a fishing spot [1][2]. Work through his favours, then beat him in the fishing challenge to earn the trophy [1]. Push Square specifies a Parrotfish over 2 kg in the marked area, so bring a boat with a rod (hijack one nearby if needed) [3]. Nothing about this quest is flagged as missable [2].
21|activities|Ch.1+ · Arcades|2||1 arcade game|0|gba,ppx,fg|Finish any one arcade game from start to end; its side challenges are optional [1][2]. Three games - Tenebrae Lux, Street Trash III and Time Jackers Rewind - are on the home TV from Chapter 1, while Bang For Your Buck sits on cabinets around Leonida [2]. The TV is unavailable during some story sections but works again after the story [2]. All four games are needed for 100% [3].
22|side|Ch.3 · Andy (Lucia)|2||5 Andy quests|5|gba,ppx,psg|Andy's text with a Belville address starts this Lucia-only strand in Chapter 3 [1][2]. Do the five jobs in order: Climbing the Cellerichain, Pay the Cellerica Fee, Peach!, Read the Label, then Puff Puff Pass for the trophy [1]. All remain available after the story [1][2]. Push Square simply records it as the end of Andy's mission chain [3].
23|side|Ch.1 · Kenton (wrecks)|2||7 shipwrecks|7|gba,ppx,psg|Kenton hires you from the green KR icon in Key Lento in Chapter 1 to loot seven shipwrecks [1]. Dive at the purple chest markers and use the metal detector to dig up the treasure [1]. He leaves briefly and texts Jason later, so this is not missable; calling Brian as Jason in Chapter 2 speeds the return [2]. Check Progress > Collections > Kenton's Treasures [1].
24|side|Ch.2 · Billy|2||5 Billy jobs|5|gba,ppx|Find Billy at the Thrillbilly Mudclub in Kelly County after the Chapter 2 mission Coffee Break [1]. Work through five jobs: Thrillbillies, Twist Wrist Smash Grab, Mall Rats, The Impaler and Hometown Heroes [2]. The fifth awards the trophy [1]. The chain stays open in post-story free roam [1][2].
25|side|Free roam · Strangers|4||8 stranger strands|8|gba,ppx,psn|Finish eight qualifying stranger strands; confirmed counters are Kirk (3 quests), Kyle (3), Yago (4) and Pilot Pete (5) [1][2]. Moses, Tyrone, Yasmani, Andy, Billy and Eddie do not count toward this trophy [1][2]. None of these are part of 100%, so they are pure cleanup [2]. All remain available after the story [1].
26|side|Ch.3 · Randy|2||16 sports cars|16|gba,ppx,psg|Clonin' Keys, Makin' GS in Chapter 3 unlocks the Key Cloner and Randy's Wish List [1]. Deliver the 16 listed sports cars to his west Vice City garage, marked RK [1]. Use WAiNK to check cars against the list; hotel driveways around Vice Beach and Ocean Beach are productive, and better condition pays more [1]. The full car list is on PowerPyx; the chain is still open after the story [2][3].
27|side|Ch.3 · Tyrone (Jason)|2||lab strand|0|gba,ppx,psg|This is Jason-only and opens after Here, Kitty Kitty in Chapter 3 [1]. Destroy the synthetic labs marked in purple around Vice City [1]. The order is Take Out Kitty Litter, then Spin On This (Shut Down the Labs), which awards the trophy [2]. Push Square marks it as the end of Tyrone's missions [3].
28|activities|Ch.1 · meditation|2|M|18 meditation spots|18|gba,ppx,psg,fg|Meditate at all 18 spots; each one counts on the Progress > Collections > Exploration > Meditations counter [1]. Doing a spot with Jason and Lucia together counts twice, and the final spot needs both characters after Coffee Break in Chapter 2 [1]. The Chapter 1 balcony scene with Lucia, the morning after Down to Earth, is the risk: accept her meditation before the chapter ends [1][2]. That scene is not marked like the other spots and its effect on the trophy is unconfirmed, so treat it as possibly missable [1][2]. A meditation only completes at the final zen animation [3].
29|side|Ch.2 · Bret (hunting)|2||15 Target Decks|15|gba,ppx,six|Bret texts Jason after Coffee Break in Chapter 2, starting with Veteran Hunted in Lummox County [1]. Hunt the animals on his Target Decks and bring them back as Jason; a clean one-shot kill pays more but is not required [1]. The sources do not name the exact triggering animal, so the safe route is all 15 decks - they are required for 100% anyway [1][2][3]. His first quest awards the Killtelligence SM-69 rifle [2].
30|collectibles|Free roam · Cards|3||3 card sets|3|gba,cards,psg,fg|Complete any three Collectible Card sets; 18 sets and 480 cards exist, and 15 sets are needed for 100% [1][2][3]. Cards are picked up in the world and cannot be farmed by buying them [2]. Selling duplicates at a pawn shop does not remove cards from Collections [2]. Track the sets under Progress > Collections > Collectible Cards [3].
31|collectibles|Free roam · WAiNK|3||100 scans|100|gba,ppx,psg,psn|Scan 100 WAiNK spots with the phone app (D-pad Up, then R1); any 100 count [1][2]. Categories include 31 Landmarks, 35 Curiosities and 23 Sculptures plus No Flusher tags [1]. The counter lives under Progress > Collections > WAiNK Locations [3]. The same 100 scans are a 100% checklist line [4].
32|activities|Free roam · Challenges|3||50 challenges|50|gba,ppx,psg,psn|Complete 50 of the 80 Challenges; finished ones get a tick in Progress > Challenges [1]. Many clear themselves during normal play [1]. The 100% checklist wants 70 of 80, so it pays to leave the hardest ten until last [2]. The PSN counter tracks the same total [4].
33|activities|Ch.2+ · Partner|4||escape 4 stars|0|gba,ppx|Once free roam as a pair opens after Coffee Break in Chapter 2, call your partner (D-pad Right, then Triangle) [1][2]. Pull a 4-star wanted level and break out of the red heat zone - leaving the flashing search area alone is not enough [1]. The train tunnel north of Ambrosia in Kelly County is the simplest hiding place [1][2]. Bank vault jobs hand you four stars for free [1].
34|activities|Ch.2+ · Partner crimes|4||3 shops back-to-back|3|gba,ppx|With your partner, rob three shops in a row without losing the wanted level [1][2]. Take body armour, sticky bombs and healing items [1]. The three jewelry stores in north Vice City, available after Yasmani's Chapter 3 Jewelry Jobs, sit close together [1]. The trophy usually pops about 30 seconds after the third shop; rob a fourth if it does not [1][2].
35|collectibles|Free roam · Vehicles|2||100 vehicles|100|gba,psg,ppx,psn|Scan 100 different vehicles with WAiNK; you do not need to drive them [1]. Simply getting inside a vehicle also discovers it [2]. Stand beside a busy road and scan passing traffic to speed the count [1]. 557 vehicles exist at launch, and 100% asks for 200 of the 277 base models [3][4].
36|combat|Free roam · Combat Focus|4||5 enemies in one Focus|5|gba,ppx|Fill Focus first - eating, drinking or washing at home helps, and Adrenaline extends the window [1]. In a crowded gang operation, click both sticks while aiming to pop Combat Focus and drop five enemies inside a few seconds [1][2]. An assault rifle makes this practical [1]. Gang-operation thugs count, while soldiers, police and civilians appear not to [1][2]. Focus has four levels and rises through ranges, golf, pool, fishing and headshots [2].
37|activities|Ch.4 · VCIA heist|4||1 km from VCIA|0|gba,ppx|Steal a passenger jet connected to a departure bridge gate at VCIA; jets parked on the airfield do not work [1][2]. Gates E3 and E4 are easiest: drive through the airfield fence and use the stairs-side door [1]. Back the jet out, take off and fly roughly 1 km from the airport [1]. The unlock is delayed until you clear that distance [2].
38|combat|Free roam · Military base|4||1 tank|0|gba,ppx|Head to Mile Zero Air Station on the south-west island of Mariana County, where tanks sit at the southern end of the base [1][2]. Enter by driving through the gate or using the stunt jump by the south-east entrance [2]. Steal a tank and get kills from inside it until the trophy fires [1]. No mission trigger is required [1].
39|crime|Ch.3+ · Jewelry stores|4||undetected robbery|0|ppx,gba|The Snap Gun arrives with the Chapter 3 main mission Yasmani's Jewelry Jobs, which also opens jewelry-store robberies [1][2]. Pick the locked back door with the Snap Gun - kicking it in trips the alarm [1]. Find the safe-code note in the back room and empty the safe without being seen [1]. Richardson Jewelry & Diamonds in Vice City works well [1][2].
40|crime|Ch.4+ · Bank vaults|4||5 bank vaults|5|gba,bank,fg,psn|Vaults open through the optional Chapter 4 mission That's Where The Money Is [1]. Tail a security van to its bank and enter while the vault is open; the haul is too heavy for one character, so hand a bag to your partner [1]. Every vault raises four stars - escape on a fast bike, then switch vehicles; each can pay up to $205,000 [1]. Yasmani sells van tips after two Payday Loans jobs; 22 bank jobs exist, 14 small banks and 8 vaults [1][2]. All eight vaults are needed for 100% [4].
41|crime|Free roam · Armored trucks|4||1 armored truck|0|gba,fg|Box in an armored truck, stick a bomb on its back doors, blow them and get clear [1]. A bank-vault robbery also counts as long as you then escape the red heat zone or reach a Pay 'n' Spray [1]. Both routes are available in post-story free roam [1].
42|exploration|Free roam · Map|2||52 areas|52|gba,psn,fg|Clear the fog from all 52 Leonida areas; a plane is the fastest way to sweep every dark patch [1][2]. The six headline regions are Vice City, Leonida Keys, Grassrivers, Port Gellhorn, Ambrosia and Mount Kalaga [3]. The in-game counter records the same total [2]. Exploration is cumulative and survives the story ending [1].
43|crime|Free roam · Gangs|4||9 gangs|9|gba,gang,psn,fg|Rob one illegal gang operation (yellow map icon) from each of the nine gangs; Progress > Gangs keeps the tally [1]. There are 39 operations in all, and 100% wants every one [2][3]. Only one per gang is required for this trophy [1]. The source list of all 39 sites is on PowerPyx [2].
44|mystery|Ch.1+ · Ocean Beach|2|MU|exact trigger unclear|0|gba,six,fg|The description points to a cocktail at a viewpoint on Ocean Beach in Vice City [1]. GTABase says the exact steps are still unconfirmed, and SixShore agrees [1][2]. Try the oceanfront bars early, note the viewpoint, and check back after the story if nothing fires [1]. Because the method is one unconfirmed scene rather than a repeatable counter, treat it as possibly missable until a trigger is pinned down [2]. The trophy appears on the official list as a hidden award [3].
45|mystery|Free roam · Showrooms|4|U|exact trigger unclear|0|gba,six|The wording suggests crashing a car out through a vehicle showroom window in classic style [1]. GTABase explicitly says the exact steps are not confirmed yet [1]. SixShore files it among the hidden trophies whose methods are unsettled [2]. Work through car showrooms and try a high-speed exit rather than trusting any single scripted location [1]. Recheck the sources before spending hours on one spot [1][2].
46|crime|Ch.2+ · Bowling alley|4||3 valuables|3|gba,six|Kingpin Bowling in Port Gellhorn is a gang operation first marked in Chapter 2; because the robbery returns later, it is not missable [1][2]. Take the three valuables: the luxury watch in the south-east office, the Gutterball Moreland 850 shotgun on the north-east table and the safe in the north-east hallway (bring sticky bombs) [1]. The trophy pops once you lose the police, and the valuables do not need to be taken in one visit [1].
47|activities|Free roam · Strength|4||both characters maxed|0|gba,fg,six|Max the Strength stat for both Jason and Lucia in the character menu [1]. Work out at fitness clubs with your partner present: training one trains the other too, and home workouts become available after the story [1]. SixShore confirms that working out together advances both [3]. Note a source conflict: GTABase marks this trophy hidden while GTA6 Field Guide marks it visible [1][2].
48|activities|Free roam · Criminal profile|4||500 profile actions|500|gba,psn|Build up 500 actions that change your Criminal Profile; most players reach this without trying [1]. Switch on Criminal Profile notifications in Settings > UI to watch the tally [1]. The PSN counter reads 0/500 at the start [2]. Avoid the Irredeemable profile while grinding - it is permanent and makes police more aggressive [1].
49|mystery|Free roam · Second attempts|4|U|exact trigger unclear|0|gba,six|"Second time's the charm" hints at succeeding on a second attempt at something [1]. GTABase says the exact steps are not confirmed, and PowerPyx suspects a link to a Payday Loans store [2]. Try replaying Payday Loans jobs and second-chance activities before assuming a rare world event [2]. Do not treat any single location as the confirmed trigger [1][2].
50|mystery|Free roam · Strange events|4|U|exact trigger unclear|0|gba,six|The description teases a strange event or Easter egg somewhere in Leonida [1]. GTABase says the method is unconfirmed; PowerPyx suspects a UFO questline [2]. Explore unusual landmarks at odd hours and follow up any odd encounter [1]. No source confirms a fixed mission or location [1][2].
51|mystery|Free roam · Drive-by melee|4|U|exact trigger unclear|0|gba,six|The wording points to knocking people over with a melee hit thrown from a moving vehicle [1]. GTABase says the exact trigger is not confirmed, while PowerPyx suspects a kick from a motorcycle [2]. Try melee hits from bikes and cars against pedestrians, then move on if nothing registers [1][2]. No confirmed location exists in the sources [1].
52|money|Ch.3+ · Marked bills|3||$250,000 fenced|250000|gba,six,psn,ign|The Chapter 3 mission Credit Check (Meet Raul's Crew) provides the Dye Pack Jammer [1]. Rob banks and Payday Loans, then sell the marked bills to fences; Yasmani in Vice City pays the most [1][2]. It is a running total, so the robberies already needed for 100% get you there [1]. PSNProfiles tracks the same counter; IGN instead lists $100,000 for the checklist, so follow the trophy text of $250,000 [3][4].
53|money|Free roam · Spending|4||$100,000 spent|100000|gba,psg,psn|Spend $100,000 across all shops on a running total; guns, car mods and tattoos burn through it fastest [1]. Shops are marked under Touch Pad > Style [2]. Push Square calls this possibly the easiest trophy in the list [2]. The PSN counter tracks the same figure [3].
54|money|Ch.2+ · Real estate|3||8 garages|8|gba,psg,psn,fg|Buy the eight garages listed in the Vice City Real Estate phone app, available after Chapter 2's Daily Driver; the four story garages do not count [1]. Prices total about $160,000: Mitchel Auto Center $4,000, 7th Avenue $12,000, Vela Rota Drive $24,000, Persistence Road $7,600, Wyatt Motors $21,600, Bonita Court $34,000, Atlantic Court $40,000 and Store n' Bolt $16,800 [2]. The counter reads 0/8 on PSNProfiles [3]. Buying property also frees garage space for On the Spot [1].
55|money|Ch.2+ · Scooter Bros|3||10 vehicles registered|10|gba,psg,psn,six|Moses' Chapter 2 mission hands over the Scooter Bros app [1]. Take stolen vehicles to his Port Gellhorn garage, respray and register them [1]. At first he accepts only cars without trackers; from Chapter 3 any Pay 'n' Spray can register tracked cars [1]. Fees vary with vehicle value, so use cheap cars and bikes, and have free garage space first [1][2]. The PSN counter reads 0/10 [3].
"""

STAGES = [
    (1, 'Story run', 'Chapters 1-5', '~60-80 h', '12 story trophies unlock automatically. Save at each chapter start and end; there is no mission replay and no New Game+.', '5 chapters · 12 story trophies · 15 manual saves'),
    (2, 'During the story', 'Ch.1-3 side threads', '~10 h', 'Seed the countable side work as it opens: Cal, Kenton, Billy, Andy, Bret, Randy, Tyrone, vehicles, map fog and the Chapter 1 meditation.', '7 side strands · 18 meditations · 52 map areas'),
    (3, '100% checklist', 'Post-story free roam', '~100 h', 'Clear the everything-required categories first - robberies, underwater finds, shooting ranges, drone races, Bret decks - then the partial counters.', '42 range golds · 42 drone races · 39 gang ops · 22 bank jobs'),
    (4, 'Partner & crime cleanup', 'Post-story', '~20 h', 'Call your partner for the wanted-level and shop trophies, then sweep crime, combat and the unconfirmed hidden triggers.', '8 garages · 10 registrations · 500 profile actions'),
    (5, 'Platinum', 'Final', '—', 'The Platinum lands as the 54th trophy is registered. No extra playthrough, no online requirement.', '54 of 54 preceding trophies'),
]


def to_steps(text):
    """Split cited sentences into numbered steps; keep each source marker attached."""
    parts = re.split(r'(?<=\])\. (?=[A-Z“"])', text.strip())
    steps = [part.rstrip() + '.' for part in parts[:-1]] + [parts[-1].rstrip()]
    return '\n'.join(f'{i}. {step}' for i, step in enumerate(steps, 1))


def main():
    official = json.loads(V1.read_text(encoding='utf-8'))
    official = official['trophies'] if isinstance(official, dict) else official
    by_id = {row['id']: row for row in official}
    trophies = []
    for line in ROWS.strip().splitlines():
        parts = line.split('|')
        (tid, kind, chapter, stage, flags, count, target, keys, guide) = parts
        tid = int(tid)
        base = by_id[tid]
        sources = []
        for key in keys.split(','):
            name, url = SOURCES[key]
            sources.append({'name': name, 'url': url, 'read': READ})
        trophies.append({
            'id': tid,
            'name': base['name'],
            'description': base['description'],
            'grade': base['grade'],
            'hidden': bool(base.get('hidden', base.get('hiddenOnPSN', False))),
            'kind': kind,
            'chapter': chapter,
            'stage': int(stage),
            'missable': 'M' in flags,
            'uncertain': 'U' in flags,
            'count': count,
            'target': int(target),
            'sources': sources,
            'guide': to_steps(guide),
        })

    if len(trophies) != 55:
        raise SystemExit(f'expected 55 trophies, got {len(trophies)}')
    used_urls = {s['url'] for t in trophies for s in t['sources']}
    stages = [{
        'id': sid, 'title': title, 'where': where, 'hours': hours,
        'focus': focus, 'counts': counts,
        'trophyIds': [t['id'] for t in trophies if t['stage'] == sid],
    } for sid, title, where, hours, focus, counts in STAGES]
    if sorted(i for s in stages for i in s['trophyIds']) != list(range(1, 56)):
        raise SystemExit('stage placement does not cover all 55 trophies exactly once')
    payload = {
        'title': 'Leonida Trophy Atlas',
        'sourcesRead': READ,
        'sourceCount': len(used_urls),
        'trophies': trophies,
        'stages': stages,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {OUT} — {len(trophies)} trophies, {len(used_urls)} sources, {len(stages)} stages')


if __name__ == '__main__':
    main()
