import { isoWeek } from './model'

export interface Quote {
  text: string
  author: string
}

/**
 * Famous lines, leaning towards time, plans and the comedy of both.
 * Where an attribution is commonly repeated but not firmly documented, the
 * author is marked "attributed" rather than stated as fact.
 */
export const QUOTES: Quote[] = [
  { text: 'Plans are worthless, but planning is everything.', author: 'Dwight D. Eisenhower' },
  { text: 'Everyone has a plan until they get punched in the mouth.', author: 'Mike Tyson' },
  { text: 'Work expands so as to fill the time available for its completion.', author: 'C. Northcote Parkinson' },
  { text: 'I love deadlines. I love the whooshing noise they make as they go by.', author: 'Douglas Adams' },
  { text: 'I have made this longer than usual because I have not had time to make it shorter.', author: 'Blaise Pascal' },
  { text: 'Procrastination is the thief of time.', author: 'Edward Young' },
  { text: 'Never put off till tomorrow what may be done day after tomorrow just as well.', author: 'Mark Twain' },
  { text: 'Lost time is never found again.', author: 'Benjamin Franklin' },
  { text: 'You may delay, but time will not.', author: 'Benjamin Franklin' },
  { text: 'Time is what we want most, but what we use worst.', author: 'William Penn' },
  { text: 'It is not enough to be busy. The question is: what are we busy about?', author: 'Henry David Thoreau' },
  { text: 'There is nothing so useless as doing efficiently that which should not be done at all.', author: 'Peter Drucker' },
  { text: 'Either you run the day, or the day runs you.', author: 'Jim Rohn' },
  { text: 'How did it get so late so soon?', author: 'Dr. Seuss' },
  { text: 'It is tough to make predictions, especially about the future.', author: 'Yogi Berra (attributed)' },
  { text: 'If you don’t know where you are going, you’ll end up someplace else.', author: 'Yogi Berra' },
  { text: 'You can observe a lot by just watching.', author: 'Yogi Berra' },
  { text: 'Common sense is not so common.', author: 'Voltaire' },
  { text: 'A witty saying proves nothing.', author: 'Voltaire' },
  { text: 'The best is the enemy of the good.', author: 'Voltaire' },
  { text: 'The unexamined life is not worth living.', author: 'Socrates, in Plato’s Apology' },
  { text: 'I can resist everything except temptation.', author: 'Oscar Wilde' },
  { text: 'I refuse to join any club that would have me as a member.', author: 'Groucho Marx' },
  { text: 'Get your facts first, then you can distort them as you please.', author: 'Mark Twain' },
  { text: 'The trouble with the world is that the stupid are cocksure and the intelligent full of doubt.', author: 'Bertrand Russell' },
  { text: 'Whereof one cannot speak, thereof one must be silent.', author: 'Ludwig Wittgenstein' },
  { text: 'The limits of my language mean the limits of my world.', author: 'Ludwig Wittgenstein' },
  { text: 'Hell is other people.', author: 'Jean-Paul Sartre' },
  { text: 'I think, therefore I am.', author: 'René Descartes' },
  { text: 'Any sufficiently advanced technology is indistinguishable from magic.', author: 'Arthur C. Clarke' },
  { text: 'The future is already here — it’s just not evenly distributed.', author: 'William Gibson' },
  { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
  { text: 'Science is what we understand well enough to explain to a computer. Art is everything else we do.', author: 'Donald Knuth' },
  { text: 'There are only two hard things in computer science: cache invalidation and naming things.', author: 'Phil Karlton (attributed)' },
  { text: 'In theory there is no difference between theory and practice. In practice there is.', author: 'Attributed to Benjamin Brewster' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain (attributed)' },
  { text: 'Beware the barrenness of a busy life.', author: 'Socrates (attributed)' },
  { text: 'Tomorrow is often the busiest day of the week.', author: 'Spanish proverb' },
  { text: 'The best time to plant a tree was twenty years ago. The second best time is now.', author: 'Proverb' },
  { text: 'Everything should be made as simple as possible, but not simpler.', author: 'Albert Einstein (attributed)' },
]

/** Things that are actually true. No invented trivia. */
export const FACTS: string[] = [
  'Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.',
  'Sharks are older than trees. Sharks appeared around 450 million years ago, trees around 350 million.',
  'Oxford University was teaching students before the Aztec Empire existed. Teaching there is recorded by 1096; Tenochtitlan was founded in 1325.',
  'There are more possible orderings of a 52-card deck than there are atoms making up the Earth.',
  'Any scrambled Rubik’s Cube can be solved in 20 moves or fewer. Mathematicians call it God’s number.',
  'A Rubik’s Cube has 43,252,003,274,489,856,000 possible positions.',
  'In any group of 23 people, there is a better than even chance that two share a birthday.',
  '0.999... is not close to 1. It is exactly 1.',
  'In real-world data, the leading digit is a 1 about 30% of the time. It is called Benford’s law.',
  'A googol is 10^100, which is far more than the number of atoms in the observable universe.',
  'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
  'A day on Venus is longer than a year on Venus. It turns once in 243 Earth days and orbits the Sun in 225.',
  'Pluto has not completed a single orbit since it was discovered in 1930. Its year is 248 of ours.',
  'Antarctica is the largest desert on Earth.',
  'There are more trees on Earth than there are stars in the Milky Way.',
  'Iceland has no native mosquitoes.',
  'Norway’s coastline, counting every fjord and island, runs to over 100,000 km.',
  'Norway introduced salmon to Japanese sushi in the 1980s, as a deliberate export campaign.',
  'Scotland’s national animal is the unicorn.',
  'The shortest war on record lasted about 38 minutes: Britain against Zanzibar in 1896.',
  'Nintendo was founded in 1889 and spent its first decades making playing cards.',
  'Bubble wrap was invented as wallpaper.',
  'Octopuses have three hearts and blue blood.',
  'A shrimp’s heart is in its head.',
  'Wombat droppings are cube-shaped.',
  'A group of flamingos is called a flamboyance.',
  'Bananas are berries. Strawberries are not.',
  'Honey recovered from ancient Egyptian tombs was still edible thousands of years later.',
  'The Eiffel Tower can stand around 15 cm taller in summer, because the iron expands.',
  'The dot over a lowercase i or j has a name: it is a tittle.',
  'Hot water can freeze faster than cold water under the right conditions. It is called the Mpemba effect.',
  'The Great Wall of China cannot be seen from space with the naked eye.',
  'After each chess player has made four moves, over 288 billion positions are possible.',
  'A jiffy is a real unit of time, though what it equals depends on the field using it.',
  'The average cloud weighs several hundred tonnes.',
]

export function dayOfYear(date: Date): number {
  // Compared in UTC so a daylight-saving shift cannot move the boundary.
  const start = Date.UTC(date.getFullYear(), 0, 0)
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((today - start) / 86_400_000)
}

function isPrime(n: number): boolean {
  if (n < 2) return false
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false
  return true
}

/** Same quote all day, a different one tomorrow. */
export function quoteOfDay(date: Date): Quote {
  const index = (dayOfYear(date) + date.getFullYear()) % QUOTES.length
  return QUOTES[index]!
}

export function factOfDay(date: Date): string {
  return FACTS[(dayOfYear(date) * 7 + date.getFullYear()) % FACTS.length]!
}

export function randomFact(exclude?: string): string {
  if (FACTS.length < 2) return FACTS[0]!
  let pick = FACTS[Math.floor(Math.random() * FACTS.length)]!
  while (pick === exclude) pick = FACTS[Math.floor(Math.random() * FACTS.length)]!
  return pick
}

/** Derived from the real date, so it is always true and always current. */
export function numberOfDay(date: Date): { number: number; note: string } {
  const n = dayOfYear(date)
  const year = date.getFullYear()
  const total = dayOfYear(new Date(year, 11, 31))
  const left = total - n
  const primeNote = isPrime(n) ? ' It is a prime number.' : ''
  return {
    number: n,
    note: `Day ${n} of ${year}, week ${isoWeek(date)}. ${left} ${left === 1 ? 'day' : 'days'} left in the year.${primeNote}`,
  }
}
