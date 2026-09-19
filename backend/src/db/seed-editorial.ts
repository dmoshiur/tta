/**
 * Starter editorial library: articles, knowledge pieces, world affairs analysis,
 * humanity and society essays, and book summaries. Real rows, editable from the
 * admin panel. Disable with SEED_DEMO_CONTENT=false.
 */

export interface SeedSource {
  title: string;
  url: string;
}

export interface SeedContent {
  type: 'ARTICLE' | 'KNOWLEDGE' | 'WORLD' | 'HUMANITY' | 'SOCIETY';
  title: string;
  slug: string;
  category: string;
  stance?: 'FACT' | 'ANALYSIS' | 'OPINION';
  excerpt: string;
  body: string;
  tags: string[];
  sources?: SeedSource[];
  featured?: boolean;
  /** Structured fields for World Affairs items. */
  meta?: Record<string, unknown>;
}

export interface SeedBook {
  title: string;
  slug: string;
  author: string;
  year: number;
  pages: number;
  rating: number;
  category: string;
  description: string;
  summary: string;
  keyIdeas: { title: string; detail: string }[];
  lessons: string[];
  context: string;
  applications: string;
  review: string;
  recommendation: string;
  tags: string[];
  featured?: boolean;
}

export const SEED_CONTENT: SeedContent[] = [
  {
    type: 'KNOWLEDGE',
    title: 'Why the Scientific Method Still Matters',
    slug: 'why-the-scientific-method-still-matters',
    category: 'knowledge-science',
    stance: 'ANALYSIS',
    featured: true,
    excerpt:
      'Science is often described as a body of facts. It is better understood as a set of habits for being reliably wrong in smaller and smaller ways.',
    tags: ['science', 'method', 'evidence'],
    body: `<p>Ask what science is and most people list results: vaccines, satellites, the periodic table. The results are downstream of something less glamorous — a method for reducing the influence of our own preferences on what we believe.</p>
<h2>The core moves</h2>
<p>Four ideas do most of the work. <strong>Empirical testing</strong>: claims are checked against observation, not against authority or intuition. <strong>Falsifiability</strong>: a claim must specify what evidence would count against it; a statement compatible with every possible outcome says nothing. <strong>Reproducibility</strong>: others must be able to repeat the procedure and get comparable results, which is why methods are published in detail. <strong>Peer review</strong>: people with incentives to find errors look for them before publication.</p>
<h2>What it is not</h2>
<p>The method is not a guarantee of truth. Individual studies fail; some fields have suffered from publication bias and replication problems; scientists are subject to the same career pressures and biases as everyone else. That is precisely why the method is collective and iterative — errors are found by other people, later.</p>
<h2>Why it matters beyond the laboratory</h2>
<p>The habits transfer. Distinguishing an observation from an interpretation, asking how a number was measured, wondering what would change your mind, and preferring a proportionate conclusion to a dramatic one are not laboratory skills. They are citizenship skills. In an information environment optimised for engagement rather than accuracy, the ability to ask "how do we know?" is a form of self-defence — and a precondition for a society that can correct itself.</p>`,
    sources: [
      { title: 'Stanford Encyclopedia of Philosophy — Scientific Method', url: 'https://plato.stanford.edu/entries/scientific-method/' },
      { title: 'Understanding Science (University of California Museum of Paleontology)', url: 'https://undsci.berkeley.edu/' },
    ],
  },
  {
    type: 'KNOWLEDGE',
    title: 'Habits: The Psychology of Small Repeated Actions',
    slug: 'habits-psychology-of-small-repeated-actions',
    category: 'knowledge-psychology',
    stance: 'ANALYSIS',
    excerpt:
      'Willpower is a poor engine for lasting change. Cue, routine and reward — plus a forgiving environment — do the work.',
    tags: ['psychology', 'habits', 'behaviour'],
    body: `<p>Most of what we do daily is not decided each time. It is cued. Habit research commonly describes a loop: a <strong>cue</strong> triggers a <strong>routine</strong>, which produces a <strong>reward</strong>, and over repetitions the cue alone begins to generate the routine automatically.</p>
<h2>Why motivation fails</h2>
<p>Motivation is state-dependent — it rises with mood, novelty and social pressure, then falls. A system that requires motivation every day will fail on an ordinary bad day. Habits work because they move the decision upstream, into a context you control once rather than a choice you must make repeatedly.</p>
<h2>Design over discipline</h2>
<ul>
<li><strong>Make the cue obvious.</strong> Attach the new behaviour to an existing one: after I pour my morning tea, I write three sentences.</li>
<li><strong>Make it small.</strong> Two minutes is enough to establish the loop; the goal at first is repetition, not intensity.</li>
<li><strong>Make the reward visible.</strong> A simple tick on a calendar is surprisingly effective because it makes progress concrete.</li>
<li><strong>Change the environment.</strong> Placing a book on the pillow and the phone in another room does more than resolving to read more.</li>
</ul>
<h2>The honest caveat</h2>
<p>Habit formation takes weeks to months and varies widely between people and behaviours. Setbacks are normal and are not evidence of failure; the research-consistent response is to restart the loop the same day rather than treating a missed day as permission to abandon the practice.</p>`,
    sources: [
      { title: 'European Journal of Social Psychology — How are habits formed?', url: 'https://onlinelibrary.wiley.com/doi/10.1002/ejsp.674' },
    ],
  },
  {
    type: 'KNOWLEDGE',
    title: 'How the Printing Press Changed Everything',
    slug: 'how-the-printing-press-changed-everything',
    category: 'knowledge-history',
    stance: 'FACT',
    excerpt:
      'Movable type did not merely make books cheaper. It changed who could know things, how fast ideas travelled, and what institutions could control.',
    tags: ['history', 'technology', 'media'],
    body: `<p>Johannes Gutenberg's press, developed in Mainz around 1450, combined movable metal type, an oil-based ink and a modified screw press. The technology spread across Europe within decades, and by 1500 printing shops had produced millions of volumes.</p>
<h2>Before and after</h2>
<p>Manuscript copying was slow and expensive, so knowledge concentrated in institutions that could afford scriptoria. Print multiplied copies at falling cost. Prices of books dropped, literacy expanded beyond clerical and aristocratic circles, and texts became standardised — two readers in different cities could finally cite the same page.</p>
<h2>Consequences that followed</h2>
<ul>
<li><strong>The Reformation.</strong> Pamphlets and translated scriptures circulated faster than authorities could suppress them.</li>
<li><strong>Science.</strong> Precise tables, diagrams and identical copies allowed results to be checked and built upon across borders.</li>
<li><strong>Vernacular languages.</strong> Printing in local languages rather than Latin helped standardise spelling and grammar.</li>
<li><strong>Public opinion.</strong> Periodicals created something new: a readership that discussed the same news at the same time.</li>
</ul>
<h2>Why the parallel to today is imperfect — and useful</h2>
<p>Digital media are often compared to print, and the comparison holds in one respect: both reduced the cost of reproduction and weakened gatekeepers. It fails in another: print raised the fixed cost of publication, which created editorial institutions with reputations to protect. The internet lowered it toward zero, which is why the problem now is not access to information but the evaluation of it — the same skill set that critical thinking exists to teach.</p>`,
    sources: [
      { title: 'British Library — Gutenberg and the printing press', url: 'https://www.bl.uk/learning/timeline/item126567.html' },
      { title: 'Library of Congress — Gutenberg Bible', url: 'https://www.loc.gov/collections/gutenberg-bible/' },
    ],
  },
  {
    type: 'WORLD',
    title: 'How International Organizations Shape Global Governance',
    slug: 'how-international-organizations-shape-global-governance',
    category: 'world-international-organizations',
    stance: 'ANALYSIS',
    featured: true,
    excerpt:
      'No world government exists, yet states coordinate on trade, health, aviation, finance and human rights every day. Understanding who has authority — and who only has influence — explains most of it.',
    tags: ['united nations', 'governance', 'institutions'],
    meta: {
      event: 'The operation of the post-1945 institutional system: the United Nations, Bretton Woods institutions, the WTO and regional bodies.',
      background:
        'After 1945 states built permanent organisations to make cooperation less dependent on ad hoc diplomacy. The UN Charter created a General Assembly of all members and a Security Council with five permanent members holding veto power. The Bretton Woods conference of 1944 established the IMF and the World Bank; the WTO succeeded the GATT system in 1995.',
      causes: [
        'Two world wars demonstrated the cost of uncoordinated security and economic policy.',
        'Trade and finance became interdependent, requiring standing rules.',
        'Decolonisation multiplied the number of sovereign states, making ad hoc diplomacy impractical.',
      ],
      actors: [
        'The United Nations and its specialised agencies',
        'The IMF, World Bank and WTO',
        'Regional bodies: the EU, African Union, ASEAN, SAARC, OIC',
        'Great powers, whose cooperation determines whether institutions can act',
        'Civil society organisations and multinational corporations',
      ],
      perspectives: [
        'Institutionalists argue organisations reduce uncertainty, lower transaction costs and make commitments credible.',
        'Realists argue organisations reflect the interests of powerful states and constrain little that matters.',
        'Critics from the Global South point to unequal voting weights and conditionality in financial institutions.',
      ],
      implications: [
        'Where authority is binding (Security Council resolutions, WTO dispute rulings) outcomes are enforceable; where it is advisory, compliance depends on reputation and domestic politics.',
        'Reform debates concentrate on representation — Security Council composition and IMF quotas.',
        'Fragmentation into competing regional and issue-based blocs is as significant as any single institution\'s decline.',
      ],
    },
    sources: [
      { title: 'Charter of the United Nations', url: 'https://www.un.org/en/about-us/un-charter' },
      { title: 'International Monetary Fund — About the IMF', url: 'https://www.imf.org/en/About' },
      { title: 'World Trade Organization — What is the WTO?', url: 'https://www.wto.org/english/thewto_e/whatis_e/whatis_e.htm' },
    ],
    body: `<p>Global governance is a strange thing: rules without a ruler. There is no world government, no global police force, and no legislature whose decisions bind every state. Yet aviation standards, postal arrangements, disease reporting, trade tariffs, refugee protection and maritime boundaries are governed by standing institutions that states mostly obey.</p>
<h2>Facts first</h2>
<p>The United Nations has 193 member states. Its General Assembly operates on one-state-one-vote and produces recommendations; its Security Council can adopt binding resolutions and authorise sanctions, and five permanent members — China, France, Russia, the United Kingdom and the United States — hold veto power. The IMF and World Bank, created after the 1944 Bretton Woods conference, allocate voting weight largely by financial contribution, which gives the largest economies decisive influence. The WTO, operating since 1995, has a dispute settlement system whose rulings can authorise retaliatory measures.</p>
<h2>Analysis: three kinds of power</h2>
<p>These institutions hold three distinct kinds of power, and confusing them produces bad commentary. <strong>Binding authority</strong> is rare — Security Council measures, WTO rulings, and, within the EU, directly applicable law. <strong>Financial leverage</strong> is substantial: IMF lending comes with conditions that shape national budgets. <strong>Normative influence</strong> is diffuse but durable: monitoring bodies, naming-and-shaming, technical standards and the slow work of defining what counts as legitimate behaviour.</p>
<h2>Where the system strains</h2>
<p>Veto use can paralyse the Security Council exactly when action is most contested. Representation lags the distribution of economic power, which is why reform of quotas and Council composition never leaves the agenda. And institutions designed for interstate problems now face transnational ones — pandemics, climate, financial contagion, information operations — that no single body has a mandate to solve.</p>
<p>The practical lesson for readers is simple: when a headline says an organisation "acted", ask which kind of power was used. A condemnation, a loan, a sanction and a court ruling are four different events, and only one of them usually changes behaviour on the ground.</p>`,
  },
  {
    type: 'WORLD',
    title: 'Chokepoints: Why Narrow Waterways Move Global Markets',
    slug: 'chokepoints-why-narrow-waterways-move-global-markets',
    category: 'world-geopolitics',
    stance: 'ANALYSIS',
    excerpt:
      'A few kilometres of water carry a large share of world trade. Geography has not been abolished by technology — it has been concentrated.',
    tags: ['geopolitics', 'trade', 'energy'],
    meta: {
      event: 'The strategic significance of maritime chokepoints in global trade and energy flows.',
      background:
        'Most international freight moves by sea because shipping is far cheaper per tonne than air or land transport. Certain routes have no practical alternative at scale: the Suez Canal, the Strait of Hormuz, the Strait of Malacca, Bab el-Mandeb, the Danish Straits and the Panama Canal.',
      causes: [
        'Physical geography concentrates traffic into narrow passages.',
        'Canals and shortcuts save thousands of kilometres compared with alternative routes.',
        'Energy production is geographically concentrated in the Gulf, making export routes strategic.',
      ],
      actors: ['Coastal states bordering the straits', 'Naval powers protecting sea lanes', 'Shipping companies and insurers', 'Energy producers and consumers'],
      perspectives: [
        'Strategic analysts treat chokepoints as sources of leverage and vulnerability.',
        'Economists emphasise substitution: pipelines, alternative routes and inventory buffers reduce dependence over time.',
        'International lawyers focus on transit passage rights under the law of the sea.',
      ],
      implications: [
        'Insurance premiums and freight rates react within days to threats, even without physical damage.',
        'States invest in ports, pipelines and naval capability specifically to reduce chokepoint dependence.',
        'A disruption anywhere along a route raises prices everywhere along it.',
      ],
    },
    sources: [
      { title: 'United Nations Convention on the Law of the Sea', url: 'https://www.un.org/depts/los/convention_agreements/convention_overview_convention.htm' },
      { title: 'UNCTAD — Review of Maritime Transport', url: 'https://unctad.org/topic/transport/trade-logistics-and-supply-chain' },
    ],
    body: `<p>About eighty percent of global trade by volume travels by sea. That single fact explains why a blocked canal, a threatened strait or a spike in war-risk insurance moves prices on every continent within days.</p>
<h2>What makes a chokepoint</h2>
<p>A chokepoint is a narrow passage that a large share of traffic must use because alternatives are absent or uneconomic. The Suez Canal links the Mediterranean to the Red Sea and saves the journey around Africa. The Strait of Hormuz, roughly 33 kilometres wide at its narrowest and with much narrower usable shipping lanes, carries a large share of seaborne oil from Gulf producers. The Strait of Malacca connects the Indian Ocean to the South China Sea and serves East Asian energy imports. Bab el-Mandeb guards the southern approach to Suez; the Panama Canal links the Atlantic and Pacific.</p>
<h2>Why the economics react so fast</h2>
<p>Disruption does not require destruction. When risk rises, insurers reprice war-risk cover, some owners reroute, and charter rates climb. Even a fully successful transit becomes more expensive. Because shipping operates on thin margins and tight schedules, cost increases propagate into freight rates, then into import prices, then into consumer inflation — with a lag of weeks rather than months.</p>
<h2>How states respond</h2>
<p>The standard responses are strategic hedging: pipelines that bypass a strait, port and rail investments that offer another corridor, strategic petroleum reserves, naval escort arrangements, and diplomatic engagement with the coastal states that control the shorelines. None of these eliminate dependence; they diversify it.</p>
<p>For readers, the useful habit is proportion. Chokepoint stories invite alarm because they are vivid. The analytical question is always the same: what share of traffic is affected, what substitutes exist, how long the disruption lasts, and who bears the cost. Those four questions turn a dramatic headline into an assessment.</p>`,
  },
  {
    type: 'HUMANITY',
    title: 'Empathy Is a Practice, Not a Personality Trait',
    slug: 'empathy-is-a-practice-not-a-personality-trait',
    category: 'humanity-empathy',
    stance: 'OPINION',
    featured: true,
    excerpt:
      'We talk about empathetic people as though understanding others were a gift of temperament. It is closer to a skill — unevenly distributed, trainable, and exhausted by overuse.',
    tags: ['empathy', 'ethics', 'relationships'],
    body: `<p>Some people seem naturally attuned to others. But treating empathy as a fixed trait has a hidden cost: it lets the rest of us off the hook, and it hides the fact that attunement is mostly a set of learnable behaviours.</p>
<h2>What the practice consists of</h2>
<p>Attention is the foundation. You cannot understand someone you are not actually listening to, and listening is a physical act — phone down, body turned toward the speaker, interruptions suppressed long enough to hear the end of a sentence. The second element is curiosity about causes rather than conclusions: not "why would anyone think that?" but "what has this person seen that I have not?" The third is verification — checking your understanding aloud, because assumed understanding is the most common source of failed comfort.</p>
<h2>The limits, honestly stated</h2>
<p>Empathy is biased toward the similar, the near and the singular. One identifiable child moves us more than a statistic describing thousands; our own group more than a rival group. Awareness of the bias does not remove it, so the corrective is procedural: deliberately extend attention to people you would naturally skip, and treat emotional resonance as a prompt to investigate rather than a conclusion.</p>
<p>Empathy also depletes. People in caring roles who absorb others' distress without recovery tend toward burnout, and burnt-out helpers stop helping. Compassion that includes boundaries lasts longer than compassion that does not.</p>
<h2>Why this matters beyond the personal</h2>
<p>Institutions are made of people, and the quality of a hospital ward, a classroom, a court or a comment section depends on whether the humans inside it practise attention. A society does not become more humane because its members develop warmer personalities. It becomes more humane because enough of them, repeatedly, do the slightly harder thing: listen first, assume a reason, and refuse to treat another person as an argument.</p>`,
  },
  {
    type: 'HUMANITY',
    title: 'Human Dignity Is Not Earned',
    slug: 'human-dignity-is-not-earned',
    category: 'humanity-dignity',
    stance: 'ANALYSIS',
    excerpt:
      'Dignity is the idea that a person has worth by virtue of being a person. Its usefulness lies precisely in the cases where nothing else justifies decent treatment.',
    tags: ['dignity', 'human rights', 'ethics'],
    body: `<p>Most moral intuitions are conditional: we treat people well because they are useful, related to us, agreeable, or able to reciprocate. Dignity is the concept that refuses those conditions.</p>
<h2>Where the idea comes from</h2>
<p>It has several independent roots. Religious traditions teach that each person is sacred or made in the divine image. Kant argued that rational beings must be treated as ends in themselves and never merely as means — a formulation that rules out using people as instruments however useful that would be. Modern human rights law made the idea operational: the Universal Declaration of Human Rights, adopted in 1948, begins by recognising the inherent dignity and equal and inalienable rights of all members of the human family.</p>
<h2>Why "not earned" is the whole point</h2>
<p>If dignity depended on capacity, contribution or conduct, it would collapse exactly where protection is needed: for the severely disabled, the very old, prisoners, the defeated, the unpopular, the unproductive and the stranger. An unconditional claim is what allows rights to survive the loss of everything else.</p>
<p>This is why dignity can be violated but not forfeited. Humiliation, torture, arbitrary detention and degrading poverty do not reduce a person's worth; they describe a failure by others to recognise it.</p>
<h2>What it demands in practice</h2>
<p>Dignity is concrete. It shows up as procedural fairness — being told why, being allowed to respond. As privacy — in a hospital, a shelter, a search. As language — names used correctly, no slurs, no contempt in official documents. As material minimums — food, water, shelter, healthcare, because dignity without subsistence is a slogan. And as recognition: the smallest human need, to be seen by someone who could have looked away.</p>
<p>The test of any institution is not how it treats its best members but how it treats people who can do nothing for it.</p>`,
    sources: [{ title: 'Universal Declaration of Human Rights', url: 'https://www.un.org/en/about-us/universal-declaration-of-human-rights' }],
  },
  {
    type: 'SOCIETY',
    title: 'Dialogue Across Difference',
    slug: 'dialogue-across-difference',
    category: 'society-dialogue',
    stance: 'ANALYSIS',
    featured: true,
    excerpt:
      'Tolerance is often described as putting up with people. Dialogue is harder and more useful: it is the practice of trying to be understood by someone you disagree with.',
    tags: ['dialogue', 'diversity', 'cohesion'],
    body: `<p>A diverse society does not require agreement. It requires a way of handling disagreement that does not escalate into dehumanisation. That way is dialogue, and it is a technique before it is a virtue.</p>
<h2>What dialogue is not</h2>
<p>It is not debate, where the goal is to win and the audience matters more than the opponent. It is not negotiation, where the goal is a deal. It is not therapy, and it is not surrender. Dialogue aims at mutual understanding — including accurate understanding of the disagreement itself, which is often the real obstacle.</p>
<h2>The mechanics</h2>
<ul>
<li><strong>Steel-manning.</strong> State the other position in terms its holder would accept, before criticising it. This is the opposite of the straw man and it changes the temperature immediately.</li>
<li><strong>Specificity.</strong> Argue about a concrete case rather than a category. "What should happen in this situation?" is answerable; "people like you always…" is not.</li>
<li><strong>Separating layers.</strong> Name whether you are disputing facts, interpretations or values. Most arguments stall because two people are on different layers without noticing.</li>
<li><strong>Listening for the concern.</strong> Positions are often proxies for underlying worries — security, recognition, fairness, fear of loss. Addressing the concern can move a stalemate that logic cannot.</li>
<li><strong>Agreeing on the disagreement.</strong> A successful dialogue often ends with both sides able to describe the other's view accurately and still disagree. That is not failure; it is the minimum condition for a shared society.</li>
</ul>
<h2>The civic stakes</h2>
<p>Where dialogue collapses, disagreement is handled through exclusion, intimidation or violence. Institutions matter here — courts, parliaments, a free press, and schools that teach argument as a craft — because they give disagreement a procedure. But procedures depend on habits, and habits are formed in ordinary conversations where one person decides, again, to listen before answering.</p>`,
  },
  {
    type: 'SOCIETY',
    title: 'Responsible Citizenship Starts Small',
    slug: 'responsible-citizenship-starts-small',
    category: 'society-responsible-citizenship',
    stance: 'OPINION',
    excerpt:
      'Citizenship is usually discussed as voting and rights. Most of its substance is the unglamorous daily behaviour that makes public life predictable and fair.',
    tags: ['citizenship', 'community', 'civic responsibility'],
    body: `<p>A country's institutions are only as good as the ordinary conduct they rest on. Laws cannot be enforced at every moment; most compliance is voluntary, most honesty is unwitnessed, and most public order is maintained by people who choose not to take the extra advantage available to them.</p>
<h2>The small list</h2>
<ul>
<li>Queueing honestly, including when nobody is watching and cutting would be easy.</li>
<li>Returning what is not yours, reporting what you should, and correcting your own errors publicly.</li>
<li>Paying for what you consume — including taxes, tickets and licences — because public services are other people's labour.</li>
<li>Keeping shared space usable: litter, noise, parking, water, electricity.</li>
<li>Telling the truth about what you know, and admitting what you do not.</li>
</ul>
<h2>The informed part</h2>
<p>Responsibility also has a cognitive dimension. A citizen who shares an unverified claim is participating in the information system, and carelessly. Checking a source before forwarding, distinguishing a fact from an interpretation, and refusing to amplify outrage you have not examined are civic acts with measurable consequences — misinformation travels because people forward it, and it slows when they do not.</p>
<h2>Beyond compliance</h2>
<p>The next level is contribution: voting in every election rather than only the dramatic ones, attending a local meeting, joining a school committee, supporting a community organisation, teaching something you know to someone who does not. These are unfashionable because they are slow and rarely photographed.</p>
<p>But this is the honest conclusion: societies do not improve primarily through the righteousness of their loudest members. They improve when a critical mass of ordinary people decide that the standard they demand from officials is a standard they will also meet themselves.</p>`,
  },
  {
    type: 'ARTICLE',
    title: 'How to Read a Book So It Changes You',
    slug: 'how-to-read-a-book-so-it-changes-you',
    category: 'books-summary',
    stance: 'ANALYSIS',
    excerpt:
      'Most books are consumed and forgotten within a week. The difference is not intelligence but method — and the method can be learned in an afternoon.',
    tags: ['reading', 'books', 'learning'],
    body: `<p>Finishing a book and understanding a book are different achievements. The gap is not effort but structure: most readers start on page one and read straight through, which is efficient for plot and inefficient for ideas.</p>
<h2>Read a non-fiction book in four passes</h2>
<ol>
<li><strong>Survey (15 minutes).</strong> Contents, introduction, conclusion, chapter headings, index. You are building the map before walking the territory, and deciding whether the book deserves your time at all.</li>
<li><strong>Skim for the argument.</strong> Read the first and last paragraph of each chapter. Most serious non-fiction states its claim at the beginning and restates it at the end.</li>
<li><strong>Read the chapters that carry the argument closely</strong> — usually three or four — and merely browse the rest. Uniform attention is the enemy of understanding.</li>
<li><strong>Write the book down.</strong> Half a page, in your own words: the problem, the argument, the strongest evidence, the weakest point, and one thing you will do differently.</li>
</ol>
<h2>Argue with the author</h2>
<p>Reading well is adversarial in a friendly way. Ask: what does the author assume? What evidence would change their mind? Where is the example unrepresentative? What would a competent critic say? A book you have argued with is a book you will remember; a book you merely agreed with is a book you will forget.</p>
<h2>Connect it outward</h2>
<p>Knowledge is retained in proportion to its connections. After each book, write one sentence linking it to something you already know — another book, an event, a problem you are solving. Over time these links form a personal map of ideas, which is what people mean when they say someone is "well read": not volume consumed, but a structure built.</p>`,
  },
  {
    type: 'ARTICLE',
    title: 'A Note-Taking System for Lifelong Learning',
    slug: 'a-note-taking-system-for-lifelong-learning',
    category: 'academic-notes',
    stance: 'ANALYSIS',
    excerpt:
      'Notes fail when they are transcripts. They work when they are transformations — the same idea rebuilt in your own words, indexed for future retrieval.',
    tags: ['notes', 'learning', 'productivity'],
    body: `<p>Transcription feels like work and produces nothing usable. The reason is that copying bypasses the processing that creates understanding. A note is worth keeping only if it required you to think.</p>
<h2>A minimum viable system</h2>
<ul>
<li><strong>Capture quickly, transform later.</strong> During a lecture or reading, jot keywords and questions. Within twenty-four hours, rewrite them as sentences in your own words. The rewrite is where learning happens.</li>
<li><strong>One idea per note.</strong> Atomic notes can be linked and reused; long pages cannot. Give each a title that states the idea as a claim, not a topic: "Prices rise when supply falls short of demand", not "Supply and demand".</li>
<li><strong>Always record the source.</strong> Author, title, page or timestamp. A brilliant note you cannot cite becomes a rumour you cannot verify.</li>
<li><strong>Link deliberately.</strong> Each new note should connect to at least one existing note. Contradictions are the most valuable links — write them down explicitly.</li>
<li><strong>Maintain an index and a review queue.</strong> Ten minutes weekly scanning recent notes turns storage into memory.</li>
</ul>
<h2>Three note types worth separating</h2>
<p><strong>Literature notes</strong> summarise what a source says. <strong>Permanent notes</strong> state what you now believe, in your own words, with the source attached. <strong>Project notes</strong> assemble permanent notes toward an output — an essay, an exam, a decision. Keeping them apart prevents the common failure of a system that grows until nobody can find anything.</p>
<h2>The honest test</h2>
<p>After a month, open a note and ask whether you understand it without the source. If you do not, the system is collecting rather than learning. Fewer, better notes beat an archive of other people's sentences — the same principle that makes retrieval practice work in studying, applied to a lifetime of reading.</p>`,
  },
];

export const SEED_BOOKS: SeedBook[] = [
  {
    title: 'Thinking, Fast and Slow',
    slug: 'thinking-fast-and-slow',
    author: 'Daniel Kahneman',
    year: 2011,
    pages: 499,
    rating: 4.5,
    category: 'books-summary',
    featured: true,
    description:
      'A Nobel laureate\'s synthesis of four decades of research on judgement and decision making — why we are systematically, predictably irrational.',
    summary:
      'Kahneman organises mental life into two systems. System 1 operates automatically and quickly, generating impressions, intuitions and impulses with little effort. System 2 is deliberate, slow and effortful, capable of complex computation but lazy, and often content to endorse what System 1 supplies. Most of the book documents the predictable errors this arrangement produces — and the uncomfortable finding that knowing about them rarely prevents them.',
    keyIdeas: [
      { title: 'Two systems, one mind', detail: 'System 1 is fast, automatic and associative; System 2 is slow, effortful and easily depleted. Judgement errors usually originate in System 1 and are ratified by an inattentive System 2.' },
      { title: 'Heuristics and biases', detail: 'Under uncertainty the mind substitutes easier questions for hard ones. Availability replaces "how likely?" with "how easily can I think of examples?", which is why vivid events dominate risk perception.' },
      { title: 'Prospect theory and loss aversion', detail: 'People evaluate outcomes as gains and losses relative to a reference point, and losses weigh roughly twice as heavily as equivalent gains. This explains risk-averse behaviour in gains and risk-seeking behaviour in losses.' },
      { title: 'Overconfidence and the illusion of understanding', detail: 'Narrative coherence feels like evidence. Confidence tracks story quality, not predictive accuracy — which is why expert forecasts in uncertain fields so often fail to beat chance.' },
      { title: 'Two selves', detail: 'The experiencing self lives through moments; the remembering self constructs stories and makes decisions. We often optimise the memory of an experience rather than the experience itself.' },
    ],
    lessons: [
      'Before an important judgement, ask which question you are actually answering — you may have substituted an easier one without noticing.',
      'Use checklists and pre-committed criteria for repeated decisions; they discipline System 1 better than intentions do.',
      'Treat your own confidence as weak evidence. Ask what the base rate is before considering the story.',
      'Frame losses and gains explicitly when deciding: the same outcome can feel like disaster or relief depending on the reference point.',
      'Distrust a coherent narrative in a complex situation; coherence is a property of stories, not of truth.',
    ],
    context:
      'Kahneman, a psychologist, received the Nobel Memorial Prize in Economic Sciences in 2002 for integrating psychological research into economic science, especially concerning judgement and decision-making under uncertainty. The book grew out of his collaboration with Amos Tversky, whose work on heuristics and biases in the 1970s challenged the assumption of the rational economic agent.',
    applications:
      'For students, it explains why intuitive answers on reasoning tests are wrong so reliably and how to build the habit of checking. For professionals, it underpins practical debiasing: structured interviews, blind review, reference-class forecasting, and decision checklists used in medicine and aviation. For citizens, it is a guide to how political and commercial communication exploits availability, framing and loss aversion.',
    review:
      'The book\'s strength is its honesty: it reports replications, failures and the limits of its own claims, and it does not promise that reading it will make you rational. Its weakness is length — several chapters summarise studies that a general reader will find repetitive — and its treatment of some findings predates later replication debates, so readers should treat individual effect sizes cautiously even where the overall pattern is robust. As a map of human judgement it remains the best single volume available.',
    recommendation:
      'Pair with Richard Thaler and Cass Sunstein\'s "Nudge" for the policy application, and with Gerd Gigerenzer\'s "Risk Savvy", which argues that simple heuristics often outperform complex analysis — a productive disagreement with Kahneman rather than a refutation.',
    tags: ['psychology', 'decision making', 'economics'],
  },
  {
    title: 'Sapiens: A Brief History of Humankind',
    slug: 'sapiens-a-brief-history-of-humankind',
    author: 'Yuval Noah Harari',
    year: 2011,
    pages: 443,
    rating: 4.3,
    category: 'books-summary',
    description:
      'A sweeping account of how an unremarkable ape came to dominate the planet — through the ability to cooperate flexibly in large numbers around shared fictions.',
    summary:
      'Harari structures human history around three revolutions: cognitive, agricultural and scientific. The central claim is that Homo sapiens succeeded not because of individual intelligence but because of the capacity to believe in shared imagined orders — money, states, laws, religions, corporations — which allow millions of strangers to cooperate.',
    keyIdeas: [
      { title: 'Imagined orders enable large-scale cooperation', detail: 'Chimpanzees cooperate in small bands with individuals they know. Humans cooperate with strangers because both believe in the same stories about gods, nations, money and rights.' },
      { title: 'Fictions are not lies', detail: 'Money and human rights do not exist in physics; they exist in shared belief. That does not make them unreal — it makes them powerful and revisable.' },
      { title: 'The agricultural bargain', detail: 'Farming supported far more people per unit of land but often delivered harder labour, worse nutrition and greater inequality. Harari famously asks whether we domesticated wheat or wheat domesticated us.' },
      { title: 'The scientific revolution as an admission of ignorance', detail: 'Modern science began when institutions accepted that they did not know the most important things, and organised to find out — coupled with empire and capital that funded the search.' },
      { title: 'Progress and happiness are separate questions', detail: 'Material power has grown enormously; whether humans are happier is far less clear, since wellbeing depends on expectations and meaning as much as on conditions.' },
    ],
    lessons: [
      'Ask what shared story makes a large-scale institution possible — and what happens when belief in it weakens.',
      'Judge a technology by whose life it changes and how, not by whether it is impressive.',
      'Treat "natural" claims about social arrangements sceptically; most of what feels inevitable is historically recent.',
      'Distinguish capability from contentment when evaluating progress.',
      'Understand ideas as forces: beliefs move armies and markets even when the beliefs are not empirically true.',
    ],
    context:
      'Harari is an Israeli historian whose academic work focused on medieval and military history. "Sapiens", originally published in Hebrew in 2011 and in English in 2014, is a work of popular "big history" that compresses 70,000 years into a single argument. Its popularity made it a reference point in public debate about technology, work and meaning.',
    applications:
      'Useful for readers approaching geopolitics, economics or sociology for the first time, because it supplies a single framework — shared belief enabling cooperation — that recurs across those fields. It is also a good prompt for critical thinking practice: several of Harari\'s claims are interpretive rather than established consensus, which makes the book an excellent object for the evaluate-the-argument method.',
    review:
      'As synthesis and provocation, the book is outstanding: it is readable, ambitious and it repeatedly reframes familiar facts. As scholarship it is contested. Specialists have criticised specific claims as overstated or unsupported, and the broad-brush method inevitably flattens nuance. Read it as a hypothesis-generating work — a set of large claims worth testing — rather than as a settled account.',
    recommendation:
      'Follow with Jared Diamond\'s "Guns, Germs, and Steel" for a geographic argument about divergence, and with a specialist history of any period Harari compresses, to feel the difference between synthesis and evidence.',
    tags: ['history', 'anthropology', 'big ideas'],
  },
  {
    title: "Man's Search for Meaning",
    slug: 'mans-search-for-meaning',
    author: 'Viktor E. Frankl',
    year: 1946,
    pages: 165,
    rating: 4.7,
    category: 'books-summary',
    featured: true,
    description:
      'A psychiatrist\'s account of surviving the concentration camps, and the theory of meaning he developed from it — that the last human freedom is the choice of one\'s attitude.',
    summary:
      'The book has two parts. The first is Frankl\'s memoir of imprisonment in Nazi concentration camps, observed with a psychiatrist\'s detachment. The second introduces logotherapy: the claim that the primary human drive is not pleasure or power but the will to meaning, and that meaning can be found in work, in love, and in the attitude one takes toward unavoidable suffering.',
    keyIdeas: [
      { title: 'The last of the human freedoms', detail: 'Everything can be taken from a person but one thing: the choice of attitude in any given set of circumstances. Frankl observed this freedom exercised, and abandoned, in the camps.' },
      { title: 'The will to meaning', detail: 'Frankl contrasts his position with Freud\'s will to pleasure and Adler\'s will to power. Despair, he argues, is often meaninglessness rather than illness.' },
      { title: 'Three sources of meaning', detail: 'Creating a work or doing a deed; experiencing something or encountering someone — love; and the attitude taken toward suffering that cannot be avoided.' },
      { title: 'Suffering is not necessary for meaning', detail: 'Frankl is explicit: if suffering is avoidable, the meaningful thing is to remove it. Meaning is found in spite of suffering, not because of it.' },
      { title: 'Responsibility as the shape of freedom', detail: 'Freedom without responsibility becomes arbitrariness. Meaning is always concrete and personal — a task awaiting this particular person.' },
    ],
    lessons: [
      'Between stimulus and response there is a space; the habit worth training is noticing it.',
      'Ask what life is asking of you right now, not only what you want from life.',
      'Purpose attaches to specific people and tasks, not to abstractions.',
      'In unavoidable hardship, the controllable variable is your stance — and it is genuinely controllable.',
      'Hope is directional: people survived by holding a future task in mind.',
    ],
    context:
      'Viktor Frankl (1905–1997) was an Austrian neurologist and psychiatrist who was imprisoned in Theresienstadt, Auschwitz and other camps between 1942 and 1945, losing his wife, parents and brother. He wrote the memoir within months of liberation; it was published in German in 1946. Logotherapy became the "Third Viennese School" of psychotherapy.',
    applications:
      'Widely used in counselling, palliative care, addiction recovery and leadership education. For students and professionals facing pressure, the practical value is a reframe: meaning is found in concrete responsibilities rather than in mood, and endurance improves when attached to a future task. For anyone working with suffering — medicine, social work, teaching — it is a reminder that dignity and agency persist in conditions that appear to remove both.',
    review:
      'The memoir is unsentimental and unsparing, and it earns its conclusions rather than asserting them; the theory section is more compressed and can read as programmatic. Critics note that logotherapy is harder to test empirically than cognitive-behavioural approaches, and that the famous "space between stimulus and response" formulation, while true to Frankl\'s thought, is a paraphrase rather than a quotation. None of this diminishes the book\'s central achievement: an account of human freedom written from the place designed to destroy it.',
    recommendation:
      'Read alongside Edith Eger\'s "The Choice", a contemporary survivor\'s account that extends similar themes, and Viktor Frankl\'s "The Doctor and the Soul" for the fuller statement of logotherapy.',
    tags: ['psychology', 'meaning', 'humanity', 'memoir'],
  },
  {
    title: 'The Structure of Scientific Revolutions',
    slug: 'the-structure-of-scientific-revolutions',
    author: 'Thomas S. Kuhn',
    year: 1962,
    pages: 264,
    rating: 4.2,
    category: 'books-summary',
    description:
      'The book that made "paradigm shift" part of ordinary language — and argued that science advances by revolution as much as by accumulation.',
    summary:
      'Kuhn challenged the picture of science as a steady accumulation of facts. He described long periods of "normal science", in which a community works within a shared paradigm solving puzzles it defines, interrupted by revolutions in which anomalies accumulate, confidence breaks, and a new framework replaces the old — changing not only theories but what counts as a problem and an observation.',
    keyIdeas: [
      { title: 'Paradigms', detail: 'A paradigm bundles theories, methods, standards and exemplar problems. It determines what a discipline notices and what it treats as settled.' },
      { title: 'Normal science as puzzle-solving', detail: 'Scientists spend most of their time refining a paradigm, not testing it. Failure on a puzzle is treated as the researcher\'s failure, not the framework\'s.' },
      { title: 'Anomaly and crisis', detail: 'Persistent anomalies that resist solution and touch central commitments produce crisis, opening the field to alternatives.' },
      { title: 'Revolution and incommensurability', detail: 'When paradigms change, terms and standards shift with them, so old and new frameworks cannot be compared point by point. Conversion is partly persuasion, not only proof.' },
      { title: 'Progress without a fixed endpoint', detail: 'Kuhn rejected the idea of science converging on a final true description; it evolves, solving the problems its current paradigm defines.' },
    ],
    lessons: [
      'Ask which questions a field treats as settled — that reveals its paradigm more clearly than its theories do.',
      'Notice when anomalies are explained away repeatedly; accumulation matters more than any single case.',
      'Expect experts inside a paradigm to resist alternatives for reasons that are rational from within it.',
      'Use the book on yourself: identify the framework through which you evaluate evidence in your own field.',
      'Use "paradigm shift" precisely or not at all — the phrase has been diluted far beyond Kuhn\'s meaning.',
    ],
    context:
      'Thomas Kuhn (1922–1996) trained as a physicist and turned to the history and philosophy of science after teaching an Aristotle case study that changed how he read historical texts. Published in 1962 as part of the Encyclopedia of Unified Science, the book became one of the most cited academic works of the twentieth century and reshaped science studies.',
    applications:
      'Essential background for understanding debates about replication, disciplinary orthodoxies, and how new fields (from plate tectonics to behavioural economics) won acceptance. Practically, it trains a useful scepticism: not toward science, but toward the assumption that today\'s consensus is simply accumulated fact rather than a framework that could itself be revised.',
    review:
      'Kuhn\'s account is historically rich and philosophically provocative, but contested. Critics — notably Imre Lakatos and Karl Popper\'s followers — argued that it risks making theory choice irrational or sociological, and that "paradigm" is used loosely enough to mean several different things. Kuhn revised and clarified his position in later work. Read with those objections in mind, it remains the most influential single argument about how science actually changes.',
    recommendation:
      'Follow with Imre Lakatos\'s "The Methodology of Scientific Research Programmes" for the strongest structured response, and with Steven Shapin\'s "The Scientific Revolution" for the historian\'s corrective to the idea that there was one.',
    tags: ['philosophy', 'science', 'history of ideas'],
  },
];
