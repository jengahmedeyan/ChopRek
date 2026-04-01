const streakMessages: {
  milestones: Record<number, string[]>
  ranges: { min: number; max: number; messages: string[] }[]
} = {
  milestones: {
    0:   ["Bro seriously? Go eat something 😒", "You haven't ordered once. We're disappointed 😤", "The menu is RIGHT THERE bro 👀"],
    1:   ["One day... wow, slow down champ 🙄", "Day 1. Bold start. Let's see if it lasts 😏"],
    3:   ["3 days in a row. You're building momentum 👀", "Day 3. This might actually stick 😳"],
    5:   ["5 days straight. You're locked in now 🔒", "Day 5. This is becoming a habit 😅"],
    7:   ["A full week and still going? Seek help 🆘", "7 days straight. Your family misses you 😭"],
    10:  ["10 DAYS. We are simultaneously impressed and concerned 👀", "Day 10. You're not well. We love that for you 💀"],
    14:  ["Two full weeks. You are not normal. We respect it 🫡", "14 days. This is a lifestyle now 😮"],
    20:  ["20 DAYS?! That's a full work month 🏆 You win. We quit.", "Day 20. The caterer has started naming things after you 🍛"],
    25:  ["25 days. Quarter to 100. You're deep in this now 😳", "Day 25. This is commitment on another level 💯"],
    30:  ["30 DAYS?! You've transcended human behavior 🧘‍♂️", "One month straight. Are you even human? 🤖"],
    50:  ["50 DAYS. This is no longer a streak, it's a religion 🙏", "Day 50. We have a shrine for you in the kitchen now 🫙"],
    75:  ["75 days. You're basically part of the staff now 👨‍🍳", "Day 75. Do you even remember cooking at home? 🤨"],
    100: ["100 DAYS. You ARE ChopRek now 👑", "A century of lunches. You are the chosen one 🌟"],
  },

  ranges: [
    {
      min: 2, max: 4,
      messages: [
        "You're getting into this now huh 😏",
        "Careful... this is how habits start 😂",
        "Mildly impressive, not gonna lie 👀",
        "Early days, but we see the vision 👁️",
        "This might become a problem… soon 😅"
      ]
    },
    {
      min: 5, max: 6,
      messages: [
        "You're basically living in the kitchen now 🍳",
        "At this point just rent a seat there 🪑",
        "This is getting suspicious 🤨",
        "You're showing commitment… we respect it 👀",
        "Lowkey impressive consistency 😤"
      ]
    },
    {
      min: 8, max: 9,
      messages: [
        "At this point you're basically a kitchen appliance 🍳",
        "9 days. You smell like jollof rice now, don't you 🍚",
        "Still going? No breaks? Interesting 🤨",
        "You're locked into the routine now 🔁",
        "We're starting to take you seriously 😳"
      ]
    },
    {
      min: 11, max: 13,
      messages: [
        "Your desk is basically a restaurant 🪑🍽️",
        "The caterer knows your order by heart now 😭",
        "You have a usual order… don't you 👀",
        "You're a regular now. No denying it 🧾",
        "This is structured behavior now 📊"
      ]
    },
    {
      min: 15, max: 19,
      messages: [
        "Your blood type is probably Domoda now 🥜",
        "This is no longer a streak, it's a lifestyle 😅",
        "Are you okay? Touch grass bro 🌿",
        "We're watching… and slightly concerned 😬",
        "You might need a break. Just saying 😭",
        "You're deep in the system now 🧠"
      ]
    },
    {
      min: 21, max: 29,
      messages: [
        "You've become one with the menu 😨",
        "The food recognizes you now 👁️",
        "This is elite behavior… or madness 🤯",
        "Legend or menace? The jury's still out 🧑‍⚖️",
        "You're operating on another level now 🚀",
        "We can't stop you anymore 😭"
      ]
    },
    {
      min: 31, max: Infinity,
      messages: [
        "Legends say you never miss a day 🐐",
        "At this point we're just spectators 🎬",
        "You ARE ChopRek. The app works for YOU now 👑",
        "The caterer cooks for you specifically now 🫡",
        "You've broken the system. Congrats 💥",
        "You're not a user anymore. You're lore now 📖"
      ]
    }
  ]
}

const rareMessages = [
  "DEV NOTE: How are you still going?? 😭",
  "This streak is being monitored by scientists 🧪",
  "Achievement unlocked: Unstoppable 🍽️",
  "You might actually be him 👀"
]

function getRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function getStreakMessage(streak: number): string {
  // 2% rare chance
  if (Math.random() < 0.02) {
    return getRandom(rareMessages)
  }

  if (streakMessages.milestones[streak]) {
    return getRandom(streakMessages.milestones[streak])
  }

  const range = streakMessages.ranges.find(r => streak >= r.min && streak <= r.max)

  if (range) {
    return getRandom(range.messages)
  }

  return "You're doing… something. We respect it 😅"
}
