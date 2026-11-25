import type { SuperBowlTeam } from './types';

/** Other names people use, by nickname (letters only). */
const SHORT_FORMS: Record<string, string[]> = {
  bengals: ['CIN', 'Cincy'],
  bills: ['BUF'],
  broncos: ['DEN'],
  browns: ['CLE'],
  chargers: ['LAC', 'LA', 'Bolts'],
  chiefs: ['KC'],
  colts: ['IND', 'Indy'],
  dolphins: ['MIA'],
  jaguars: ['JAX', 'JAC', 'Jags'],
  jets: ['NYJ', 'NY'],
  patriots: ['NE', 'Pats'],
  raiders: ['LV', 'Vegas'],
  ravens: ['BAL'],
  steelers: ['PIT'],
  texans: ['HOU'],
  titans: ['TEN'],
  bears: ['CHI'],
  buccaneers: ['TB', 'Tampa', 'Bucs'],
  cardinals: ['ARI', 'Cards'],
  commanders: ['WAS', 'WSH'],
  cowboys: ['DAL'],
  eagles: ['PHI', 'Philly'],
  ers: ['SF', 'Niners'], // 49ers
  falcons: ['ATL'],
  giants: ['NYG', 'NY'],
  lions: ['DET'],
  packers: ['GB'],
  panthers: ['CAR'],
  rams: ['LAR', 'LA'],
  saints: ['NOLA'],
  seahawks: ['SEA', 'Hawks'],
  vikings: ['MIN', 'Vikes'],
};

const letters = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');

/** Everything a team can be called: full name, city, nickname, conference and short forms. */
function namesOf(fullName: string, conference: SuperBowlTeam): Set<string> {
  const words = fullName.trim().split(/\s+/);
  const nickname = letters(words.at(-1) ?? '');
  const city = letters(words.slice(0, -1).join(''));
  const shortForms = Object.hasOwn(SHORT_FORMS, nickname) ? SHORT_FORMS[nickname].map(letters) : [];

  const names = [letters(fullName), city, nickname, conference, ...shortForms.flatMap((s) => [s, s + nickname])];
  return new Set(names.filter(Boolean));
}

/** The team on a contest's rows, or null unless the rows and the columns each match one team, and not the same one. */
export function matchRowTeam(
  teams: Record<SuperBowlTeam, string>,
  rowTeamName: string,
  colTeamName: string
): SuperBowlTeam | null {
  const names = { afc: namesOf(teams.afc, 'afc'), nfc: namesOf(teams.nfc, 'nfc') };

  const find = (contestName: string): SuperBowlTeam | null => {
    const name = letters(contestName);
    if (names.afc.has(name) === names.nfc.has(name)) return null;
    return names.afc.has(name) ? 'afc' : 'nfc';
  };

  const row = find(rowTeamName);
  const col = find(colTeamName);
  return row && col && row !== col ? row : null;
}
