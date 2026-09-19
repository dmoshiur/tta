/**
 * Starter library: courses, lessons and question banks.
 *
 * These are real database rows written on first boot (when the tables are
 * empty) so a fresh installation is immediately usable and reviewable.
 * Everything here can be edited or deleted from the admin panel afterwards.
 * Disable with SEED_DEMO_CONTENT=false.
 */

export interface SeedLesson {
  title: string;
  summary: string;
  minutes: number;
  content: string;
}

export interface SeedModule {
  title: string;
  summary: string;
  lessons: SeedLesson[];
}

export interface SeedCourse {
  title: string;
  slug: string;
  section: string;
  category: string;
  instructor: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  summary: string;
  description: string;
  tags: string[];
  featured?: boolean;
  modules: SeedModule[];
}

export interface SeedQuestion {
  prompt: string;
  options: string[];
  correct: number | number[];
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  marks?: number;
  category?: string;
  source?: string;
}

export interface SeedQuiz {
  title: string;
  slug: string;
  kind: 'QUIZ' | 'MCQ' | 'MODEL_TEST';
  description: string;
  minutes: number;
  negative?: number;
  category?: string;
  course?: string;
  featured?: boolean;
  questions: SeedQuestion[];
}

export const SEED_COURSES: SeedCourse[] = [
  {
    title: 'Critical Thinking Foundations',
    slug: 'critical-thinking-foundations',
    section: 'ACADEMIC',
    category: 'academic-concept-explanation',
    instructor: 'ThinkTank Faculty',
    difficulty: 'BEGINNER',
    featured: true,
    summary: 'Learn to separate good arguments from persuasive-sounding ones — a skill that improves every other subject you study.',
    description:
      'A structured introduction to reasoning: what an argument is, how evidence supports conclusions, which errors recur in public debate, and how to evaluate a claim you have never seen before.',
    tags: ['reasoning', 'logic', 'study skills'],
    modules: [
      {
        title: 'Building Blocks of Reasoning',
        summary: 'What arguments are made of and how to take them apart.',
        lessons: [
          {
            title: 'Arguments, Premises and Conclusions',
            summary: 'The smallest unit of reasoning.',
            minutes: 12,
            content: `<p>An <strong>argument</strong> is not a quarrel. In reasoning, an argument is a set of statements where some (the <em>premises</em>) are offered as reasons to accept another (the <em>conclusion</em>).</p>
<p>Before you can criticise a claim, locate its structure. Ask two questions: <em>what is this person trying to persuade me of?</em> and <em>what reasons are offered for it?</em> Indicator words help — "because", "since" and "given that" usually introduce premises; "therefore", "so" and "it follows that" introduce conclusions.</p>
<ul><li>Unstated premises are common. A claim like "she is a doctor, so she will be right about the policy" hides the assumption that medical training transfers to policy judgement.</li>
<li>Restate the argument in your own words. If you cannot, you have not understood it yet.</li></ul>`,
          },
          {
            title: 'Deduction and Induction',
            summary: 'Two very different kinds of support.',
            minutes: 14,
            content: `<p>A <strong>deductive</strong> argument claims that if the premises are true, the conclusion <em>must</em> be true: "All rectangles have four sides; this shape is a rectangle; therefore it has four sides." Deduction is about validity — the structure — and separately about soundness, which also requires true premises.</p>
<p>An <strong>inductive</strong> argument claims the conclusion is <em>probable</em>: "The sun has risen every recorded day, so it will rise tomorrow." Inductive arguments are never certain; they are stronger or weaker depending on the quantity and quality of the evidence.</p>
<p>Most real-world disputes are inductive. That means the productive question is rarely "is this proven?" and more often "how strong is the evidence, and what would change the conclusion?"</p>`,
          },
        ],
      },
      {
        title: 'Errors in Thinking',
        summary: 'The recurring patterns that make bad arguments feel good.',
        lessons: [
          {
            title: 'Recognising Common Fallacies',
            summary: 'Six patterns you will meet weekly.',
            minutes: 16,
            content: `<p>Fallacies are reasoning errors that can still be rhetorically effective. Knowing the names is less useful than spotting the move being made.</p>
<ul>
<li><strong>Ad hominem</strong> — attacking the person instead of the argument.</li>
<li><strong>Straw man</strong> — replacing an opponent's position with a weaker version, then refuting that.</li>
<li><strong>False dilemma</strong> — presenting two options when more exist.</li>
<li><strong>Appeal to authority</strong> — treating a credential as evidence, especially outside its field.</li>
<li><strong>Post hoc</strong> — assuming that because B followed A, A caused B.</li>
<li><strong>Begging the question</strong> — restating the conclusion as a premise.</li>
</ul>
<p>One caution: naming a fallacy does not automatically refute a conclusion. A person who commits an ad hominem may still be right. Fallacy labels describe the argument, not the truth of the claim.</p>`,
          },
          {
            title: 'Cognitive Biases and How to Counter Them',
            summary: 'Your brain is optimised for speed, not accuracy.',
            minutes: 15,
            content: `<p>Biases are systematic tendencies, not personal failings. Four matter most for learners:</p>
<ul>
<li><strong>Confirmation bias</strong> — seeking and remembering evidence that supports what you already believe.</li>
<li><strong>Anchoring</strong> — over-weighting the first number or claim you encounter.</li>
<li><strong>Availability</strong> — judging frequency by how easily examples come to mind, which is shaped by news coverage.</li>
<li><strong>Dunning–Kruger effect</strong> — low skill reduces the ability to notice low skill.</li>
</ul>
<p>Counter-measures are procedural rather than motivational: write the claim down before researching it; search for the strongest opposing argument, not the weakest; ask what evidence would change your mind; and separate "I want this to be true" from "this is likely to be true".</p>`,
          },
        ],
      },
      {
        title: 'Thinking in Practice',
        summary: 'A repeatable method for evaluating unfamiliar claims.',
        lessons: [
          {
            title: 'A Method for Evaluating Claims',
            summary: 'Five steps you can apply to any article.',
            minutes: 13,
            content: `<p>When you meet a claim you cannot yet judge — a health headline, a policy promise, a historical assertion — work through five steps.</p>
<ol>
<li><strong>Clarify.</strong> Restate the claim precisely. Vague claims are unfalsifiable and therefore useless.</li>
<li><strong>Source.</strong> Who is asserting it, what are they competent in, and what do they gain if you believe it?</li>
<li><strong>Evidence.</strong> What kind of evidence is offered — observation, experiment, statistics, testimony? How was it gathered?</li>
<li><strong>Alternatives.</strong> What else could explain the same data? Correlation with a plausible third variable is common.</li>
<li><strong>Proportion.</strong> Match your confidence to the strength of the evidence. "Uncertain, leaning sceptical" is a legitimate position.</li>
</ol>
<p>This takes minutes, and it converts passive reading into active understanding — which is precisely the habit that compounds across every subject.</p>`,
          },
        ],
      },
    ],
  },
  {
    title: 'Job Exam Masterclass: General Knowledge',
    slug: 'job-exam-masterclass-general-knowledge',
    section: 'JOB_PREP',
    category: 'job-general-knowledge',
    instructor: 'ThinkTank Faculty',
    difficulty: 'INTERMEDIATE',
    featured: true,
    summary: 'A systematic approach to the general knowledge and current affairs sections of competitive recruitment exams.',
    description:
      'General knowledge is not memorised at random — it is organised. This course builds a mental map of geography, institutions, economy and recent affairs, then trains the recall habits that survive exam pressure.',
    tags: ['job prep', 'general knowledge', 'current affairs'],
    modules: [
      {
        title: 'How General Knowledge Is Tested',
        summary: 'Understanding the format before the content.',
        lessons: [
          {
            title: 'The Anatomy of a GK Question',
            summary: 'What examiners actually test.',
            minutes: 12,
            content: `<p>General knowledge items in recruitment exams cluster into predictable types: identification (capital, currency, organisation headquarters), chronology (which event came first), attribution (who wrote, who founded, who won), and superlatives (largest, longest, first).</p>
<p>Study to the type, not to the textbook page. Build five lists and revise them weekly: <em>countries and capitals</em>, <em>international organisations and their roles</em>, <em>currencies</em>, <em>historical turning points with dates</em>, and <em>awards and their fields</em>.</p>
<p>Two exam-day techniques matter. First, elimination: you often know two options are wrong, which turns a guess into a 50% decision — worth attempting unless negative marking is severe. Second, flag-and-return: never let one unknown item consume the time allocated to five known ones.</p>`,
          },
          {
            title: 'Building a Current Affairs Routine',
            summary: 'Twenty focused minutes a day beats Sunday panic.',
            minutes: 11,
            content: `<p>Current affairs is a habit, not a topic. A workable daily routine takes about twenty minutes:</p>
<ol>
<li>Read one reputable national daily and one international source. Compare how each frames the same event — that comparison is itself exam-relevant knowledge.</li>
<li>Write three lines: what happened, who is involved, why it matters.</li>
<li>Once a week, convert your notes into ten MCQs and attempt them.</li>
</ol>
<p>Prioritise durable facts over speculation: agreements signed, institutions created, appointments made, indices published, summits hosted. Distinguish clearly between <em>facts</em> (what occurred), <em>analysis</em> (why it matters) and <em>opinion</em> (what a commentator thinks should happen). Exams test the first; good citizens need all three.</p>`,
          },
        ],
      },
      {
        title: 'Core Domains',
        summary: 'The content that appears most often, organised for recall.',
        lessons: [
          {
            title: 'Nations, Capitals and International Organizations',
            summary: 'A map and an institutional directory.',
            minutes: 15,
            content: `<p>Learn geography in clusters rather than alphabetically: regions, then the countries within them, then capitals and currencies. Anchoring a country to its neighbours makes recall associative instead of brute-force.</p>
<p>For international organisations, remember four attributes each: <em>when founded</em>, <em>headquarters</em>, <em>core mandate</em>, and <em>who belongs</em>. The set that appears most often: the United Nations (1945, New York, international peace and cooperation, 193 member states), the IMF and World Bank (both established after the 1944 Bretton Woods conference, headquartered in Washington, D.C.), the WTO (1995, Geneva, trade rules), SAARC (Kathmandu), ASEAN (Jakarta) and the OIC (Jeddah).</p>
<p>Know the difference between the UN General Assembly — one state, one vote, resolutions generally non-binding — and the Security Council, which can authorise binding measures and has five permanent members with veto power.</p>`,
          },
          {
            title: 'Economy and Development Basics',
            summary: 'The vocabulary behind economic news.',
            minutes: 14,
            content: `<p>A small vocabulary unlocks most economic questions: <strong>GDP</strong> (total value of goods and services produced in a period), <strong>inflation</strong> (sustained rise in the general price level), <strong>fiscal policy</strong> (government taxation and spending), <strong>monetary policy</strong> (central bank control of money supply and interest rates), <strong>balance of payments</strong> (a country's transactions with the rest of the world), and <strong>remittance</strong> (money sent home by workers abroad).</p>
<p>Understand the direction of relationships rather than memorising numbers: higher interest rates generally cool inflation and slow borrowing; currency depreciation makes exports cheaper and imports dearer; a fiscal deficit means spending exceeds revenue.</p>
<p>Finally, know the human development measures — the HDI combines life expectancy, education and per-capita income — and be able to explain why income alone is an incomplete picture of wellbeing.</p>`,
          },
        ],
      },
    ],
  },
  {
    title: 'English for Competitive Exams',
    slug: 'english-for-competitive-exams',
    section: 'JOB_PREP',
    category: 'job-english',
    instructor: 'ThinkTank Faculty',
    difficulty: 'BEGINNER',
    summary: 'Grammar, vocabulary and comprehension trained the way exams test them — with patterns, not rules recited in isolation.',
    description:
      'Exam English rewards pattern recognition. This course covers the sentence structures that generate most error items, a practical vocabulary method, and a timed approach to reading comprehension.',
    tags: ['english', 'grammar', 'vocabulary'],
    modules: [
      {
        title: 'Grammar Under Exam Conditions',
        summary: 'The structures that produce most questions.',
        lessons: [
          {
            title: 'Parts of Speech and Sentence Structure',
            summary: 'A working map of the English sentence.',
            minutes: 13,
            content: `<p>Every English sentence needs a subject and a finite verb. Most error items are variations on three problems: a missing or extra verb, a subject–verb agreement failure, or two independent clauses joined only by a comma (a comma splice).</p>
<p>Agreement traps worth memorising: <em>each, every, either, neither, everyone</em> take singular verbs; <em>the number of</em> is singular while <em>a number of</em> is plural; with <em>neither…nor</em> the verb agrees with the nearer subject. Collective nouns (committee, team, jury) take a singular verb when acting as one body.</p>
<p>Tense consistency matters more than tense sophistication. Choose a time frame and keep it: past events in past tense, general truths in present. In reported speech, shift back one tense and adjust time words ("today" becomes "that day").</p>`,
          },
          {
            title: 'Common Error Patterns',
            summary: 'Prepositions, articles and parallel structure.',
            minutes: 12,
            content: `<p><strong>Prepositions are idiomatic</strong>, so learn them with their verb or adjective: depend <em>on</em>, insist <em>on</em>, good <em>at</em>, different <em>from</em>, married <em>to</em>, prefer X <em>to</em> Y.</p>
<p><strong>Articles</strong> follow countability and specificity: "a" for a non-specific singular countable noun, "the" for something already identified, and no article for plural or uncountable nouns used generally ("Water is essential"; "The water in this glass is cold").</p>
<p><strong>Parallel structure</strong> is the highest-yield error type: items in a list or comparison must share a grammatical form. "She enjoys reading, swimming and to hike" is wrong; "reading, swimming and hiking" is right. After <em>not only … but also</em>, keep both halves the same part of speech.</p>`,
          },
        ],
      },
      {
        title: 'Vocabulary and Comprehension',
        summary: 'Words that stay, and passages you finish in time.',
        lessons: [
          {
            title: 'Building Vocabulary That Sticks',
            summary: 'Context, roots and spaced review.',
            minutes: 12,
            content: `<p>Word lists are forgotten because they are learned without context. A more durable method: meet a word in a sentence, write your own sentence using it, and review it on a schedule (one day, three days, one week, one month).</p>
<p>Learn roots and affixes as multipliers. <em>Bene-</em> (good) gives benevolent, benefit, benediction; <em>mal-</em> (bad) gives malevolent, malfunction, malice; <em>-logy</em> (study of), <em>anti-</em> (against), <em>post-</em> (after). One root explains a dozen items.</p>
<p>Study synonyms in pairs with a difference: <em>frank</em> (honest and direct) versus <em>blunt</em> (direct to the point of rudeness); <em>thrifty</em> (careful with money, approving) versus <em>stingy</em> (unwilling to spend, disapproving). Register — formal or informal, approving or critical — is exactly what exam options test.</p>`,
          },
          {
            title: 'Reading Comprehension Strategy',
            summary: 'Read the questions first, then hunt.',
            minutes: 14,
            content: `<p>Comprehension passages are timed, so strategy beats thoroughness. Skim the first and last sentence of each paragraph to build a map — roughly ninety seconds — then read the questions before returning to the text for detail.</p>
<p>Classify each question: <em>detail</em> (the answer is stated), <em>inference</em> (the answer is supported but not stated), <em>main idea</em> (the answer covers the whole passage), or <em>vocabulary in context</em> (substitute the option into the sentence).</p>
<p>Two elimination rules save most mistakes. Reject any option containing absolute language ("always", "never", "all") unless the passage says so. Reject any option that is true in the real world but absent from the passage — you are being tested on the text, not on your knowledge.</p>`,
          },
        ],
      },
    ],
  },
  {
    title: 'Foundations of Geopolitics',
    slug: 'foundations-of-geopolitics',
    section: 'WORLD',
    category: 'world-geopolitics',
    instructor: 'ThinkTank Faculty',
    difficulty: 'INTERMEDIATE',
    featured: true,
    summary: 'Read world events structurally — geography, interests, institutions and power — instead of emotionally.',
    description:
      'Geopolitics asks how geography, resources, technology and institutions shape what states want and what they can do. This course builds that vocabulary and applies it to real, durable questions.',
    tags: ['geopolitics', 'world affairs', 'international relations'],
    modules: [
      {
        title: 'The Vocabulary of Power',
        summary: 'Terms used precisely, not as slogans.',
        lessons: [
          {
            title: 'What Geopolitics Actually Studies',
            summary: 'Interests, capabilities and constraints.',
            minutes: 14,
            content: `<p>Geopolitics studies how the physical and human geography of a place shapes the choices available to the powers that control it. Three variables explain most behaviour: <strong>interests</strong> (what an actor wants — security, prosperity, prestige), <strong>capabilities</strong> (what it can actually do — economy, military, technology, alliances) and <strong>constraints</strong> (geography, neighbours, domestic politics, international law).</p>
<p>Two concepts do a lot of work. <em>Hard power</em> coerces through military and economic means; <em>soft power</em>, a term developed by Joseph Nye, attracts and co-opts through culture, values and legitimate policy. Most states use both, and credibility depends on the gap between declared interests and observed behaviour.</p>
<p>Discipline yourself to separate the layers when reading any story: the <strong>fact</strong> (what happened), the <strong>analysis</strong> (why it happened and what it implies), and the <strong>opinion</strong> (what the commentator wants done). Conflating them is how readers get manipulated.</p>`,
          },
          {
            title: 'Geography, Resources and Chokepoints',
            summary: 'Why narrow waterways move markets.',
            minutes: 13,
            content: `<p>A <strong>chokepoint</strong> is a narrow passage through which a large share of trade must move: the Strait of Hormuz for Gulf oil, the Suez Canal for Europe–Asia shipping, the Strait of Malacca for East Asian energy imports, the Panama Canal for Atlantic–Pacific transit, and the Bab el-Mandeb for Red Sea traffic.</p>
<p>Chokepoints matter because alternatives are expensive or absent. A blockage raises insurance premiums, lengthens voyages and shifts prices within days — even when no commodity is destroyed. This is why navies patrol waterways and why states invest in pipelines, railways and port access as strategic hedging.</p>
<p>Resources shape politics too, but not deterministically. The "resource curse" observation — that some resource-rich states grow more slowly and govern less accountably — describes a tendency with well-known exceptions, not a law. Institutions and choices mediate geography.</p>`,
          },
        ],
      },
      {
        title: 'Actors and Systems',
        summary: 'States, alliances and the rules they operate within.',
        lessons: [
          {
            title: 'States, Alliances and International Organizations',
            summary: 'Who acts, and with what authority.',
            minutes: 15,
            content: `<p>The state remains the primary actor in international law, but it is not the only one. Alliances such as NATO pool security commitments; international organisations such as the United Nations, IMF, World Bank and WTO create standing forums and rules; regional bodies such as the EU, ASEAN, SAARC and the African Union coordinate policy among neighbours; and non-state actors — multinational firms, armed groups, NGOs, diasporas — exert real influence.</p>
<p>Authority varies sharply. The UN Security Council can adopt binding resolutions and authorise sanctions; the General Assembly deliberates and recommends. The WTO settles trade disputes with authorised remedies. The IMF lends under conditionality. Human rights bodies monitor and report, relying largely on reputational pressure.</p>
<p>When you read that an organisation "condemned" or "called upon" a state, check whether the instrument was binding or advisory. That single distinction explains most of what happens next.</p>`,
          },
          {
            title: 'Reading a Geopolitical Event Without Panicking',
            summary: 'A checklist for fast, calm analysis.',
            minutes: 12,
            content: `<p>Breaking international news rewards a short checklist rather than a strong first reaction.</p>
<ol>
<li><strong>What is confirmed?</strong> Separate verified events from official statements and anonymous claims.</li>
<li><strong>Who are the actors?</strong> States, organisations, firms, groups — and what does each want?</li>
<li><strong>What changed?</strong> Compare against the situation a month ago. Most events are continuations.</li>
<li><strong>Whose framing is this?</strong> Every source has a vantage point; two sources from opposite sides tell you more than five from the same side.</li>
<li><strong>What are the plausible implications?</strong> List two or three, with the evidence that would confirm each.</li>
</ol>
<p>Finally, watch your own reaction. Outrage is a poor instrument of analysis, and the ability to hold uncertainty without inventing certainty is what separates an informed reader from a loud one.</p>`,
          },
        ],
      },
    ],
  },
  {
    title: 'Everyday Economics',
    slug: 'everyday-economics',
    section: 'KNOWLEDGE',
    category: 'knowledge-economics',
    instructor: 'ThinkTank Faculty',
    difficulty: 'BEGINNER',
    summary: 'The handful of ideas that explain prices, wages, inflation and the trade-offs behind every policy promise.',
    description:
      'Economics is the study of choices under scarcity. This course covers the core model of supply and demand, the meaning of inflation, incentives, markets and government — with the trade-offs made explicit.',
    tags: ['economics', 'money', 'policy'],
    modules: [
      {
        title: 'Thinking Like an Economist',
        summary: 'Scarcity, choice and prices.',
        lessons: [
          {
            title: 'Scarcity, Choice and Opportunity Cost',
            summary: 'Every choice has a price you do not pay in money.',
            minutes: 12,
            content: `<p>Scarcity means wants exceed available resources — time, money, land, labour, attention. Because of scarcity, every choice has an <strong>opportunity cost</strong>: the value of the best alternative you gave up.</p>
<p>Two years of full-time study cost tuition fees <em>plus</em> the earnings you did not receive. A free service costs your attention and data. A government programme costs what the same revenue would have done elsewhere. Economists call this "there is no such thing as a free lunch" — not cynicism, but a reminder to count hidden costs.</p>
<p>Related habit: think at the <strong>margin</strong>. Decisions are rarely all-or-nothing; they are "one more hour", "one more unit", "one more taka of spending". Comparing marginal benefit with marginal cost explains behaviour that totals cannot.</p>`,
          },
          {
            title: 'Supply, Demand and Prices',
            summary: 'The model behind almost every market story.',
            minutes: 14,
            content: `<p><strong>Demand</strong> is how much buyers want at each price; it slopes downward. <strong>Supply</strong> is how much sellers offer at each price; it slopes upward. The price that clears the market is where they meet.</p>
<p>Use the model as a diagnostic. A shortage means the current price is below the clearing price — often because of a price ceiling, a supply disruption or a sudden demand surge. A surplus means price is above clearing — perhaps because of a floor, weak demand or overproduction.</p>
<p>Shifts matter more than movements: rising incomes, changing tastes, new technology, input costs, taxes and expectations all shift the curves. A price rise caused by a supply shock has different implications from the same rise caused by a demand boom — and different remedies.</p>`,
          },
        ],
      },
      {
        title: 'The Economy Around You',
        summary: 'Inflation, incentives and the role of government.',
        lessons: [
          {
            title: 'Inflation: What It Is and What It Is Not',
            summary: 'A rise in the general price level, not one expensive item.',
            minutes: 13,
            content: `<p>Inflation is a sustained increase in the <em>general</em> price level, measured with a basket of goods and services. One commodity becoming dearer is a relative price change, which is exactly how markets signal scarcity.</p>
<p>Common drivers: demand pulling faster than supply can respond; costs rising (energy, imported inputs, wages); money growing faster than output; and expectations becoming self-fulfilling, where firms and workers raise prices and wages in anticipation.</p>
<p>The costs are uneven. Inflation erodes the value of savings and fixed incomes, while borrowers repay in cheaper money. Moderate, predictable inflation is generally considered manageable; high or volatile inflation disrupts planning and hurts those least able to protect themselves. Central banks typically respond by raising interest rates, which slows borrowing — a real trade-off between price stability and short-term growth.</p>`,
          },
          {
            title: 'Markets, Governments and Trade-offs',
            summary: 'When each works better, and why neither is perfect.',
            minutes: 14,
            content: `<p>Markets coordinate millions of decisions through prices and usually allocate resources efficiently. They fail in recognisable ways: <strong>externalities</strong> (costs imposed on others, like pollution), <strong>public goods</strong> (non-excludable and non-rival, like street lighting), <strong>market power</strong> (a dominant firm setting prices), and <strong>information asymmetry</strong> (one side knowing more, as in used-car sales or insurance).</p>
<p>Governments correct these failures with regulation, taxation, provision and competition policy. Governments also fail: capture by the regulated industry, weak administrative capacity, short-term political incentives, and unintended consequences.</p>
<p>The mature position is not "markets versus government" but "which instrument, for which failure, with what capacity, at what cost?" Every policy question is a comparison between imperfect alternatives — and stating the trade-off honestly is what makes economic discussion useful rather than tribal.</p>`,
          },
        ],
      },
    ],
  },
  {
    title: 'Mathematics for Recruitment Tests',
    slug: 'mathematics-for-recruitment-tests',
    section: 'JOB_PREP',
    category: 'job-mathematics',
    instructor: 'ThinkTank Faculty',
    difficulty: 'INTERMEDIATE',
    summary: 'The quantitative topics that dominate recruitment tests, taught as methods you can apply under time pressure.',
    description:
      'Percentages, ratios, profit and loss, interest, averages, time–speed–distance and work problems — with the shortcuts examiners expect and the traps they set.',
    tags: ['mathematics', 'quantitative', 'job prep'],
    modules: [
      {
        title: 'Numerical Fluency',
        summary: 'The arithmetic that everything else is built on.',
        lessons: [
          {
            title: 'Percentages, Ratios and Proportions',
            summary: 'Fast conversions and clean setups.',
            minutes: 14,
            content: `<p>Memorise the common fraction–percentage pairs; they convert mental arithmetic into lookup: 1/2 = 50%, 1/3 ≈ 33.3%, 1/4 = 25%, 1/5 = 20%, 1/6 ≈ 16.67%, 1/8 = 12.5%, 1/10 = 10%.</p>
<p>Successive changes multiply, they do not add. A 20% increase followed by a 20% decrease gives 1.2 × 0.8 = 0.96, a net 4% <em>decrease</em>. Examiners test exactly this.</p>
<p>For ratios, convert to "parts". If A : B = 3 : 5 and the total is 64, the whole is 8 parts, one part is 8, so A = 24 and B = 40. For proportion problems, write the relationship as an equation before substituting — direct proportion keeps the ratio constant (y = kx); inverse proportion keeps the product constant (xy = k).</p>`,
          },
          {
            title: 'Profit, Loss and Simple Interest',
            summary: 'Two formula families worth automatic recall.',
            minutes: 13,
            content: `<p>Profit or loss is always measured on <strong>cost price</strong> unless stated otherwise: profit % = (selling − cost) ÷ cost × 100. Bought at 400 and sold at 500 is a 25% profit, not 20%. If a discount is given on the marked price, work backwards: selling = marked × (1 − discount).</p>
<p>Simple interest: I = P × r × t, where r is the annual rate as a decimal and t is years. 5,000 at 8% for 3 years earns 1,200. Compound interest instead grows the principal each period: A = P(1 + r)ⁿ, so the same figures give 5,000 × 1.08³ ≈ 6,298.56 — the difference from simple interest is the interest earned on interest.</p>
<p>Watch the units: a monthly rate must be paired with months, and "per annum compounded half-yearly" means r/2 applied 2t times.</p>`,
          },
        ],
      },
      {
        title: 'Reasoning With Numbers',
        summary: 'Averages, data and rate problems.',
        lessons: [
          {
            title: 'Averages and Data Interpretation',
            summary: 'The mean hides what the median reveals.',
            minutes: 12,
            content: `<p>Mean = sum ÷ count, so the sum is mean × count — the single most useful rearrangement in exam arithmetic. If five values average 20, the sum is 100; remove a value of 30 and the remaining four average 70 ÷ 4 = 17.5.</p>
<p>Averages respond differently to outliers. In a group where one member earns far more than the rest, the mean rises while the median stays put. Examiners test whether you notice which measure a claim relies on.</p>
<p>For weighted averages, multiply each group's mean by its size before adding: 30 students averaging 60 and 20 averaging 80 gives (1800 + 1600) ÷ 50 = 68 — not 70. In data interpretation, read the axes and units first, then answer only what is asked; most wrong answers come from misreading a scale, not from arithmetic.</p>`,
          },
          {
            title: 'Time, Speed, Distance and Work',
            summary: 'One relationship, two disguises.',
            minutes: 13,
            content: `<p>Distance = speed × time. Convert units deliberately: km/h to m/s, multiply by 5/18; m/s to km/h, multiply by 18/5. A train at 60 km/h for 45 minutes covers 60 × 0.75 = 45 km. Average speed over equal <em>distances</em> is the harmonic mean, not the arithmetic mean: 40 km/h out and 60 km/h back averages 48 km/h, not 50.</p>
<p>Work problems use the same structure with rate = 1 ÷ days. If A finishes a job in 12 days and B in 6, their combined daily rate is 1/12 + 1/6 = 1/4, so together they finish in 4 days. For pipes and tanks, filling rates are positive and emptying rates negative.</p>
<p>Always ask what one unit of time produces. Setting up "per day" or "per hour" rates first prevents most algebra mistakes.</p>`,
          },
        ],
      },
    ],
  },
  {
    title: 'Empathy and Human Dignity',
    slug: 'empathy-and-human-dignity',
    section: 'HUMANITY',
    category: 'humanity-empathy',
    instructor: 'ThinkTank Faculty',
    difficulty: 'BEGINNER',
    summary: 'Why dignity is the foundation of a decent society — and how empathy is practised rather than merely felt.',
    description:
      'A humane platform is not a slogan. This course examines empathy, compassion and dignity as disciplines with methods: attention, listening, perspective-taking and action.',
    tags: ['empathy', 'ethics', 'humanity'],
    modules: [
      {
        title: 'Understanding Others',
        summary: 'From feeling to practice.',
        lessons: [
          {
            title: 'What Empathy Is — and Is Not',
            summary: 'Three kinds, and one common confusion.',
            minutes: 12,
            content: `<p>Researchers distinguish <strong>cognitive empathy</strong> (understanding what another person thinks and why), <strong>emotional empathy</strong> (feeling something of what they feel) and <strong>compassion</strong> (the intention to help). They can come apart: a person may understand another perfectly and remain unmoved, or be overwhelmed by another's distress and become useless — or manipulative.</p>
<p>Empathy is also biased. It flows more easily toward people who resemble us, are physically near, or are presented as a single identifiable individual rather than a statistic. Recognising that bias is the first step toward extending attention deliberately to people we would otherwise overlook.</p>
<p>Finally, empathy is not agreement. You can understand why someone holds a view you reject. Confusing understanding with endorsement makes people afraid of empathy; separating them makes it a tool for judgement rather than a substitute for it.</p>`,
          },
          {
            title: 'Compassion in Practice',
            summary: 'Listening, presence and small reliable actions.',
            minutes: 11,
            content: `<p>Compassion is measurable in behaviour. Three practices do most of the work.</p>
<ul>
<li><strong>Attentive listening.</strong> Put the phone down, let the person finish, and check your understanding before offering advice: "So the hardest part was not the workload but feeling invisible — is that right?"</li>
<li><strong>Presence without fixing.</strong> Much suffering cannot be solved. Being reliably there is not a fallback; it is often the entire help available.</li>
<li><strong>Small, repeated actions.</strong> One person greeted by name, one message answered, one task shared. Trust is built by consistency, not by grand gestures.</li>
</ul>
<p>Compassion also requires boundaries. Sustained exposure to others' suffering without recovery produces burnout, which ends the helping altogether. Rest is part of the practice, not a failure of it.</p>`,
          },
        ],
      },
      {
        title: 'Dignity as a Foundation',
        summary: 'Worth that is not earned and cannot be forfeited.',
        lessons: [
          {
            title: 'Human Dignity Is Not Earned',
            summary: 'The idea that holds rights together.',
            minutes: 13,
            content: `<p>Human dignity is the claim that a person has worth simply by being a person — not because of usefulness, intelligence, productivity, citizenship, belief or behaviour. That is why it can be violated but never lost.</p>
<p>The idea has many sources: religious traditions teaching that each person is sacred; Kantian ethics holding that persons must be treated as ends and never merely as means; and modern human rights law, whose foundational text — the Universal Declaration of Human Rights, adopted in 1948 — opens by recognising "the inherent dignity … of all members of the human family".</p>
<p>Dignity is most easily respected when it is costly: toward people who cannot repay you, who disagree with you, who are inconvenient, or whom others have already written off. That is also where it is most necessary, because institutions treat people the way their least powerful members are treated.</p>`,
          },
          {
            title: 'Kindness as a Civic Habit',
            summary: 'From private virtue to public culture.',
            minutes: 10,
            content: `<p>Kindness scales. Queue discipline, giving up a seat, returning a lost wallet, correcting your own mistake publicly, defending someone who is being humiliated — these are individually small and collectively decisive, because they set the standard others calibrate against.</p>
<p>Two habits make kindness civic rather than occasional. First, <em>assume a reason</em>: the rude stranger may be in pain, exhausted or frightened. Assuming a reason does not excuse harm; it prevents escalation. Second, <em>act within your radius</em>: you cannot solve structural injustice alone, but you can refuse to add to it in the situations you actually control.</p>
<p>A society is not kind because its members feel warm. It is kind because enough people, repeatedly, choose the slightly more inconvenient decent action — and because institutions make that choice easier.</p>`,
          },
        ],
      },
    ],
  },
  {
    title: 'Study Techniques That Actually Work',
    slug: 'study-techniques-that-actually-work',
    section: 'ACADEMIC',
    category: 'academic-study-resources',
    instructor: 'ThinkTank Faculty',
    difficulty: 'BEGINNER',
    summary: 'Evidence-based learning methods — retrieval, spacing, interleaving — and how to build a schedule that survives real life.',
    description:
      'Re-reading and highlighting feel productive and are among the weakest study methods. This course replaces them with techniques supported by decades of learning research.',
    tags: ['study skills', 'memory', 'productivity'],
    modules: [
      {
        title: 'Evidence-Based Learning',
        summary: 'The three techniques with the strongest evidence.',
        lessons: [
          {
            title: 'Retrieval Practice and Spaced Repetition',
            summary: 'Pulling information out beats putting it in.',
            minutes: 13,
            content: `<p><strong>Retrieval practice</strong> means recalling information from memory rather than re-reading it. Closing the book and writing what you remember, answering questions, or explaining a topic aloud produces far stronger retention than another pass through the page — even though it feels harder. That difficulty is the mechanism, not a defect.</p>
<p><strong>Spaced repetition</strong> spreads review across increasing intervals (same day, next day, three days, one week, one month). Forgetting a little before reviewing is what makes the memory durable.</p>
<p>A workable loop: after each lesson, write five questions from memory; answer them the next day without notes; put the ones you missed into a review list; revisit that list weekly. Flashcards work if the card forces recall of a specific fact rather than recognition of a familiar phrase.</p>`,
          },
          {
            title: 'Interleaving and Elaboration',
            summary: 'Mixing topics and asking why.',
            minutes: 12,
            content: `<p><strong>Interleaving</strong> mixes related topics in one session instead of blocking one type of problem at a time. It feels worse and performs better, because it trains you to <em>select</em> the right method — which is what exams and real problems demand.</p>
<p><strong>Elaboration</strong> connects new material to what you already know: "How does this differ from the case I studied last week?", "Why does this hold?", "What is a concrete example from my own life?" Explaining in your own words exposes gaps that recognition hides.</p>
<p>Two techniques to drop: passive re-reading and undifferentiated highlighting. Both produce fluency — the feeling of familiarity — which the brain mistakes for understanding. If a method never makes you struggle slightly, it is probably not teaching you much.</p>`,
          },
        ],
      },
      {
        title: 'Running Your Study System',
        summary: 'Scheduling, notes and staying honest with yourself.',
        lessons: [
          {
            title: 'Designing a Revision Schedule',
            summary: 'Plan backwards from the exam date.',
            minutes: 12,
            content: `<p>Start with the exam date and work backwards. Allocate the last week to mixed practice and past papers, not new material. Divide the remaining weeks by syllabus weight, giving more time to topics that are both important and weak — not to the topics you already enjoy.</p>
<p>Schedule in units you can actually protect: 45–50 minutes of focused work with a 10-minute break is more productive than three undifferentiated hours. Put the session in a calendar with a specific topic and a specific output ("finish 20 percentage problems, mark them, list errors").</p>
<p>Include deliberate slack. A plan with no margin collapses at the first interruption, and a collapsed plan is usually abandoned. Review the schedule weekly and adjust to reality rather than to ambition.</p>`,
          },
          {
            title: 'Notes That Work After the Lecture',
            summary: 'Notes are for retrieval, not transcription.',
            minutes: 11,
            content: `<p>Transcribing a lecture produces a document you will never read. Notes are useful when they force processing: put the idea in your own words, keep one idea per line, and mark what you did not understand with a question mark to resolve later.</p>
<p>A simple structure that survives months: <em>Question</em> (what problem does this solve?), <em>Answer</em> (the concept in one sentence), <em>Example</em> (a concrete case), <em>Connection</em> (how it relates to something else you know). Summary sheets per topic, written from memory before checking the source, double as retrieval practice.</p>
<p>Keep an error log — every mistake, with its cause, in one place. Reviewing your own errors before an exam is among the highest-value uses of the last hour available.</p>`,
          },
        ],
      },
    ],
  },
];

export const SEED_QUIZZES: SeedQuiz[] = [
  {
    title: 'General Knowledge Model Test',
    slug: 'general-knowledge-model-test',
    kind: 'MODEL_TEST',
    category: 'job-model-test',
    minutes: 25,
    negative: 0.5,
    featured: true,
    description:
      'A full-length practice model test covering geography, international organisations, science and history. Timed, with 0.5 negative marking per wrong answer — exactly like a real recruitment examination.',
    questions: [
      { prompt: 'Which is the largest ocean on Earth?', options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'], correct: 2, difficulty: 'EASY', explanation: 'The Pacific Ocean covers roughly a third of the Earth\'s surface — more than all land area combined.', category: 'job-general-knowledge' },
      { prompt: 'Where is the headquarters of the United Nations?', options: ['Geneva', 'New York', 'Paris', 'Vienna'], correct: 1, difficulty: 'EASY', explanation: 'The UN headquarters has been in New York since 1952. Geneva hosts the UN Office at Geneva and many specialised agencies.', category: 'world-international-organizations' },
      { prompt: 'How many member states does the United Nations have?', options: ['175', '185', '193', '201'], correct: 2, difficulty: 'MEDIUM', explanation: 'The UN has 193 member states. The Holy See and the State of Palestine hold permanent observer status.', category: 'world-international-organizations' },
      { prompt: 'Which organisation was created by the Bretton Woods Conference of 1944 alongside the World Bank?', options: ['World Trade Organization', 'International Monetary Fund', 'United Nations Development Programme', 'Bank for International Settlements'], correct: 1, difficulty: 'MEDIUM', explanation: 'The IMF and the World Bank were both established following the 1944 Bretton Woods conference; the IMF began operations in 1945.', category: 'world-global-economy' },
      { prompt: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correct: 2, difficulty: 'EASY', explanation: 'Au comes from the Latin "aurum". Ag is silver ("argentum") and Gd is gadolinium.', category: 'knowledge-science' },
      { prompt: 'Which gas makes up the largest share of the Earth\'s atmosphere?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'], correct: 2, difficulty: 'EASY', explanation: 'Nitrogen accounts for about 78% of the atmosphere; oxygen about 21%.', category: 'knowledge-science' },
      { prompt: 'Which is the largest hot desert in the world?', options: ['Gobi', 'Kalahari', 'Sahara', 'Arabian'], correct: 2, difficulty: 'EASY', explanation: 'The Sahara is the largest hot desert. Antarctica is technically the largest desert overall because it receives very little precipitation.', category: 'job-general-knowledge' },
      { prompt: 'The Universal Declaration of Human Rights was adopted by the UN General Assembly in which year?', options: ['1945', '1948', '1952', '1966'], correct: 1, difficulty: 'MEDIUM', explanation: 'The UDHR was adopted on 10 December 1948 in Paris. The two binding covenants built on it followed in 1966.', category: 'humanity-dignity' },
      { prompt: 'Which of these countries is a permanent member of the UN Security Council?', options: ['India', 'Germany', 'France', 'Brazil'], correct: 2, difficulty: 'MEDIUM', explanation: 'The five permanent members are China, France, Russia, the United Kingdom and the United States, each holding veto power.', category: 'world-international-organizations' },
      { prompt: 'Where is the headquarters of the World Trade Organization?', options: ['Geneva', 'Washington, D.C.', 'Brussels', 'Nairobi'], correct: 0, difficulty: 'MEDIUM', explanation: 'The WTO has been headquartered in Geneva since it began operations in 1995.', category: 'world-global-economy' },
      { prompt: 'Who wrote the play "Romeo and Juliet"?', options: ['Charles Dickens', 'William Shakespeare', 'John Milton', 'George Bernard Shaw'], correct: 1, difficulty: 'EASY', explanation: 'Shakespeare wrote the play in the early 1590s.', category: 'knowledge-culture' },
      { prompt: 'Which is the smallest country in the world by area?', options: ['Monaco', 'San Marino', 'Vatican City', 'Liechtenstein'], correct: 2, difficulty: 'EASY', explanation: 'Vatican City covers roughly 0.49 square kilometres.', category: 'job-general-knowledge' },
    ],
  },
  {
    title: 'Critical Thinking Quiz',
    slug: 'critical-thinking-quiz',
    kind: 'QUIZ',
    category: 'academic-concept-explanation',
    course: 'critical-thinking-foundations',
    minutes: 10,
    featured: true,
    description: 'Six questions on arguments, fallacies and bias — the companion check for Critical Thinking Foundations.',
    questions: [
      { prompt: 'Attacking the person making an argument instead of the argument itself is known as:', options: ['straw man', 'ad hominem', 'false dilemma', 'slippery slope'], correct: 1, difficulty: 'EASY', explanation: 'An ad hominem reply targets the speaker\'s character or circumstances rather than the reasons offered.' },
      { prompt: 'Misrepresenting an opponent\'s position so that it is easier to refute is called:', options: ['begging the question', 'appeal to authority', 'straw man', 'post hoc'], correct: 2, difficulty: 'EASY', explanation: 'A straw man replaces the real argument with a weaker caricature, then defeats the caricature.' },
      { prompt: 'A deductive argument is "valid" when:', options: ['its premises are all true', 'its conclusion is true', 'the conclusion follows necessarily from the premises', 'most people accept it'], correct: 2, difficulty: 'MEDIUM', explanation: 'Validity concerns structure only. A valid argument with true premises is called sound.' },
      { prompt: 'Finding that ice cream sales and drowning deaths both rise in summer shows:', options: ['ice cream causes drowning', 'drowning causes ice cream sales', 'correlation, likely explained by a third variable (heat)', 'no relationship at all'], correct: 2, difficulty: 'MEDIUM', explanation: 'Warm weather increases both swimming and ice cream consumption. Correlation alone does not establish causation.' },
      { prompt: 'Seeking out only evidence that supports what you already believe is:', options: ['anchoring', 'confirmation bias', 'the availability heuristic', 'the framing effect'], correct: 1, difficulty: 'EASY', explanation: 'Confirmation bias shapes what we search for, notice and remember.' },
      { prompt: '"Begging the question" means:', options: ['avoiding the question', 'assuming the conclusion within the premises', 'asking an irrelevant question', 'appealing to emotion'], correct: 1, difficulty: 'HARD', explanation: 'It describes circular reasoning: the premise already presupposes what the conclusion claims.' },
    ],
  },
  {
    title: 'English Grammar Check',
    slug: 'english-grammar-check',
    kind: 'QUIZ',
    category: 'job-english',
    course: 'english-for-competitive-exams',
    minutes: 8,
    description: 'Agreement, prepositions, articles and parallel structure — the recurring exam patterns.',
    questions: [
      { prompt: 'Choose the correct sentence:', options: ['Neither of the answers are correct.', 'Neither of the answers is correct.', 'Neither of the answer are correct.', 'Neither of the answers were correct.'], correct: 1, difficulty: 'MEDIUM', explanation: '"Neither" is singular, so it takes the singular verb "is".' },
      { prompt: 'She has been working here ___ 2015.', options: ['for', 'since', 'from', 'during'], correct: 1, difficulty: 'EASY', explanation: '"Since" introduces a starting point in time; "for" introduces a duration.' },
      { prompt: 'Select the correct passive form: "They built the bridge in 1990."', options: ['The bridge was built in 1990.', 'The bridge is built in 1990.', 'The bridge has built in 1990.', 'The bridge were built in 1990.'], correct: 0, difficulty: 'MEDIUM', explanation: 'Past simple passive: was/were + past participle. "Bridge" is singular, so "was built".' },
      { prompt: 'Which sentence uses parallel structure correctly?', options: ['She enjoys reading, swimming and to hike.', 'She enjoys reading, swimming and hiking.', 'She enjoys to read, swimming and hikes.', 'She enjoys read, swim and hike.'], correct: 1, difficulty: 'MEDIUM', explanation: 'Items in a series must share the same grammatical form — here, three gerunds.' },
      { prompt: 'The antonym of "benevolent" is:', options: ['generous', 'malevolent', 'indifferent', 'polite'], correct: 1, difficulty: 'EASY', explanation: '"Bene-" means good and "-volent" relates to wishing; "malevolent" wishes harm.' },
      { prompt: 'Choose the correct article: "___ water is essential for life."', options: ['A', 'An', 'The', 'No article'], correct: 3, difficulty: 'MEDIUM', explanation: 'Uncountable nouns used in a general sense take no article. "The water in this glass" would be specific.' },
    ],
  },
  {
    title: 'Mathematics for Recruitment Tests Quiz',
    slug: 'mathematics-for-recruitment-tests-quiz',
    kind: 'QUIZ',
    category: 'job-mathematics',
    course: 'mathematics-for-recruitment-tests',
    minutes: 15,
    featured: true,
    description: 'Ten quantitative items with worked explanations, matching the method lessons in the course.',
    questions: [
      { prompt: 'What is 20% of 250?', options: ['40', '45', '50', '55'], correct: 2, difficulty: 'EASY', explanation: '20% = 1/5, and 250 ÷ 5 = 50.' },
      { prompt: 'A price rises 20% and then falls 20%. The net change is:', options: ['no change', 'a 4% decrease', 'a 4% increase', 'a 2% decrease'], correct: 1, difficulty: 'MEDIUM', explanation: 'Successive changes multiply: 1.20 × 0.80 = 0.96, which is a 4% decrease.' },
      { prompt: 'Two numbers are in the ratio 3 : 5 and their sum is 64. The larger number is:', options: ['24', '32', '40', '48'], correct: 2, difficulty: 'MEDIUM', explanation: '8 parts total, so one part = 8; the larger number is 5 × 8 = 40.' },
      { prompt: 'Simple interest on 5,000 at 8% per annum for 3 years is:', options: ['1,000', '1,200', '1,300', '1,440'], correct: 1, difficulty: 'EASY', explanation: 'I = P × r × t = 5,000 × 0.08 × 3 = 1,200.' },
      { prompt: 'An item bought for 400 is sold for 500. The profit percentage is:', options: ['20%', '22.5%', '25%', '30%'], correct: 2, difficulty: 'EASY', explanation: 'Profit % is measured on cost: 100 ÷ 400 × 100 = 25%.' },
      { prompt: 'The average of five numbers is 20. If one of them is 30, the average of the remaining four is:', options: ['15', '16.5', '17.5', '18'], correct: 2, difficulty: 'MEDIUM', explanation: 'Sum = 100. Removing 30 leaves 70, and 70 ÷ 4 = 17.5.' },
      { prompt: 'A train travels at 60 km/h for 45 minutes. The distance covered is:', options: ['30 km', '40 km', '45 km', '50 km'], correct: 2, difficulty: 'EASY', explanation: '45 minutes = 0.75 hours; 60 × 0.75 = 45 km.' },
      { prompt: 'A can finish a job in 12 days and B in 6 days. Working together they finish in:', options: ['3 days', '4 days', '5 days', '9 days'], correct: 1, difficulty: 'MEDIUM', explanation: 'Combined daily rate = 1/12 + 1/6 = 1/4, so the job takes 4 days.' },
      { prompt: 'A car covers a distance at 40 km/h and returns along the same route at 60 km/h. The average speed for the journey is:', options: ['50 km/h', '48 km/h', '52 km/h', '45 km/h'], correct: 1, difficulty: 'HARD', explanation: 'For equal distances the average speed is the harmonic mean: 2 × 40 × 60 ÷ (40 + 60) = 48 km/h.' },
      { prompt: '30 students score an average of 60 and 20 students score an average of 80. The combined average is:', options: ['68', '70', '72', '66'], correct: 0, difficulty: 'MEDIUM', explanation: 'Weighted mean = (30 × 60 + 20 × 80) ÷ 50 = 3,400 ÷ 50 = 68.' },
    ],
  },
  {
    title: 'ICT Basics Quiz',
    slug: 'ict-basics-quiz',
    kind: 'QUIZ',
    category: 'job-ict',
    minutes: 8,
    description: 'Computer fundamentals, networks and data — the standard ICT section of recruitment tests.',
    questions: [
      { prompt: 'CPU stands for:', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Control Processing Unit'], correct: 0, difficulty: 'EASY', explanation: 'The CPU executes instructions and performs arithmetic and logic operations.' },
      { prompt: 'Which of these is volatile memory?', options: ['ROM', 'RAM', 'SSD', 'Hard disk'], correct: 1, difficulty: 'EASY', explanation: 'RAM loses its contents when power is removed; ROM and storage devices retain data.' },
      { prompt: 'How many bits are in one byte?', options: ['4', '8', '16', '32'], correct: 1, difficulty: 'EASY', explanation: 'One byte = 8 bits, enough to represent 256 distinct values.' },
      { prompt: 'Which port does HTTPS use by default?', options: ['21', '25', '80', '443'], correct: 3, difficulty: 'MEDIUM', explanation: 'HTTPS uses TCP port 443; unencrypted HTTP uses port 80.' },
      { prompt: 'Which of the following is an operating system?', options: ['Oracle', 'Linux', 'Chrome', 'Python'], correct: 1, difficulty: 'EASY', explanation: 'Linux is an operating system kernel with distributions such as Ubuntu and Debian. Oracle is a database, Chrome a browser, Python a language.' },
      { prompt: 'In binary, the decimal number 5 is written as:', options: ['100', '101', '110', '111'], correct: 1, difficulty: 'MEDIUM', explanation: '5 = 4 + 1, so the bits are 101.' },
    ],
  },
  {
    title: 'Geopolitics and International Organizations Quiz',
    slug: 'geopolitics-international-organizations-quiz',
    kind: 'QUIZ',
    category: 'world-geopolitics',
    course: 'foundations-of-geopolitics',
    minutes: 10,
    description: 'Core concepts from the geopolitics course: power, chokepoints, alliances and institutions.',
    questions: [
      { prompt: 'A narrow sea passage through which a large share of trade must move is called:', options: ['an isthmus', 'a chokepoint', 'a strait basin', 'an exclusive zone'], correct: 1, difficulty: 'MEDIUM', explanation: 'Chokepoints such as the Strait of Hormuz, the Suez Canal and the Strait of Malacca concentrate trade and therefore strategic attention.' },
      { prompt: '"Soft power", a term developed by Joseph Nye, refers to:', options: ['economic sanctions', 'military deterrence', 'attraction through culture, values and legitimate policy', 'cyber capability'], correct: 2, difficulty: 'MEDIUM', explanation: 'Soft power co-opts rather than coerces; hard power uses military and economic pressure.' },
      { prompt: 'Which body of the United Nations can adopt binding resolutions and authorise sanctions?', options: ['The General Assembly', 'The Security Council', 'The International Court of Justice', 'The Secretariat'], correct: 1, difficulty: 'MEDIUM', explanation: 'The Security Council can adopt binding measures under the UN Charter; General Assembly resolutions are generally recommendations.' },
      { prompt: 'NATO is best described as:', options: ['a trade bloc', 'a collective defence alliance', 'a development bank', 'an electoral observation body'], correct: 1, difficulty: 'EASY', explanation: 'NATO is a military alliance whose founding treaty commits members to collective defence.' },
      { prompt: 'A "hegemon" in international relations is:', options: ['a neutral mediator', 'a landlocked state', 'a predominantly powerful state shaping the system', 'a regional organisation'], correct: 2, difficulty: 'HARD', explanation: 'Hegemony describes a concentration of capability sufficient to set the rules of the system.' },
      { prompt: 'The "resource curse" observation suggests that some resource-rich countries:', options: ['always grow fastest', 'may grow more slowly and govern less accountably than expected', 'cannot export resources', 'are exempt from price volatility'], correct: 1, difficulty: 'HARD', explanation: 'It describes a tendency with important exceptions — institutions and policy choices mediate the effect of resource wealth.' },
    ],
  },
  {
    title: 'বাংলা ভাষা ও সাহিত্য কুইজ',
    slug: 'bangla-language-literature-quiz',
    kind: 'MCQ',
    category: 'job-bangla',
    minutes: 6,
    description: 'বাংলা ভাষা, সাহিত্য ও সংস্কৃতি বিষয়ক সংক্ষিপ্ত বহুনির্বাচনী পরীক্ষা।',
    questions: [
      { prompt: 'বাংলাদেশের জাতীয় কবি কে?', options: ['রবীন্দ্রনাথ ঠাকুর', 'কাজী নজরুল ইসলাম', 'জীবনানন্দ দাশ', 'মাইকেল মধুসূদন দত্ত'], correct: 1, difficulty: 'EASY', explanation: 'কাজী নজরুল ইসলাম বাংলাদেশের জাতীয় কবি হিসেবে স্বীকৃত।' },
      { prompt: 'বাংলাদেশের জাতীয় ফুল কোনটি?', options: ['গোলাপ', 'শাপলা', 'বেলি', 'সূর্যমুখী'], correct: 1, difficulty: 'EASY', explanation: 'শাপলা (water lily) বাংলাদেশের জাতীয় ফুল।' },
      { prompt: 'ভাষা আন্দোলনের শহীদদের স্মরণে কোন দিনটি আন্তর্জাতিক মাতৃভাষা দিবস হিসেবে পালিত হয়?', options: ['১৬ ডিসেম্বর', '২৬ মার্চ', '২১ ফেব্রুয়ারি', '১৪ এপ্রিল'], correct: 2, difficulty: 'MEDIUM', explanation: '১৯৫২ সালের ২১ ফেব্রুয়ারির ঘটনার স্মরণে ইউনেস্কো ২১ ফেব্রুয়ারিকে আন্তর্জাতিক মাতৃভাষা দিবস ঘোষণা করে।' },
      { prompt: '"পদ্মা নদীর মাঝি" উপন্যাসের রচয়িতা কে?', options: ['শরৎচন্দ্র চট্টোপাধ্যায়', 'মানিক বন্দ্যোপাধ্যায়', 'তারাশঙ্কর বন্দ্যোপাধ্যায়', 'বিভূতিভূষণ বন্দ্যোপাধ্যায়'], correct: 1, difficulty: 'MEDIUM', explanation: 'মানিক বন্দ্যোপাধ্যায় ১৯৩৬ সালে "পদ্মা নদীর মাঝি" উপন্যাসটি রচনা করেন।' },
      { prompt: '"অগ্নিবীণা" কাব্যগ্রন্থের রচয়িতা কে?', options: ['কাজী নজরুল ইসলাম', 'রবীন্দ্রনাথ ঠাকুর', 'সুকান্ত ভট্টাচার্য', 'জসীমউদ্দীন'], correct: 0, difficulty: 'MEDIUM', explanation: 'কাজী নজরুল ইসলামের প্রথম কাব্যগ্রন্থ "অগ্নিবীণা" ১৯২২ সালে প্রকাশিত হয়।' },
    ],
  },
];
