export type CharacterCatalogEntry = {
  /**
   * Must match the `npc` object name in Tiled (e.g. "padua_01") for overworld NPCs.
   * The special id "player" is reserved for the main character.
   */
  id: string;
  /** A friendly label you can edit later. */
  name: string;
  /** What they say (the game currently uses the first line only). */
  message: string[];
  /**
   * Which sprite folder under `public/assets/sprites/characters/characters2_3x12/<spriteFolder>`.
   * Example: "01", "13", ...
   */
  spriteFolder: string;
};

export const PLAYER_CHARACTER_ID = 'player';
export const PLAYER_SPRITE_FOLDER = '01';

/**
 * Character catalog (edit-friendly).
 *
 * Overworld NPC sprite folders were assigned once via a stable random shuffle on 2025-12-24.
 */
export const CHARACTER_CATALOG: CharacterCatalogEntry[] = [
  {
    id: PLAYER_CHARACTER_ID,
    name: 'Player',
    message: [],
    spriteFolder: PLAYER_SPRITE_FOLDER,
  },

  // Interiors
  {
    id: 'padua_mom',
    name: 'Mom',
    spriteFolder: '02',
    message: ['MOM: ANDREA, HAVE YOU EATEN TODAY?'],
  },
  {
    id: 'milan_girlfriend',
    name: 'Girlfriend',
    spriteFolder: '05',
    message: ['BEA: MY DAY WAS CRAZY TODAY. I NEED TO TELL YOU EVERYTHING.'],
  },
  {
    id: 'alberto',
    name: 'Alberto',
    spriteFolder: '14',
    message: ['ALBERTO: WILL YOU JOIN ME FOR AN IDEATION SESSION?'],
  },
  {
    id: 'simon',
    name: 'Simon',
    spriteFolder: '16',
    message: ['SIMON: DID YOU WATCH MY LATEST LOOM?'],
  },
  {
    id: 'jade',
    name: 'Jade',
    spriteFolder: '13',
    message: ["JADE: I'M RUNNING A USER TESTING SESSION AND CAN'T TALK NOW."],
  },

  // Padua (2)
  {
    id: 'padua_01',
    name: 'Padua 01',
    spriteFolder: '16',
    message: [
      'MARCO: JUST GOT BACK FROM DUBLIN. ENOUGH GUINNESS FOR NOW.',
    ],
  },
  {
    id: 'padua_02',
    name: 'Padua 02',
    spriteFolder: '14',
    message: ['ALE: WISH I COULD PLAY AGE OF EMPIRES NOW.'],
  },

  // Milan (5)
  {
    id: 'milan_01',
    name: 'Milan 01',
    spriteFolder: '11',
    message: ['I LIKE THE MORNING BEFORE THE CITY SPEAKS.', 'I KEEP MY DAYS SIMPLE ON PURPOSE.'],
  },
  {
    id: 'milan_02',
    name: 'Milan 02',
    spriteFolder: '08',
    message: [
      'I TRY TO MAKE THINGS THAT FEEL CLEAR, NOT LOUD.',
      'WHEN SOMETHING WORKS, IT SHOULD FEEL INEVITABLE.',
      'I TRUST SMALL REPEATED CARE MORE THAN BIG MOMENTS.',
    ],
  },
  {
    id: 'milan_03',
    name: 'Milan 03',
    spriteFolder: '17',
    message: ['I LEARNED TO CHOOSE WHAT TO KEEP.', 'SOME ANSWERS ARRIVE ONLY AFTER YOU STOP RUSHING.'],
  },
  {
    id: 'milan_04',
    name: 'Milan 04',
    spriteFolder: '04',
    message: ['I FOLLOW MY CURIOSITY LIKE A THREAD.', 'I WANT MY WORK TO FEEL HUMAN FIRST.'],
  },
  {
    id: 'milan_05',
    name: 'Milan 05',
    spriteFolder: '09',
    message: ['I SAVE MY ENERGY FOR THE PART THAT MATTERS.', 'I LIKE WHEN DETAILS DISAPPEAR INTO EASE.'],
  },

  // London (8)
  {
    id: 'london_01',
    name: 'London 01',
    spriteFolder: '10',
    message: ['I HEARD ABOUT V7 GO TRYING TO SOLVE BUSINESS WORK WITH AI.'],
  },
  {
    id: 'london_02',
    name: 'London 02',
    spriteFolder: '12',
    message: ['DO YOU KNOW V7 RAISED $33M SERIES A TWO YEARS AGO?'],
  },
  {
    id: 'london_03',
    name: 'London 03',
    spriteFolder: '03',
    message: ['I REALLY WANT TO BECOME A PRODUCT MANAGER, BUT WHERE DO I START?'],
  },
  {
    id: 'london_04',
    name: 'London 04',
    spriteFolder: '06',
    message: ['VIBE-CODING IS THE NAME OF THE GAME NOW!'],
  },
  {
    id: 'london_05',
    name: 'London 05',
    spriteFolder: '15',
    message: ['I HEARD THE V7 OFFICE IS ON MARGARET STREET.'],
  },
  {
    id: 'london_06',
    name: 'London 06',
    spriteFolder: '07',
    message: ['PEOPLE SAY V7 GO IS MAKING WORK FEEL LESS HEAVY.'],
  },
  {
    id: 'london_07',
    name: 'London 07',
    spriteFolder: '18',
    message: ['AI IS EVERYWHERE, BUT I STILL CARE ABOUT THE DETAILS.'],
  },
  {
    id: 'london_08',
    name: 'London 08',
    spriteFolder: '16',
    message: ['IF YOU FIND THE V7 OFFICE, TELL ME WHAT IT FEELS LIKE INSIDE.'],
  },
];

export const CHARACTER_BY_ID: Record<string, CharacterCatalogEntry> = Object.fromEntries(
  CHARACTER_CATALOG.map((c) => [c.id, c]),
);


