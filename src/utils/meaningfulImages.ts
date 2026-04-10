type ImageRule = {
  keywords: string[];
  src: string;
};

const IMAGE_RULES: ImageRule[] = [
  {
    keywords: ['plumb', 'pipe', 'drain', 'leak', 'bathroom'],
    src: 'https://loremflickr.com/1600/1000/plumber,repair?lock=301',
  },
  {
    keywords: ['electric', 'wiring', 'power', 'fan', 'switch'],
    src: 'https://loremflickr.com/1600/1000/electrician,wiring?lock=302',
  },
  {
    keywords: ['clean', 'sanit', 'housekeeping', 'maid'],
    src: 'https://loremflickr.com/1600/1000/house,cleaning?lock=303',
  },
  {
    keywords: ['ac', 'appliance', 'fridge', 'washing', 'repair'],
    src: 'https://loremflickr.com/1600/1000/appliance,repair?lock=304',
  },
  {
    keywords: ['paint', 'wall', 'coating'],
    src: 'https://loremflickr.com/1600/1000/painting,walls?lock=305',
  },
  {
    keywords: ['carp', 'wood', 'furniture'],
    src: 'https://loremflickr.com/1600/1000/carpenter,woodwork?lock=306',
  },
  {
    keywords: ['legal', 'law', 'attorney', 'consultation'],
    src: 'https://loremflickr.com/1600/1000/lawyer,consultation?lock=307',
  },
  {
    keywords: ['software', 'developer', 'code', 'app', 'web'],
    src: 'https://loremflickr.com/1600/1000/software,developer?lock=308',
  },
  {
    keywords: ['interior', 'architect', 'design', 'decor'],
    src: 'https://loremflickr.com/1600/1000/interior,design?lock=309',
  },
  {
    keywords: ['brand', 'marketing', 'creative', 'identity'],
    src: 'https://loremflickr.com/1600/1000/branding,creative?lock=310',
  },
  {
    keywords: ['beauty', 'salon', 'spa', 'makeup'],
    src: 'https://loremflickr.com/1600/1000/salon,beauty?lock=311',
  },
  {
    keywords: ['teacher', 'tutor', 'education', 'training'],
    src: 'https://loremflickr.com/1600/1000/teacher,tutoring?lock=312',
  },
];

const DEFAULT_IMAGES = [
  'https://loremflickr.com/1600/1000/home,service,professional?lock=390',
  'https://loremflickr.com/1600/1000/handyman,work?lock=391',
  'https://loremflickr.com/1600/1000/customer,service,home?lock=392',
];

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hash = (value: string): number => {
  let acc = 0;
  for (let i = 0; i < value.length; i += 1) {
    acc = (acc * 31 + value.charCodeAt(i)) >>> 0;
  }
  return acc;
};

export const getMeaningfulImage = (context: string, seed = context): string => {
  const normalizedContext = normalize(context);

  const match = IMAGE_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedContext.includes(keyword)),
  );

  if (match) return match.src;

  const index = hash(seed || 'service') % DEFAULT_IMAGES.length;
  return DEFAULT_IMAGES[index];
};
