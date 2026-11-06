// One icon per CMAI behavior, so a caregiver can find a tile at a glance.
// Icons come from open sets: Lucide (https://lucide.dev, ISC), Tabler
// (https://tabler.io/icons, MIT; names starting with "Icon") and the ones Devin picked
// on Iconify (iconify-icons.tsx). Scratching is drawn here: no set has claw marks.
// Credits are in NOTICE. Swap any icon here and every tile updates. The name on the
// tile stays the thing to read; the icon only helps the eye find it.
import {
  Hammer,
  BellRing,
  Boxes,
  Droplets,
  EyeOff,
  HandGrab,
  MessageSquareHeart,
  Pointer,
  ThumbsDown,
  AudioWaveform,
  Footprints,
} from "lucide-react";
import {
  IconDental,
  IconFall,
  IconBandage,
  IconHandOff,
  IconKarate,
  IconMessageBolt,
  IconPlayHandball,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import {
  BoxingGlove,
  Complaint,
  HandPackage,
  PoisonBottle,
  LeavingThroughDoor,
  PushingHand,
  RepeatList,
  Underwear,
  UserVoice,
} from "./iconify-icons";

type BehaviorIcon = (props: { size?: number; className?: string; "aria-hidden"?: boolean }) => ReactNode;

/** Three claw marks, drawn to match the sets above (24 px grid, 2 px round line). */
function ScratchMarks({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M10 3c-1 6-3 12-6 17" />
      <path d="M15 3.5c-1 6-3 11.5-6 17" />
      <path d="M20 4c-1 6-3 11-6 16.5" />
    </svg>
  );
}

// Restlessness: an armchair (Tabler armchair, MIT, scaled down) with motion lines either
// side, so it reads as "can't sit still". Drawn in this repo.
function RestlessChair({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g transform="translate(12 12) scale(.86) translate(-12 -12)" strokeWidth="2.33">
        <path d="M5 11a2 2 0 0 1 2 2v2h10v-2a2 2 0 1 1 4 0v4a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2" />
        <path d="M5 11v-5a3 3 0 0 1 3 -3h8a3 3 0 0 1 3 3v5" />
        <path d="M6 19v2" />
        <path d="M18 19v2" />
      </g>
      <path d="M1.8 9.5q-1 2.5 0 5" />
      <path d="M22.2 9.5q1 2.5 0 5" />
    </svg>
  );
}

// The tooth draws smaller than the other icons on the same grid, so scale it up to match.
function Tooth(props: { size?: number; className?: string }) {
  return <IconDental {...props} style={{ transform: "scale(1.12)" }} />;
}

export const BEHAVIOR_ICONS: Record<number, BehaviorIcon> = {
  1: Footprints, // pacing, aimless wandering: footprints
  2: Underwear, // inappropriate dressing or disrobing
  3: Droplets, // spitting: a spray of drops
  4: IconMessageBolt, // cursing or verbal aggression: angry words
  5: BellRing, // constant request for attention or help: a call bell
  6: RepeatList, // repetitive sentences or questions: the same lines again
  7: BoxingGlove, // hitting: a glove reads as "punch" and can't be mistaken for grabbing
  8: IconKarate, // kicking: a figure mid-kick
  9: HandGrab, // grabbing
  10: PushingHand, // pushing: a hand pushing forward
  11: IconPlayHandball, // throwing things: a figure throwing
  12: AudioWaveform, // making strange noises
  13: UserVoice, // screaming: a person with sound coming out
  14: Tooth, // biting: a tooth
  15: ScratchMarks, // scratching: claw marks
  16: LeavingThroughDoor, // trying to get to a different place: heading out a door
  17: IconFall, // intentional falling: a falling figure
  18: Complaint, // complaining
  19: ThumbsDown, // negativism
  20: PoisonBottle, // eating or drinking inappropriate substances: a poison bottle
  21: IconBandage, // hurting self or other: a bandage
  22: HandPackage, // handling things inappropriately: taking someone's things
  23: EyeOff, // hiding things
  24: Boxes, // hoarding things
  25: Hammer, // tearing things or destroying property: smashing
  26: Pointer, // repetitious mannerisms: tapping
  27: MessageSquareHeart, // verbal sexual advances
  28: IconHandOff, // physical sexual advances: unwanted touch
  29: RestlessChair, // general restlessness: can't sit still
};
