// The 29 behaviors of the CMAI long form (manual p.22), with the expanded
// definitions from manual p.12-13 and p.24-25.
//
// group: the nursing-home factor the manual lists for the item (p.6).
//   "aggressive"  = Factor 1, aggressive behavior
//   "physical"    = Factor 2, physically nonaggressive behavior
//   "verbal"      = Factor 3, verbally agitated behavior
//   "other"       = on the form, but not in any of the three factors
// continuous: behaviors that come in stretches rather than single events.
//   One tap = one episode (see docs/scoring-spec.md, section 4).

export type FactorGroup = "aggressive" | "physical" | "verbal" | "other";

export interface CmaiItem {
  id: number; // 1-29, the number on the long form
  name: string;
  counts: string; // what to log under this item
  doesNotCount?: string; // the manual's exclusions
  group: FactorGroup;
  continuous?: boolean;
}

export const ITEMS: CmaiItem[] = [
  { id: 1, name: "Pacing, aimless wandering", counts: "Constantly walking back and forth, including in a wheelchair.", doesNotCount: "Normal purposeful walking.", group: "physical", continuous: true },
  { id: 2, name: "Inappropriate dressing or disrobing", counts: "Too many clothes, clothes put on strangely, undressing in public.", doesNotCount: "Trouble dressing (an ADL issue). If only genitals are exposed, log #28.", group: "physical" },
  { id: 3, name: "Spitting", counts: "Spitting onto the floor or other people, including at meals.", doesNotCount: "Drooling, or spitting into a tissue, toilet, or outside.", group: "aggressive" },
  { id: 4, name: "Cursing or verbal aggression", counts: "Swearing, obscenity, unkind speech, verbal anger. Words only.", doesNotCount: "Noises without words (log #12 or #13).", group: "aggressive" },
  { id: 5, name: "Constant unwarranted request for attention or help", counts: "Unreasonable nagging, pleading, demanding, verbal or not.", group: "verbal" },
  { id: 6, name: "Repetitive sentences or questions", counts: "Repeating the same sentence or question one right after the other.", doesNotCount: "Complaining (log #18).", group: "verbal" },
  { id: 7, name: "Hitting (including self)", counts: "Striking or pinching others, banging self or furniture.", group: "aggressive" },
  { id: 8, name: "Kicking", counts: "Striking forcefully with feet at people or objects.", group: "aggressive" },
  { id: 9, name: "Grabbing onto people or things", counts: "Snatching, seizing roughly, yanking.", group: "aggressive" },
  { id: 10, name: "Pushing", counts: "Forcefully thrusting, shoving.", group: "aggressive" },
  { id: 11, name: "Throwing things", counts: "Hurling, flinging, tipping things off surfaces, dumping food.", group: "other" },
  { id: 12, name: "Making strange noises", counts: "Crying, weeping, moaning, weird laughter, grinding teeth.", doesNotCount: "Intelligible words.", group: "other" },
  { id: 13, name: "Screaming", counts: "Shouting, piercing howl, loud shrills.", group: "verbal" },
  { id: 14, name: "Biting", counts: "Chomping, gnashing, gnawing at people, objects, or self.", group: "aggressive" },
  { id: 15, name: "Scratching", counts: "Clawing or scraping with fingernails at people, objects, or self.", group: "aggressive" },
  { id: 16, name: "Trying to get to a different place", counts: "Trying to leave the building, sneaking out, entering locked areas or others' rooms.", group: "physical" },
  { id: 17, name: "Intentional falling", counts: "Purposely falling to the floor, including from a chair or bed.", group: "other" },
  { id: 18, name: "Complaining", counts: "Whining, somatic complaints, personal gripes.", group: "verbal" },
  { id: 19, name: "Negativism", counts: "Bad attitude, doesn't like anything, nothing is right.", doesNotCount: "Open verbal anger (log #4).", group: "verbal" },
  { id: 20, name: "Eating or drinking inappropriate substances", counts: "Putting non-food items in the mouth and trying to swallow.", group: "other" },
  { id: 21, name: "Hurting self or other", counts: "Burning, cutting, or touching self or others with harmful objects.", group: "other" },
  { id: 22, name: "Handling things inappropriately", counts: "Picking up others' things, rummaging in drawers, moving furniture, playing with food.", group: "physical" },
  { id: 23, name: "Hiding things", counts: "Putting objects out of sight, under or behind something.", group: "other" },
  { id: 24, name: "Hoarding things", counts: "Stuffing many or odd objects into purse, pockets, or drawers.", doesNotCount: "A normal collection (dolls, stamps).", group: "other" },
  { id: 25, name: "Tearing things or destroying property", counts: "Shredding, ripping, breaking, stomping on things.", group: "aggressive" },
  { id: 26, name: "Repetitious mannerisms", counts: "Patting, tapping, rocking, fiddling, picking at self or clothing.", doesNotCount: "Repeated words or sounds.", group: "physical", continuous: true },
  { id: 27, name: "Verbal sexual advances", counts: "Sexual propositions, innuendo, \"dirty\" talk.", group: "other" },
  { id: 28, name: "Physical sexual advances or exposing genitals", counts: "Inappropriate sexual touching, exposing genitals when not alone.", group: "other" },
  { id: 29, name: "General restlessness", counts: "Fidgeting, always moving in seat, getting up and sitting down.", group: "physical", continuous: true },
];

export const GROUP_LABELS: Record<FactorGroup, string> = {
  aggressive: "Aggressive",
  physical: "Physical, not aggressive",
  verbal: "Verbal agitation",
  other: "Other behaviors",
};

export const itemById = (id: number): CmaiItem => {
  const item = ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown CMAI item ${id}`);
  return item;
};
