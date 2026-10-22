// The 29 behaviors of the CMAI long form (manual p.22-23).
// `counts` and `doesNotCount` are short descriptions in our own words, not the
// manual's text (the CMAI is (c) Cohen-Mansfield; see NOTICE). For the full
// definitions, read the manual page in `manualPage` (also p.24-25).
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
  counts: string; // what to log under this item, in our own words
  doesNotCount?: string; // the manual's exclusions, in our own words
  manualPage: number; // manual page with the full definition
  group: FactorGroup;
  continuous?: boolean;
}

export const ITEMS: CmaiItem[] = [
  { id: 1, name: "Pacing, aimless wandering", counts: "Walking to and fro with no clear goal. Wheelchair wandering counts too.", doesNotCount: "Walking somewhere with a purpose.", manualPage: 12, group: "physical", continuous: true },
  { id: 2, name: "Inappropriate dressing or disrobing", counts: "Far more layers than needed, clothes worn in odd ways, or undressing where it is not appropriate.", doesNotCount: "Difficulty getting dressed (a daily-living skill). Exposing only the genitals: log #28.", manualPage: 12, group: "physical" },
  { id: 3, name: "Spitting", counts: "Spitting on the floor or at people. Mealtimes count too.", doesNotCount: "Drooling the person can't help, or spitting where it is fine (into a tissue or toilet, or outdoors).", manualPage: 12, group: "aggressive" },
  { id: 4, name: "Cursing or verbal aggression", counts: "Swearing, insults, harsh or hostile words. Must involve words.", doesNotCount: "Sounds without words (log #12 or #13).", manualPage: 12, group: "aggressive" },
  { id: 5, name: "Constant unwarranted request for attention or help", counts: "Persistent nagging, begging, or demanding beyond what is needed, with or without words.", manualPage: 12, group: "verbal" },
  { id: 6, name: "Repetitive sentences or questions", counts: "Saying the same thing or asking the same question again and again in a row.", doesNotCount: "Complaints, even if justified (log #18).", manualPage: 12, group: "verbal" },
  { id: 7, name: "Hitting (including self)", counts: "Striking or pinching someone, or hitting self or furniture.", manualPage: 12, group: "aggressive" },
  { id: 8, name: "Kicking", counts: "Kicking hard at a person or an object.", manualPage: 12, group: "aggressive" },
  { id: 9, name: "Grabbing onto people or things", counts: "Grasping hard at a person or object, or jerking it away.", manualPage: 12, group: "aggressive" },
  { id: 10, name: "Pushing", counts: "Shoving or pressing hard against someone.", manualPage: 12, group: "aggressive" },
  { id: 11, name: "Throwing things", counts: "Hurling or tossing objects, sweeping things off tables, emptying food out on purpose.", manualPage: 12, group: "other" },
  { id: 12, name: "Making strange noises", counts: "Moaning, crying, odd laughter, teeth grinding, and other strange sounds.", doesNotCount: "Words that can be understood.", manualPage: 12, group: "other" },
  { id: 13, name: "Screaming", counts: "Yelling or shrieking loudly.", manualPage: 12, group: "verbal" },
  { id: 14, name: "Biting", counts: "Biting or gnawing at someone, an object, or oneself.", manualPage: 12, group: "aggressive" },
  { id: 15, name: "Scratching", counts: "Raking nails across someone, an object, or oneself.", manualPage: 12, group: "aggressive" },
  { id: 16, name: "Trying to get to a different place", counts: "Trying to leave the building or grounds, slipping out, or getting into locked spaces, offices, or the rooms of other residents.", manualPage: 12, group: "physical" },
  { id: 17, name: "Intentional falling", counts: "Dropping to the floor on purpose, including from a bed, chair, or wheelchair.", manualPage: 13, group: "other" },
  { id: 18, name: "Complaining", counts: "Whining or grumbling about self, body aches, others, or surroundings.", manualPage: 13, group: "verbal" },
  { id: 19, name: "Negativism", counts: "A sour, negative outlook: nothing pleases the person.", doesNotCount: "Angry words aimed at someone (log #4).", manualPage: 13, group: "verbal" },
  { id: 20, name: "Eating or drinking inappropriate substances", counts: "Attempting to swallow non-food items.", manualPage: 13, group: "other" },
  { id: 21, name: "Hurting self or other", counts: "Harming self or others with something dangerous, such as burns or cuts.", manualPage: 13, group: "other" },
  { id: 22, name: "Handling things inappropriately", counts: "Taking belongings that aren't theirs, digging through drawers, shifting furniture, messing with food, smearing feces.", manualPage: 13, group: "physical" },
  { id: 23, name: "Hiding things", counts: "Tucking objects away where they can't be seen.", manualPage: 13, group: "other" },
  { id: 24, name: "Hoarding things", counts: "Stashing many items, or odd ones, in a bag, pocket, or drawer; keeping far more of one thing than makes sense.", doesNotCount: "An ordinary hobby collection (dolls, stamps).", manualPage: 13, group: "other" },
  { id: 25, name: "Tearing things or destroying property", counts: "Ripping, smashing, or trampling objects or property.", manualPage: 13, group: "aggressive" },
  { id: 26, name: "Repetitious mannerisms", counts: "Repeated movements such as tapping, rocking, rubbing, fiddling with objects, or picking at skin or clothes.", doesNotCount: "Repeated words or sounds.", manualPage: 13, group: "physical", continuous: true },
  { id: 27, name: "Verbal sexual advances", counts: "Sexual remarks, suggestive talk, or propositions.", manualPage: 13, group: "other" },
  { id: 28, name: "Physical sexual advances or exposing genitals", counts: "Unwanted sexual touching or kissing, or exposing or rubbing genitals in front of others.", manualPage: 13, group: "other" },
  { id: 29, name: "General restlessness", counts: "Fidgeting, shifting in the seat, repeatedly standing and sitting again, unable to stay still.", manualPage: 13, group: "physical", continuous: true },
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
