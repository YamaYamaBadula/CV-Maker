/**
 * Wording checker: flags phrases that are typical of AI-written / template CVs
 * and offers plainer alternatives. Pure functions, no dependencies.
 */

export const CATEGORIES = {
  buzzword: { name: 'Buzzword', color: '#b45309', hint: 'Swap for a plainer word.' },
  cliche: { name: 'Cliché', color: '#be123c', hint: 'Says nothing on its own – replace with evidence.' },
  filler: { name: 'Filler', color: '#7c3aed', hint: 'Can usually be cut.' },
  style: { name: 'AI-style pattern', color: '#0369a1', hint: 'A rhythm common in generated text.' },
  structure: { name: 'Readability', color: '#475569', hint: 'Sentence shape and variety.' },
};

const w = (word) => new RegExp(`\\b${word}\\b`, 'gi');

// [id, regex, category, suggestions, note]
const RAW = [
  // --- verbs that generated CVs love ---
  ['spearheaded', w('spearheaded'), 'buzzword', ['led', 'started', 'set up', 'ran']],
  ['spearheading', w('spearheading'), 'buzzword', ['leading', 'starting', 'running']],
  ['spearhead', w('spearhead(s)?'), 'buzzword', ['lead', 'start', 'run']],
  ['leveraged', w('leveraged'), 'buzzword', ['used', 'drew on', 'applied']],
  ['leveraging', w('leveraging'), 'buzzword', ['using', 'drawing on', 'applying']],
  ['leverage', w('leverage(s)?'), 'buzzword', ['use', 'apply', 'draw on']],
  ['utilized', w('utili[sz]ed'), 'buzzword', ['used']],
  ['utilizing', w('utili[sz]ing'), 'buzzword', ['using']],
  ['utilize', w('utili[sz]e(s)?'), 'buzzword', ['use']],
  ['utilization', w('utili[sz]ation'), 'buzzword', ['use']],
  ['orchestrated', w('orchestrated'), 'buzzword', ['organised', 'coordinated', 'ran']],
  ['orchestrating', w('orchestrating'), 'buzzword', ['organising', 'coordinating', 'running']],
  ['fostered', w('fostered'), 'buzzword', ['built', 'encouraged', 'grew']],
  ['fostering', w('fostering'), 'buzzword', ['building', 'encouraging', 'growing']],
  ['foster', w('foster(s)?'), 'buzzword', ['build', 'encourage']],
  ['honed', w('honed'), 'buzzword', ['developed', 'improved', 'built up']],
  ['championed', w('championed'), 'buzzword', ['pushed for', 'led', 'argued for']],
  ['championing', w('championing'), 'buzzword', ['pushing for', 'leading']],
  ['streamlined', w('streamlined'), 'buzzword', ['simplified', 'sped up', 'cut steps from']],
  ['streamlining', w('streamlining'), 'buzzword', ['simplifying', 'speeding up']],
  ['elevated', w('elevated'), 'buzzword', ['improved', 'raised']],
  ['elevate', w('elevat(e|es|ing)'), 'buzzword', ['improve', 'raise']],
  ['empowered', w('empowered'), 'buzzword', ['helped', 'trained', 'gave … the tools to']],
  ['empowering', w('empowering'), 'buzzword', ['helping', 'training']],
  ['facilitated', w('facilitated'), 'buzzword', ['ran', 'led', 'organised']],
  ['revolutionized', w('revolutioni[sz]ed'), 'buzzword', ['overhauled', 'changed', 'rebuilt']],
  ['delve', w('delv(e|es|ed|ing)'), 'buzzword', ['dig into', 'look into', 'explore']],
  ['showcasing', w('showcasing'), 'buzzword', ['showing', 'demonstrating']],
  ['showcased', w('showcased'), 'buzzword', ['showed', 'demonstrated']],
  ['navigate', /\bnavigat(e|ed|ing)\s+(the\s+)?(complex(ities)?|challenges|landscape)/gi, 'buzzword', ['handled', 'dealt with', 'worked through']],
  ['harness', w('harness(ed|ing)?'), 'buzzword', ['use', 'used', 'using']],
  ['catalyzed', w('catal[yi][sz]ed'), 'buzzword', ['started', 'triggered', 'led to']],
  ['architected', w('architected'), 'buzzword', ['designed', 'built']],
  ['amplified', w('amplified'), 'buzzword', ['increased', 'boosted']],
  ['bolstered', w('bolstered'), 'buzzword', ['strengthened', 'improved']],
  ['underscored', w('underscor(e|es|ed|ing)'), 'buzzword', ['showed', 'highlighted']],

  // --- adjectives / nouns ---
  ['seamless', w('seamless(ly)?'), 'buzzword', ['smooth', 'simple', 'easy'], 'Rarely true and rarely specific.'],
  ['robust', w('robust'), 'buzzword', ['strong', 'reliable', 'solid']],
  ['cutting-edge', /\b(cutting[- ]edge|state[- ]of[- ]the[- ]art|bleeding[- ]edge)\b/gi, 'buzzword', ['modern', 'new', 'up-to-date']],
  ['synergy', w('synerg(y|ies|istic)'), 'buzzword', ['teamwork', 'cooperation', 'combined effort']],
  ['pivotal', w('pivotal'), 'buzzword', ['key', 'important', 'central']],
  ['instrumental', /\b(was\s+)?instrumental in\b/gi, 'buzzword', ['helped with', 'played a key part in']],
  ['meticulous', w('meticulous(ly)?'), 'buzzword', ['careful', 'thorough']],
  ['myriad', /\b(a\s+)?myriad( of)?\b/gi, 'buzzword', ['many', 'lots of']],
  ['plethora', /\ba\s+plethora\s+of\b/gi, 'buzzword', ['many', 'lots of']],
  ['tapestry', /\b(rich\s+)?tapestry( of)?\b/gi, 'buzzword', ['mix of', 'range of']],
  ['landscape', /\b(ever[- ]evolving|ever[- ]changing|digital|dynamic|competitive)\s+landscape\b/gi, 'buzzword', ['market', 'industry', 'field']],
  ['realm', /\bthe\s+realm\s+of\b/gi, 'buzzword', ['', 'the field of'], '"In the realm of X" → "in X".'],
  ['holistic', w('holistic(ally)?'), 'buzzword', ['complete', 'whole', 'overall']],
  ['transformative', w('transformative|transformational'), 'buzzword', ['major', 'significant']],
  ['innovative', w('innovative'), 'buzzword', ['new', 'original'], 'Show what was new instead.'],
  ['world-class', /\b(world[- ]class|best[- ]in[- ]class|industry[- ]leading)\b/gi, 'buzzword', ['top', 'leading', 'well-known']],
  ['adept', /\badept (at|in)\b/gi, 'buzzword', ['good at', 'skilled in', 'experienced in']],
  ['deep understanding', /\b(deep|profound|keen) (understanding|knowledge|sense) of\b/gi, 'buzzword', ['solid knowledge of', 'good grasp of', 'experience with']],
  ['wide range', /\ba (wide|broad|diverse) (range|array|variety|spectrum) of\b/gi, 'buzzword', ['many', 'various', 'a range of']],
  ['unwavering', w('unwavering'), 'buzzword', ['steady', 'consistent', 'firm']],
  ['invaluable', w('invaluable'), 'buzzword', ['useful', 'important']],
  ['thrive', w('thriv(e|es|ing)'), 'buzzword', ['do well', 'work best', 'enjoy']],
  ['end-to-end', /\bend[- ]to[- ]end\b/gi, 'buzzword', ['full', 'complete', 'from start to finish']],
  ['stakeholders', /\bkey stakeholders\b/gi, 'buzzword', ['managers', 'clients', 'the teams involved'], 'Name who they actually were.'],
  ['cross-functional', /\bcross[- ]functional\b/gi, 'buzzword', ['multi-team', 'with other teams'], 'Fine occasionally; overused.'],
  ['actionable', /\bactionable insights?\b/gi, 'buzzword', ['clear findings', 'recommendations']],
  ['impactful', w('impactful'), 'buzzword', ['effective', 'useful']],

  // --- clichés ---
  ['results-driven', /\b(results|goal|detail|data|customer|people)[- ](driven|oriented|focused)\b/gi, 'cliche', [''], 'Every CV says this – show it with a result instead.'],
  ['proven track record', /\b(a\s+)?(proven|demonstrated|strong) track record( of| in)?\b/gi, 'cliche', ['', 'experience in'], 'Back it with a specific example.'],
  ['passionate', /\b(highly\s+)?passionate (about|for)\b/gi, 'cliche', ['interested in', 'enjoy', 'care about']],
  ['passionate2', w('passionate'), 'cliche', [''], 'Show interest through what you did.'],
  ['highly motivated', /\b(highly|self)[- ]motivated\b/gi, 'cliche', ['']],
  ['dynamic', w('dynamic'), 'cliche', ['', 'energetic', 'varied']],
  ['self-starter', /\b(self[- ]starter|go[- ]getter|team player|hard[- ]working|hardworking)\b/gi, 'cliche', [''], 'Show it with an example instead.'],
  ['fast-paced', /\b(in\s+(a|an|today's)\s+)?fast[- ]paced( environment| world)?\b/gi, 'cliche', [''], 'Cut it, or say how fast (e.g. "weekly releases").'],
  ['think outside', /\bthink(ing)? outside (of )?the box\b/gi, 'cliche', ['find new approaches']],
  ['commitment to excellence', /\b(commitment|dedication) to (excellence|quality|delivering)\b/gi, 'cliche', ['']],
  ['strong communication', /\b(excellent|strong|exceptional|outstanding) (communication|interpersonal|organi[sz]ational|problem[- ]solving|leadership) skills\b/gi, 'cliche', [''], 'Point to where you used them instead.'],
  ['testament', /\b(a\s+)?testament to\b/gi, 'cliche', ['shows', 'proof of']],
  ['drive', /\bdrive (innovation|growth|results|value|success|impact|engagement)\b/gi, 'cliche', ['improve', 'increase'], 'Say what changed and by how much.'],
  ['user-centric', /\b(user|customer|human)[- ]centric\b/gi, 'cliche', ['user-focused', 'practical']],
  ['wear many hats', /\bwear(ing)? (many|multiple) hats\b/gi, 'cliche', ['handle several roles']],
  ['value-add', /\badd(ed|ing)? value\b/gi, 'cliche', ['helped', 'improved'], 'What exactly improved?'],
  ['culture of', /\b(a\s+)?culture of (innovation|excellence|collaboration|continuous improvement)\b/gi, 'cliche', ['better teamwork', 'regular reviews']],

  // --- filler ---
  ['responsible for', /\b(was\s+)?responsible for\b/gi, 'filler', ['', 'managed', 'handled'], 'Lead with the action you took.'],
  ['successfully', w('successfully'), 'filler', [''], 'Implied – cut it.'],
  ['effectively', w('(effectively|efficiently)'), 'filler', ['']],
  ['in order to', /\bin order to\b/gi, 'filler', ['to']],
  ['various', /\bvarious different\b/gi, 'filler', ['various']],
  ['additionally', /\b(additionally|furthermore|moreover)\b,?/gi, 'filler', ['also', ''], 'Essay connectors read oddly in a CV.'],
  ['with a focus on', /\bwith (a|an) (strong |keen )?(focus|emphasis) on\b/gi, 'filler', ['focusing on', 'mainly']],
  ['ability to', /\b(proven |demonstrated )?ability to\b/gi, 'filler', ['', 'can'], 'Show it rather than claim it.'],
  ['strategic', w('strategic(ally)?'), 'filler', ['', 'planned'], 'Often decorative – keep only if it adds meaning.'],
  ['utmost', w('utmost'), 'filler', ['']],

  // --- style patterns ---
  ['em dash', /\s*—\s*/g, 'style', [', ', ' – ', '. '], 'Em dashes are a hallmark of generated text.', ['comma', 'en dash', 'full stop']],
  ['trailing ensuring', /,\s+(ensuring|resulting in|leading to|enabling|driving|fostering|thereby)\b/gi, 'style', [], 'A tacked-on "-ing" clause is a common AI rhythm. Try stating the result as its own sentence, e.g. "… Adoption rose 25%."'],
  ['not only', /\bnot only\b[^.]*\bbut also\b/gi, 'style', [], 'Usually reads more naturally as two plain statements.'],
];

export const RULES = RAW.map(([id, re, category, suggestions, note, labels]) => ({
  id,
  re,
  category,
  suggestions: suggestions || [],
  labels,
  note: note || CATEGORIES[category].hint,
}));

function sentenceSpans(text) {
  const out = [];
  const re = /[^.!?\n]+[.!?]*/g;
  let m;
  while ((m = re.exec(text))) {
    const s = m[0];
    const lead = s.length - s.trimStart().length;
    if (s.trim()) out.push({ start: m.index + lead, end: m.index + s.trimEnd().length, text: s.trim() });
  }
  return out;
}

const keyOf = (ruleId, match) => `${ruleId}|${match.toLowerCase().trim()}`;

/**
 * Scan a piece of text. Returns non-overlapping findings sorted by position.
 * @param {string} text
 * @param {string[]} ignored keys from `keyOf`
 */
export function scanText(text, ignored = [], { structure = true } = {}) {
  if (!text) return [];
  const found = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text))) {
      if (m[0].length === 0) {
        rule.re.lastIndex++;
        continue;
      }
      const key = keyOf(rule.id, m[0]);
      if (ignored.includes(key)) continue;
      found.push({ rule, start: m.index, end: m.index + m[0].length, match: m[0], key });
    }
  }

  if (structure) {
    // Long sentences
    for (const s of sentenceSpans(text)) {
      const words = s.text.split(/\s+/).filter(Boolean).length;
      if (words > 32) {
        const key = keyOf('long', s.text.slice(0, 40));
        if (!ignored.includes(key))
          found.push({
            rule: { id: 'long', category: 'structure', suggestions: [], note: `Long sentence (${words} words). Consider splitting it.` },
            start: s.start,
            end: s.end,
            match: s.text,
            key,
            soft: true,
          });
      }
    }
    // Repeated bullet openers in the same field
    const lines = text.split('\n');
    const seen = {};
    let offset = 0;
    for (const line of lines) {
      const m = /^(\s*(?:[-*•]\s+)?)([A-Za-z]+)/.exec(line);
      if (m && /^\s*[-*•]\s/.test(line)) {
        const word = m[2].toLowerCase();
        seen[word] = (seen[word] || 0) + 1;
        if (seen[word] === 2 && word.length > 2) {
          const start = offset + m[1].length;
          const key = keyOf('repeat', word);
          if (!ignored.includes(key))
            found.push({
              rule: { id: 'repeat', category: 'structure', suggestions: [], note: `Several bullets start with "${m[2]}". Vary the opening verbs.` },
              start,
              end: start + m[2].length,
              match: m[2],
              key,
            });
        }
      }
      offset += line.length + 1;
    }
  }

  // Resolve overlaps: prefer earlier start, then longer, and keep "soft" (long sentence) findings separately
  const hard = found.filter((f) => !f.soft).sort((a, b) => a.start - b.start || b.end - a.end);
  const result = [];
  let lastEnd = -1;
  for (const f of hard) {
    if (f.start >= lastEnd) {
      result.push(f);
      lastEnd = f.end;
    }
  }
  return [...result, ...found.filter((f) => f.soft)].sort((a, b) => a.start - b.start);
}

function matchCase(original, replacement) {
  if (!replacement) return replacement;
  const first = original.trim()[0];
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    const i = replacement.search(/[a-z]/i);
    if (i >= 0) return replacement.slice(0, i) + replacement[i].toUpperCase() + replacement.slice(i + 1);
  }
  return replacement;
}

/** Apply a suggestion to text and tidy the whitespace / capitalisation around it. */
export function applySuggestion(text, finding, replacement) {
  const rep = matchCase(finding.match, replacement);
  let before = text.slice(0, finding.start);
  let after = text.slice(finding.end);

  if (rep.trim() === '') {
    before = before.replace(/[ \t]+$/, '');
    after = after.replace(/^[ \t]+/, '');
    const lineStart = before === '' || /\n$/.test(before) || /(^|\n)\s*[-*•]$/.test(before);
    const sentenceStart = lineStart || /[.!?]$/.test(before);
    if (sentenceStart) after = after.replace(/^[,;:]\s*/, '').replace(/^[a-z]/, (c) => c.toUpperCase());
    const sep = before && !/\n$/.test(before) && after && !/^[,.;:)!?\n]/.test(after) ? ' ' : '';
    return before + sep + after;
  }
  // replacements ending a sentence: capitalise what follows
  if (/[.!?]\s*$/.test(rep)) after = after.replace(/^(\s*)([a-z])/, (_, sp, c) => sp + c.toUpperCase());
  return before + rep + after;
}

export function ignoreKey(finding) {
  return finding.key;
}

/** Count findings per category across a list of {text}. */
export function summarize(findings) {
  const counts = {};
  for (const f of findings) counts[f.rule.category] = (counts[f.rule.category] || 0) + 1;
  return counts;
}
