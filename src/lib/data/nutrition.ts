import type { MealPlan } from "@/lib/types";

/* ============================================================================
 * Meal templates. Each is written for a base calorie figure and scales
 * linearly to the user's target, so the structure survives any goal change.
 * ========================================================================= */

export const MEAL_PLANS: MealPlan[] = [
  {
    id: "muscle-nonveg",
    name: "Mass Builder — Non-Veg",
    goal: "build-muscle",
    diet: "non-veg",
    baseCalories: 2900,
    meals: [
      {
        slot: "breakfast",
        title: "Breakfast",
        time: "08:00",
        items: [
          { name: "Whole eggs", qty: "3", kcal: 210, p: 18, c: 1, f: 15 },
          { name: "Egg whites", qty: "3", kcal: 51, p: 11, c: 1, f: 0 },
          { name: "Oats", qty: "80 g dry", kcal: 300, p: 11, c: 54, f: 5 },
          { name: "Banana", qty: "1 medium", kcal: 105, p: 1, c: 27, f: 0 },
          { name: "Milk", qty: "250 ml", kcal: 155, p: 8, c: 12, f: 8 },
        ],
        note: "Eat within 90 minutes of waking. Protein at breakfast measurably improves appetite control all day.",
      },
      {
        slot: "mid-morning",
        title: "Mid-Morning",
        time: "11:00",
        items: [
          { name: "Greek yoghurt", qty: "200 g", kcal: 200, p: 20, c: 12, f: 8 },
          { name: "Mixed nuts", qty: "25 g", kcal: 150, p: 5, c: 5, f: 13 },
        ],
      },
      {
        slot: "lunch",
        title: "Lunch",
        time: "14:00",
        items: [
          { name: "Chicken breast", qty: "200 g cooked", kcal: 330, p: 62, c: 0, f: 7 },
          { name: "Rice", qty: "200 g cooked", kcal: 260, p: 5, c: 56, f: 1 },
          { name: "Mixed vegetables", qty: "200 g", kcal: 90, p: 4, c: 16, f: 1 },
          { name: "Olive oil", qty: "1 tbsp", kcal: 120, p: 0, c: 0, f: 14 },
        ],
      },
      {
        slot: "pre-workout",
        title: "Pre-Workout",
        time: "17:30",
        items: [
          { name: "Rice cakes or toast", qty: "2", kcal: 140, p: 3, c: 28, f: 1 },
          { name: "Honey / jam", qty: "1 tbsp", kcal: 60, p: 0, c: 16, f: 0 },
          { name: "Black coffee", qty: "1 cup", kcal: 5, p: 0, c: 0, f: 0 },
        ],
        note: "Carbs 60-90 minutes before training. Caffeine 30-45 minutes before, if you use it.",
      },
      {
        slot: "post-workout",
        title: "Post-Workout",
        time: "20:00",
        items: [
          { name: "Whey protein", qty: "1 scoop (30 g)", kcal: 120, p: 25, c: 3, f: 1 },
          { name: "Fruit or juice", qty: "1 serving", kcal: 100, p: 0, c: 25, f: 0 },
        ],
        note: "The 'anabolic window' is far wider than the supplement industry claims — but this is convenient and it works.",
      },
      {
        slot: "dinner",
        title: "Dinner",
        time: "21:30",
        items: [
          { name: "Salmon or lean beef", qty: "180 g", kcal: 360, p: 40, c: 0, f: 22 },
          { name: "Sweet potato / roti", qty: "250 g / 3", kcal: 250, p: 6, c: 52, f: 2 },
          { name: "Large salad", qty: "1 bowl", kcal: 80, p: 3, c: 12, f: 2 },
        ],
      },
      {
        slot: "before-bed",
        title: "Before Bed",
        time: "23:00",
        items: [{ name: "Cottage cheese or casein", qty: "150 g", kcal: 160, p: 22, c: 6, f: 5 }],
        note: "Slow-digesting protein overnight. Optional, but it helps if you train late.",
      },
    ],
    notes: [
      "Protein is the non-negotiable macro. Hit it before you worry about anything else.",
      "A surplus of 250-400 kcal is enough. Bigger surpluses just add fat you'll have to diet off later.",
      "Aim to gain 0.25-0.5% of bodyweight per week. Faster than that is mostly fat.",
    ],
  },
  {
    id: "muscle-veg",
    name: "Mass Builder — Vegetarian",
    goal: "build-muscle",
    diet: "veg",
    baseCalories: 2900,
    meals: [
      {
        slot: "breakfast",
        title: "Breakfast",
        time: "08:00",
        items: [
          { name: "Oats with milk", qty: "80 g / 300 ml", kcal: 480, p: 21, c: 68, f: 12 },
          { name: "Peanut butter", qty: "20 g", kcal: 120, p: 5, c: 4, f: 10 },
          { name: "Banana", qty: "1", kcal: 105, p: 1, c: 27, f: 0 },
        ],
      },
      {
        slot: "mid-morning",
        title: "Mid-Morning",
        time: "11:00",
        items: [
          { name: "Greek yoghurt", qty: "200 g", kcal: 200, p: 20, c: 12, f: 8 },
          { name: "Almonds", qty: "20 g", kcal: 120, p: 4, c: 4, f: 10 },
        ],
      },
      {
        slot: "lunch",
        title: "Lunch",
        time: "14:00",
        items: [
          { name: "Paneer or tofu", qty: "200 g", kcal: 400, p: 36, c: 6, f: 26 },
          { name: "Rice / roti", qty: "200 g / 3", kcal: 280, p: 7, c: 58, f: 2 },
          { name: "Dal", qty: "1 bowl", kcal: 180, p: 12, c: 26, f: 3 },
          { name: "Vegetables", qty: "150 g", kcal: 70, p: 3, c: 12, f: 1 },
        ],
      },
      {
        slot: "pre-workout",
        title: "Pre-Workout",
        time: "17:30",
        items: [
          { name: "Fruit + honey toast", qty: "1 serving", kcal: 200, p: 4, c: 42, f: 2 },
        ],
      },
      {
        slot: "post-workout",
        title: "Post-Workout",
        time: "20:00",
        items: [
          { name: "Whey or soy protein", qty: "1 scoop", kcal: 120, p: 25, c: 3, f: 1 },
          { name: "Dates or juice", qty: "1 serving", kcal: 110, p: 1, c: 28, f: 0 },
        ],
      },
      {
        slot: "dinner",
        title: "Dinner",
        time: "21:30",
        items: [
          { name: "Rajma / chana / lentils", qty: "1.5 bowls", kcal: 330, p: 20, c: 50, f: 5 },
          { name: "Roti or rice", qty: "2-3", kcal: 220, p: 6, c: 44, f: 2 },
          { name: "Curd", qty: "150 g", kcal: 110, p: 8, c: 8, f: 5 },
        ],
      },
      {
        slot: "before-bed",
        title: "Before Bed",
        time: "23:00",
        items: [{ name: "Milk with soaked almonds", qty: "250 ml", kcal: 180, p: 9, c: 13, f: 10 }],
      },
    ],
    notes: [
      "Vegetarian sources are lower in leucine, so aim about 10% higher on total protein.",
      "Combine grains and pulses across the day to cover the full amino acid profile — you don't need to do it in a single meal.",
      "Watch fat creep: paneer, nuts and oil add up fast. Weigh them for a week to calibrate your eye.",
    ],
  },
  {
    id: "cut-nonveg",
    name: "Cutting Plan — Non-Veg",
    goal: "lose-fat",
    diet: "non-veg",
    baseCalories: 2100,
    meals: [
      {
        slot: "breakfast",
        title: "Breakfast",
        time: "08:30",
        items: [
          { name: "Egg whites + 1 whole egg", qty: "5 + 1", kcal: 155, p: 24, c: 2, f: 6 },
          { name: "Oats", qty: "50 g dry", kcal: 190, p: 7, c: 34, f: 3 },
          { name: "Berries", qty: "100 g", kcal: 50, p: 1, c: 12, f: 0 },
        ],
      },
      {
        slot: "lunch",
        title: "Lunch",
        time: "13:00",
        items: [
          { name: "Chicken breast", qty: "180 g cooked", kcal: 300, p: 56, c: 0, f: 6 },
          { name: "Rice or quinoa", qty: "150 g cooked", kcal: 195, p: 4, c: 42, f: 1 },
          { name: "Big salad + 1 tsp oil", qty: "1 bowl", kcal: 110, p: 3, c: 12, f: 6 },
        ],
      },
      {
        slot: "pre-workout",
        title: "Pre-Workout",
        time: "17:30",
        items: [
          { name: "Apple + black coffee", qty: "1", kcal: 100, p: 0, c: 25, f: 0 },
        ],
      },
      {
        slot: "post-workout",
        title: "Post-Workout",
        time: "20:00",
        items: [{ name: "Whey protein", qty: "1.5 scoops", kcal: 180, p: 38, c: 4, f: 2 }],
      },
      {
        slot: "dinner",
        title: "Dinner",
        time: "21:00",
        items: [
          { name: "White fish or lean mince", qty: "200 g", kcal: 260, p: 44, c: 0, f: 9 },
          { name: "Vegetables (volume)", qty: "300 g", kcal: 110, p: 6, c: 20, f: 1 },
          { name: "Small carb portion", qty: "100 g cooked", kcal: 130, p: 3, c: 28, f: 1 },
        ],
        note: "Load the plate with vegetables. Volume is what makes a deficit survivable.",
      },
      {
        slot: "before-bed",
        title: "Before Bed",
        time: "23:00",
        items: [{ name: "Low-fat curd / casein", qty: "150 g", kcal: 120, p: 18, c: 8, f: 2 }],
      },
    ],
    notes: [
      "Keep protein high (2.2 g/kg) in a deficit — it protects muscle and keeps you full.",
      "Target 0.5-0.75% of bodyweight lost per week. Faster costs muscle.",
      "Track weight daily and judge by the 7-day average, never a single morning.",
      "Steps matter more than cardio machines. 8-10k a day moves the needle quietly.",
    ],
  },
  {
    id: "cut-veg",
    name: "Cutting Plan — Vegetarian",
    goal: "lose-fat",
    diet: "veg",
    baseCalories: 2100,
    meals: [
      {
        slot: "breakfast",
        title: "Breakfast",
        time: "08:30",
        items: [
          { name: "Greek yoghurt", qty: "250 g", kcal: 250, p: 25, c: 15, f: 10 },
          { name: "Berries + oats", qty: "100 g / 40 g", kcal: 200, p: 6, c: 40, f: 3 },
        ],
      },
      {
        slot: "lunch",
        title: "Lunch",
        time: "13:00",
        items: [
          { name: "Tofu or low-fat paneer", qty: "180 g", kcal: 280, p: 32, c: 6, f: 14 },
          { name: "Rice / roti", qty: "150 g / 2", kcal: 210, p: 5, c: 44, f: 2 },
          { name: "Salad + vegetables", qty: "1 large bowl", kcal: 100, p: 4, c: 16, f: 2 },
        ],
      },
      {
        slot: "pre-workout",
        title: "Pre-Workout",
        time: "17:30",
        items: [{ name: "Fruit + coffee", qty: "1 serving", kcal: 100, p: 1, c: 24, f: 0 }],
      },
      {
        slot: "post-workout",
        title: "Post-Workout",
        time: "20:00",
        items: [{ name: "Whey / plant protein", qty: "1.5 scoops", kcal: 180, p: 36, c: 6, f: 2 }],
      },
      {
        slot: "dinner",
        title: "Dinner",
        time: "21:00",
        items: [
          { name: "Dal or chana", qty: "1.5 bowls", kcal: 280, p: 18, c: 42, f: 4 },
          { name: "Vegetables", qty: "300 g", kcal: 110, p: 6, c: 20, f: 1 },
          { name: "Curd", qty: "100 g", kcal: 80, p: 6, c: 6, f: 3 },
        ],
      },
    ],
    notes: [
      "Protein is the hard part on a vegetarian cut. A protein powder makes it dramatically easier.",
      "Prioritise low-fat dairy, soya, pulses and seitan; be careful with paneer and nuts.",
      "Fibre is naturally high here — drink more water or you'll feel it.",
    ],
  },
];

export function planFor(goal: string, diet: string): MealPlan {
  return (
    MEAL_PLANS.find((p) => p.goal === goal && p.diet === diet) ??
    MEAL_PLANS.find((p) => p.diet === diet) ??
    MEAL_PLANS[0]
  );
}

/** Scale every item in a plan to the user's actual calorie target. */
export function scalePlan(plan: MealPlan, targetCalories: number): MealPlan {
  const f = targetCalories / plan.baseCalories;
  return {
    ...plan,
    meals: plan.meals.map((m) => ({
      ...m,
      items: m.items.map((i) => ({
        ...i,
        kcal: Math.round(i.kcal * f),
        p: Math.round(i.p * f),
        c: Math.round(i.c * f),
        f: Math.round(i.f * f),
      })),
    })),
  };
}

/* ------------------------------------------------------- supplements ---- */

export interface SupplementNote {
  name: string;
  verdict: "strong evidence" | "decent evidence" | "situational" | "skip it";
  dose: string;
  why: string;
}

export const SUPPLEMENTS: SupplementNote[] = [
  {
    name: "Creatine Monohydrate",
    verdict: "strong evidence",
    dose: "3-5 g daily, any time, forever",
    why: "The most studied sports supplement in existence. Small but reliable gains in strength, power and training volume. No loading phase needed — just take it every day.",
  },
  {
    name: "Whey / Plant Protein Powder",
    verdict: "strong evidence",
    dose: "1-2 scoops as needed to hit your target",
    why: "Not magic — just convenient, cheap protein. Useful precisely when hitting your protein target from food is hard.",
  },
  {
    name: "Caffeine",
    verdict: "strong evidence",
    dose: "3-6 mg/kg, 30-60 min pre-workout",
    why: "Genuinely improves strength, endurance and focus. Cycle off periodically and never take it within 8 hours of bed.",
  },
  {
    name: "Vitamin D3",
    verdict: "decent evidence",
    dose: "1000-2000 IU daily if you get little sun",
    why: "Deficiency is extremely common indoors and it affects mood, immunity and possibly strength. Worth testing before supplementing.",
  },
  {
    name: "Omega-3 (EPA/DHA)",
    verdict: "decent evidence",
    dose: "1-2 g combined EPA+DHA daily",
    why: "Useful for joint comfort and general health if you rarely eat oily fish. Not a muscle-building supplement.",
  },
  {
    name: "Citrulline Malate",
    verdict: "situational",
    dose: "6-8 g, 45 min pre-workout",
    why: "May add a rep or two on high-rep sets and improves the pump. Nice-to-have, not essential.",
  },
  {
    name: "Beta-Alanine",
    verdict: "situational",
    dose: "3-5 g daily",
    why: "Helps on sets lasting 60-240 seconds. Causes harmless tingling. Irrelevant for low-rep strength work.",
  },
  {
    name: "BCAAs",
    verdict: "skip it",
    dose: "—",
    why: "Pointless if you eat enough total protein, which you should be doing anyway. Spend the money on food.",
  },
  {
    name: "Testosterone Boosters",
    verdict: "skip it",
    dose: "—",
    why: "No over-the-counter product meaningfully raises testosterone in healthy men. Sleep, bodyweight and training do.",
  },
];

export const NUTRITION_PRINCIPLES = [
  {
    title: "Calories decide your weight",
    body: "Fat loss and gain are governed by total energy balance. Every diet that works, works because it puts you in the right balance.",
  },
  {
    title: "Protein decides your shape",
    body: "1.6-2.2 g per kg of bodyweight daily. It preserves muscle in a deficit and builds it in a surplus. Spread it across 3-5 meals.",
  },
  {
    title: "Carbs fuel the session",
    body: "Cutting carbs to zero will not make you leaner — it will make your training worse. Keep them around training.",
  },
  {
    title: "Fat keeps the system running",
    body: "Never drop below roughly 0.6 g per kg. Hormones, joints and vitamin absorption all depend on it.",
  },
  {
    title: "Consistency beats perfection",
    body: "Hitting your targets 80-90% of the time forever beats hitting them 100% for three weeks and quitting.",
  },
  {
    title: "Sleep is a training variable",
    body: "Under 6 hours measurably reduces strength, increases hunger and blunts muscle gain. It is the cheapest performance upgrade available.",
  },
];
