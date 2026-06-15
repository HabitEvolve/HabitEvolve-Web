import type { LucideProps } from "lucide-react";
import {
  // ── HEALTH & FITNESS ────────────────────────────────────────────────────────
  Activity, Dumbbell, Heart, HeartPulse, Footprints, Bike, PersonStanding,
  // ── SLEEP & RECOVERY ────────────────────────────────────────────────────────
  Moon, Bed,
  // ── NUTRITION & HYDRATION ───────────────────────────────────────────────────
  Apple, Droplets, Coffee, Leaf, Utensils, Salad,
  // ── MIND & WELLBEING ────────────────────────────────────────────────────────
  Brain, Wind, Music, Music2, BookOpen, Headphones,
  // ── ENERGY & MOOD ───────────────────────────────────────────────────────────
  Zap, Flame, Star, Sparkles, Sun, Sunrise, Smile,
  // ── GOALS & ACHIEVEMENTS ────────────────────────────────────────────────────
  Target, Trophy, Award, Medal, Crown, TrendingUp, TrendingDown,
  // ── TIME & SCHEDULE ─────────────────────────────────────────────────────────
  Timer, Clock, Calendar, AlarmClock, Hourglass,
  // ── NATURE & ENVIRONMENT ────────────────────────────────────────────────────
  Trees, TreeDeciduous, Mountain, MountainSnow, Waves, Cloud, CloudSun, Flower2,
  // ── GENERAL UI ──────────────────────────────────────────────────────────────
  CheckCircle, Circle, User, Users, Home, Globe, Map, Compass, Navigation,
  Settings, Shield, Eye, Bell, Tag,
  // ── CREATIVE & HOBBY ────────────────────────────────────────────────────────
  Camera, Pencil, Palette, Laptop, Code, Gamepad2, Brush,
  // ── WELLNESS & MEDICAL ──────────────────────────────────────────────────────
  Pill, Thermometer, Stethoscope, Syringe, Bandage,
  // ── FINANCE & PRODUCTIVITY ──────────────────────────────────────────────────
  Wallet, Briefcase, BarChart2, PieChart, ListChecks, BookMarked,
  // ── FALLBACK ────────────────────────────────────────────────────────────────
  HelpCircle,
} from "lucide-react";

// ── ICON MAP ──────────────────────────────────────────────────────────────────
// Keys are the lowercase strings your backend stores in `iconCode`.
// Add new entries here as your backend adds new category icons.

const iconMap: Record<string, React.ElementType> = {
  // Health & Fitness
  "activity":         Activity,
  "dumbbell":         Dumbbell,
  "heart":            Heart,
  "heart-pulse":      HeartPulse,
  "heartpulse":       HeartPulse,
  "footprints":       Footprints,
  "bike":             Bike,
  "bicycle":          Bike,
  "cycling":          Bike,
  "person-standing":  PersonStanding,
  "personstanding":   PersonStanding,
  "yoga":             PersonStanding,
  "running":          Footprints,
  "walk":             Footprints,

  // Sleep & Recovery
  "moon":             Moon,
  "sleep":            Moon,
  "bed":              Bed,
  "rest":             Bed,

  // Nutrition & Hydration
  "apple":            Apple,
  "food":             Apple,
  "droplets":         Droplets,
  "water":            Droplets,
  "hydration":        Droplets,
  "coffee":           Coffee,
  "cup":              Coffee,
  "leaf":             Leaf,
  "plant":            Leaf,
  "vegan":            Leaf,
  "utensils":         Utensils,
  "meal":             Utensils,
  "diet":             Utensils,
  "salad":            Salad,

  // Mind & Wellbeing
  "brain":            Brain,
  "mind":             Brain,
  "mental":           Brain,
  "meditation":       Brain,
  "wind":             Wind,
  "breathe":          Wind,
  "breathing":        Wind,
  "mindfulness":      Wind,
  "music":            Music,
  "music2":           Music2,
  "book":             BookOpen,
  "book-open":        BookOpen,
  "bookopen":         BookOpen,
  "reading":          BookOpen,
  "learn":            BookOpen,
  "study":            BookOpen,
  "headphones":       Headphones,

  // Energy & Mood
  "zap":              Zap,
  "energy":           Zap,
  "bolt":             Zap,
  "flame":            Flame,
  "fire":             Flame,
  "streak":           Flame,
  "star":             Star,
  "sparkles":         Sparkles,
  "sun":              Sun,
  "morning":          Sun,
  "sunrise":          Sunrise,
  "smile":            Smile,
  "happy":            Smile,
  "mood":             Smile,

  // Goals & Achievements
  "target":           Target,
  "goal":             Target,
  "trophy":           Trophy,
  "award":            Award,
  "medal":            Medal,
  "crown":            Crown,
  "trending-up":      TrendingUp,
  "trendingup":       TrendingUp,
  "growth":           TrendingUp,
  "progress":         TrendingUp,
  "trending-down":    TrendingDown,
  "trendingdown":     TrendingDown,

  // Time & Schedule
  "timer":            Timer,
  "clock":            Clock,
  "time":             Clock,
  "calendar":         Calendar,
  "schedule":         Calendar,
  "alarm":            AlarmClock,
  "alarm-clock":      AlarmClock,
  "alarmclock":       AlarmClock,
  "hourglass":        Hourglass,

  // Nature & Environment
  "trees":            Trees,
  "forest":           Trees,
  "tree":             TreeDeciduous,
  "tree-deciduous":   TreeDeciduous,
  "nature":           TreeDeciduous,
  "mountain":         Mountain,
  "hiking":           Mountain,
  "mountain-snow":    MountainSnow,
  "mountainsnow":     MountainSnow,
  "waves":            Waves,
  "ocean":            Waves,
  "swim":             Waves,
  "swimming":         Waves,
  "cloud":            Cloud,
  "outdoor":          CloudSun,
  "cloud-sun":        CloudSun,
  "cloudsun":         CloudSun,
  "flower":           Flower2,
  "flower2":          Flower2,
  "garden":           Flower2,

  // General UI
  "check":            CheckCircle,
  "check-circle":     CheckCircle,
  "checkcircle":      CheckCircle,
  "complete":         CheckCircle,
  "circle":           Circle,
  "user":             User,
  "person":           User,
  "users":            Users,
  "group":            Users,
  "home":             Home,
  "house":            Home,
  "globe":            Globe,
  "world":            Globe,
  "map":              Map,
  "location":         Map,
  "compass":          Compass,
  "navigation":       Navigation,
  "settings":         Settings,
  "gear":             Settings,
  "shield":           Shield,
  "safe":             Shield,
  "protect":          Shield,
  "eye":              Eye,
  "vision":           Eye,
  "see":              Eye,
  "bell":             Bell,
  "notification":     Bell,
  "tag":              Tag,
  "label":            Tag,

  // Creative & Hobby
  "camera":           Camera,
  "photo":            Camera,
  "pencil":           Pencil,
  "write":            Pencil,
  "journal":          Pencil,
  "palette":          Palette,
  "art":              Palette,
  "creative":         Palette,
  "brush":            Brush,
  "paint":            Brush,
  "laptop":           Laptop,
  "computer":         Laptop,
  "code":             Code,
  "coding":           Code,
  "gamepad":          Gamepad2,
  "gaming":           Gamepad2,
  "game":             Gamepad2,

  // Wellness & Medical
  "pill":             Pill,
  "medication":       Pill,
  "medicine":         Pill,
  "supplement":       Pill,
  "thermometer":      Thermometer,
  "temperature":      Thermometer,
  "fever":            Thermometer,
  "stethoscope":      Stethoscope,
  "health":           Stethoscope,
  "doctor":           Stethoscope,
  "syringe":          Syringe,
  "vaccine":          Syringe,
  "injection":        Syringe,
  "bandage":          Bandage,
  "injury":           Bandage,
  "wound":            Bandage,

  // Finance & Productivity
  "wallet":           Wallet,
  "money":            Wallet,
  "finance":          Wallet,
  "budget":           Wallet,
  "briefcase":        Briefcase,
  "work":             Briefcase,
  "job":              Briefcase,
  "career":           Briefcase,
  "bar-chart":        BarChart2,
  "barchart":         BarChart2,
  "chart":            BarChart2,
  "analytics":        BarChart2,
  "pie-chart":        PieChart,
  "piechart":         PieChart,
  "list-checks":      ListChecks,
  "listchecks":       ListChecks,
  "checklist":        ListChecks,
  "todo":             ListChecks,
  "bookmarked":       BookMarked,
  "bookmark":         BookMarked,
  "saved":            BookMarked,
};

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export interface DynamicIconProps extends LucideProps {
  /** The icon name string stored in your database (case-insensitive). */
  iconName: string | null | undefined;
}

/**
 * Renders a lucide-react icon by string name with a HelpCircle fallback.
 *
 * Usage:
 *   <DynamicIcon iconName="dumbbell" />
 *   <DynamicIcon iconName={category.iconCode} size={18} className="text-blue-700" />
 *
 * To add a new icon:
 *   1. Import it at the top of this file.
 *   2. Add an entry to `iconMap` above.
 */
export function DynamicIcon({
  iconName,
  size = 20,
  strokeWidth = 2.5,
  ...rest
}: DynamicIconProps) {
  const key = iconName?.trim().toLowerCase() ?? "";
  const Icon: React.ElementType = iconMap[key] ?? HelpCircle;
  return <Icon size={size} strokeWidth={strokeWidth} {...rest} />;
}
