/**
 * Words worth repairing a typo into.
 *
 * Deliberately small and domain-specific rather than a full dictionary. A
 * general word list makes correction *worse* here: every extra entry is another
 * thing an unfamiliar word — a name, a Norwegian word, an abbreviation — can be
 * wrongly pulled towards. These are the words that actually turn up in a week.
 */
export const COMMON_WORDS: string[] = [
  // times of day and the calendar
  'morning', 'afternoon', 'evening', 'night', 'tonight', 'today', 'tomorrow',
  'yesterday', 'midday', 'midnight', 'noon', 'early', 'later', 'morgen', 'kveld',
  'formiddag', 'ettermiddag', 'natt', 'dagen', 'uken', 'helgen',

  // eating
  'breakfast', 'brunch', 'lunch', 'dinner', 'supper', 'snack', 'coffee', 'lunsj',
  'frokost', 'middag', 'kveldsmat', 'kaffe', 'cooking', 'baking', 'groceries',
  'shopping', 'restaurant', 'takeaway',

  // moving
  'running', 'jogging', 'cycling', 'biking', 'bicycle', 'swimming', 'walking',
  'hiking', 'climbing', 'training', 'workout', 'exercise', 'exercises', 'stretching',
  'intervals', 'strength', 'cardio', 'football', 'handball', 'tennis', 'padel',
  'skiing', 'yoga', 'pilates', 'rehabilitation', 'physio', 'physiotherapy',
  'trening', 'sykling', 'svomming', 'svømming', 'løping', 'styrke', 'oppvarming',

  // studying and work
  'school', 'lecture', 'lectures', 'seminar', 'lesson', 'lessons', 'homework',
  'assignment', 'revision', 'reading', 'studying', 'library', 'exam', 'exams',
  'project', 'thesis', 'meeting', 'meetings', 'standup', 'interview', 'deadline',
  'presentation', 'workshop', 'office', 'email', 'emails', 'application',
  'skole', 'lekser', 'forelesning', 'oppgave', 'eksamen', 'moete', 'møte',

  // household and errands
  'laundry', 'cleaning', 'dishes', 'tidying', 'ironing', 'packing', 'unpacking',
  'repair', 'errands', 'haircut', 'dentist', 'doctor', 'appointment', 'pharmacy',
  'vasking', 'rydding', 'klesvask', 'tannlege', 'legetime',

  // people and going out
  'birthday', 'party', 'wedding', 'dinner', 'friends', 'family', 'parents',
  'cinema', 'movie', 'movies', 'theatre', 'theater', 'concert', 'festival',
  'museum', 'gallery', 'church', 'visiting', 'travel', 'flight', 'train',
  'bursdag', 'fest', 'venner', 'familie', 'foreldre', 'kino', 'konsert',

  // rest
  'sleeping', 'napping', 'resting', 'shower', 'bath', 'relaxing', 'reading',
  'gaming', 'music', 'guitar', 'piano', 'podcast', 'series', 'episode',
  'soving', 'dusje', 'hvile', 'lesing', 'musikk',

  // Norwegian words a frequency-ranked English list would happily mangle:
  // "reise" is one edit from "raise", "middag" one from "midday".
  'reise', 'reiser', 'hytte', 'hytta', 'ferie', 'helga', 'dagen', 'uken', 'uka',
  'maaned', 'måned', 'timer', 'minutt', 'morgen', 'kveld', 'natta', 'natten',
  'trene', 'trener', 'jobbe', 'jobben', 'skolen', 'venner', 'familie', 'soster',
  'søster', 'broren', 'mamma', 'pappa', 'barna', 'huset', 'hjemme', 'butikken',
  'handle', 'vaske', 'rydde', 'spise', 'drikke', 'sove', 'vaakne', 'våkne',
  'dusje', 'lese', 'skrive', 'hoere', 'høre', 'snakke', 'ringe', 'moete',
  'bussen', 'toget', 'bilen', 'sykkelen', 'turen', 'fjellet', 'skogen',
  'stranda', 'sjoeen', 'sjøen', 'byen', 'sentrum', 'teater', 'bryllup',
  'gaver', 'penger', 'regning', 'betale', 'banken', 'posten', 'pakke',
  'klaer', 'klær', 'maten', 'kake', 'bake', 'grille', 'fisken', 'broed', 'brød',
  'melk', 'osten', 'butikk', 'legen', 'apotek', 'ferien', 'sommer', 'vinter',
  'hoest', 'høst', 'vaaren', 'våren', 'snoe', 'snø', 'regner', 'sola',
  'fjord', 'fjorden', 'hytter', 'skitur', 'padel', 'sushi', 'pizza',

  // small connective words that show up in a plan
  'before', 'after', 'about', 'until', 'while', 'during', 'between', 'around',
  'sometime', 'anytime', 'maybe', 'perhaps', 'roughly', 'ideally', 'hopefully',
  'finish', 'finished', 'start', 'starting', 'continue', 'prepare', 'preparing',
  'planning', 'practice', 'practise', 'session', 'quick', 'short', 'long',
]
