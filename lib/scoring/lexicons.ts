/**
 * Skill/soft/domain lexicons + matching helpers.
 * Ported VERBATIM from IzdeMe v1 (index.html) — logic byte-for-byte, TS types added.
 * The deterministic core must reproduce v1 exactly (see ARCHITECTURE.md §6).
 */

export const HARD_SKILLS: string[] = ["python","java","javascript","typescript","react","vue","angular","node.js","node",
  "sql","postgresql","mysql","mongodb","nosql","redis","spark","hadoop","airflow","pandas","numpy",
  "pytorch","tensorflow","scikit-learn","machine learning","deep learning","nlp","computer vision",
  "data analysis","data science","etl","tableau","power bi","excel","statistics","docker","kubernetes",
  "aws","gcp","azure","cloud","ci/cd","go","golang","rust","c++","c#",".net","php","ruby","kotlin",
  "swift","flutter","django","flask","fastapi","spring","express","graphql","rest","api","microservices",
  "linux","git","figma","selenium","cypress","seo","google analytics","crm","next.js","keras","opencv",
  "matplotlib","seaborn","bigquery","snowflake","kafka","terraform","jenkins","jira","bash","scala",
  "hive","dbt","langchain","llm","openai","jupyter","html","css","sass","tailwind","bootstrap","webpack",
  "rabbitmq","grpc","oauth","jwt","unit testing","tdd","data visualization","a/b testing","etl"];

export const SOFT_SKILLS: string[] = ["communication","leadership","teamwork","collaboration","problem-solving","problem solving",
  "agile","scrum","stakeholder","cross-functional","adaptability","mentoring","presentation","analytical",
  "creativity","time management","ownership","critical thinking","negotiation","research","attention to detail",
  "decision making","organization","planning","public speaking","fast learner","self-motivated","flexibility",
  "empathy","multitasking","resourcefulness","accountability"];

export const DOMAINS: string[] = ["fintech","ecology","climate","sustainability","banking","e-commerce","healthcare","edtech",
  "marketing","saas","b2b","gaming","logistics","cybersecurity","telecom","insurance","retail","energy"];

export const EDU_KEYS: string[] = ["university","institute","college","bachelor","master","msc","bsc","phd","b.sc","m.sc",
  "nazarbayev","kbtu","diploma","degree","faculty","computer science","data science"];

export const SKILL_ALIASES: Record<string, string> = {"js":"javascript","ts":"typescript","reactjs":"react","react.js":"react",
  "nodejs":"node.js","postgres":"postgresql","psql":"postgresql","k8s":"kubernetes","sklearn":"scikit-learn",
  "scikit":"scikit-learn","tf":"tensorflow","powerbi":"power bi","power-bi":"power bi","restful":"rest",
  "ml":"machine learning","dl":"deep learning","cv2":"computer vision","gcloud":"gcp","nextjs":"next.js",
  "vuejs":"vue","csharp":"c#","c sharp":"c#","dotnet":".net","golang":"go","tailwindcss":"tailwind",
  "k8":"kubernetes","gha":"ci/cd","github actions":"ci/cd","gitlab ci":"ci/cd","tensorflow2":"tensorflow"};

export const LANGUAGES: string[] = ["english","russian","kazakh","turkish","german","french","spanish","chinese","mandarin","arabic","korean","japanese","italian"];

export const ACR: Record<string, string> = {sql:"SQL",aws:"AWS",gcp:"GCP",api:"API",rest:"REST",nlp:"NLP",cv:"CV",qa:"QA",ui:"UI",ux:"UX",
  seo:"SEO",crm:"CRM",b2b:"B2B",saas:"SaaS",ios:"iOS","ci/cd":"CI/CD",php:"PHP","c++":"C++","c#":"C#",
  ".net":".NET","node.js":"Node.js","power bi":"Power BI",msc:"MSc",bsc:"BSc",etl:"ETL",
  javascript:"JavaScript",typescript:"TypeScript",postgresql:"PostgreSQL",mysql:"MySQL",mongodb:"MongoDB",
  nosql:"NoSQL",numpy:"NumPy",pytorch:"PyTorch",tensorflow:"TensorFlow","scikit-learn":"scikit-learn",
  graphql:"GraphQL",github:"GitHub",opencv:"OpenCV","next.js":"Next.js",html:"HTML",css:"CSS",
  llm:"LLM",devops:"DevOps",jwt:"JWT",oauth:"OAuth",grpc:"gRPC",tdd:"TDD","a/b testing":"A/B Testing",
  bigquery:"BigQuery",openai:"OpenAI","data visualization":"Data Visualization"};

/** Acronym-aware Title Casing (e.g. "sql" → "SQL", "power bi" → "Power BI"). */
export function cap(w: string): string {
  const k = (w || "").toLowerCase();
  if (ACR[k]) return ACR[k];
  return (w || "").split(/(\s+|\/|-)/).map(x => ACR[x.toLowerCase()] || (x.charAt(0).toUpperCase() + x.slice(1))).join("");
}

export function tokenize(s: string): string[] {
  return (s || "").toLowerCase().replace(/[^a-z0-9+#.\s/-]/g, " ").split(/\s+/).filter(Boolean);
}

/** Word-boundary lexicon matcher — returns the canonical lexicon terms present in `text`. */
export function matchLexicon(text: string, lex: string[]): string[] {
  const t = " " + (text || "").toLowerCase() + " ";
  const out = new Set<string>();
  for (const sk of lex) {
    const re = new RegExp("(^|[^a-z0-9])" + sk.replace(/[.+*]/g, "\\$&") + "([^a-z0-9]|$)");
    if (re.test(t)) out.add(sk);
  }
  return [...out];
}
