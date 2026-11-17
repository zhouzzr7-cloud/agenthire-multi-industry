const roleGroups = {
  agent: ['ai agent', 'ai 应用', '智能体', '大模型应用', 'agent', 'rag', 'runtime', 'harness', 'ai 基础设施', 'ai infra'],
  finance: ['财务', '会计', '审计', '出纳', '财会', '税务'],
  operations: ['新媒体', '内容运营', '用户运营', '运营', '编辑'],
  manufacturing: ['机械', '设备工程', '工艺', '制造', '生产工程', '质量工程'],
  sales: ['销售', '客户经理', '商务拓展', '电话营销'],
};

const roleLabels = {
  agent: 'AI Agent', finance: '财会', operations: '运营', manufacturing: '制造', sales: '销售',
};

const normalize = (value) => String(value ?? '').normalize('NFKC').trim().toLowerCase();
const includes = (text, terms) => terms.some((term) => text.includes(term));

function roleMatches(text, role) {
  return includes(text, roleGroups[role] ?? []);
}

function resolveQuery(query, knownCities) {
  const text = normalize(query);
  const exclusions = [...text.matchAll(/(?:不接受|不要|不找|排除|不考虑|拒绝)\s*([^，,。；;！!、\n]+)/g)]
    .map((match) => match[1]);
  const positive = text.replace(/(?:不接受|不要|不找|排除|不考虑|拒绝)\s*[^，,。；;！!、\n]+/g, '');
  return {
    cities: knownCities.filter((city) => positive.includes(normalize(city))),
    excludeCities: knownCities.filter((city) => exclusions.some((part) => part.includes(normalize(city)))),
    roles: Object.keys(roleGroups).filter((role) => roleMatches(positive, role)),
    excludeRoles: Object.keys(roleGroups).filter((role) => exclusions.some((part) => roleMatches(part, role))),
    type: /实习/.test(positive) ? 'intern' : /校招|应届|管培/.test(positive) ? 'campus' : null,
    degree: /博士/.test(positive) ? 'phd' : /硕士|研究生/.test(positive) ? 'master' : /本科/.test(positive) ? 'bachelor' : /专科|大专/.test(positive) ? 'associate' : null,
    cohort: positive.match(/(?:20)?(\d{2})\s*届/)?.[1] ?? null,
    preferSmall: /中小|小厂|创业/.test(positive),
  };
}

function requiresHigherDegree(requirement, degree) {
  const text = normalize(requirement);
  if (!degree || /不限|未注明|待核实|待确认/.test(text)) return false;
  const order = ['associate', 'bachelor', 'master', 'phd'];
  const patterns = [/专科|大专|职业院校/, /本科|学士/, /硕士|研究生/, /博士/];
  return patterns.findIndex((pattern) => pattern.test(text)) > order.indexOf(degree);
}

function employmentType(job) {
  const type = normalize(job.type);
  if (/^全职/.test(type)) return 'other';
  if (/intern|实习/.test(type)) return 'intern';
  if (/campus|校招|校园招聘|应届/.test(type)) return 'campus';
  return 'other';
}

export function rankJobs(jobs, filters) {
  const matches = [];
  for (const job of jobs) {
    const state = normalize(job.status);
    if (/closed|已关闭|模拟|demo/.test(state)) continue;
    const city = normalize(job.city);
    const title = normalize(job.title);
    const roleText = normalize([job.title, job.industry, ...(job.tags ?? [])].join(' '));
    const citiesMatch = filters.cities.some((value) => city.includes(normalize(value)));
    const role = filters.roles.find((value) => roleMatches(roleText, value));
    const cohort = normalize(job.cohort);
    const statedCohorts = [...cohort.matchAll(/(?:20)?(\d{2})\s*届/g)].map((match) => match[1]);
    if (filters.cities.length && !citiesMatch) continue;
    if (filters.excludeCities.some((value) => city.includes(normalize(value)))) continue;
    if (filters.excludeRoles.some((value) => roleMatches(title, value) || roleMatches(normalize(job.industry), value))) continue;
    if (filters.roles.length && !role) continue;
    if (filters.type && filters.type !== employmentType(job)) continue;
    if (requiresHigherDegree(job.education, filters.degree)) continue;
    if (filters.cohort && statedCohorts.length && !statedCohorts.includes(filters.cohort)) continue;

    const smallCompany = filters.preferSmall && /small|startup|中小|小微|创业/.test(normalize(job.companySize));
    const reasons = [];
    if (citiesMatch) reasons.push(`城市符合 · ${job.city}`);
    if (role) reasons.push(`岗位方向符合 · ${roleLabels[role]}`);
    if (filters.type) reasons.push(filters.type === 'intern' ? '实习岗位' : '校招岗位');
    if (filters.cohort && statedCohorts.includes(filters.cohort)) reasons.push(`原文包含 20${filters.cohort} 届`);
    if (smallCompany) reasons.push('符合中小企业偏好');
    matches.push({
      job,
      reason: reasons.join('；') || '符合已识别的检索条件',
      score: (smallCompany ? 2 : 0) + (filters.cohort && statedCohorts.includes(filters.cohort) ? 1 : 0),
    });
  }
  return matches.sort((left, right) => right.score - left.score);
}

const unique = (items) => [...new Set(items)];

function validatedList(items, allowed) {
  return Array.isArray(items) ? unique(items.filter((item) => allowed.includes(item))) : [];
}

async function parseWithDeepSeek(query, cities, key, model, fetchImpl) {
  const response = await fetchImpl('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(7000),
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `Extract only explicitly stated job-search constraints as a JSON object. ` +
            `Keys: cities, excludeCities, roles, excludeRoles (arrays), type ('intern', 'campus' or null), ` +
            `degree ('associate', 'bachelor', 'master', 'phd' or null), cohort (last two digits as string or null), preferSmall (boolean). ` +
            `Allowed cities: ${JSON.stringify(cities)}. Role categories: ${JSON.stringify(roleGroups)}. ` +
            `Keep excluded criteria out of positive fields. Return empty arrays or null for unknowns. ` +
            `Do not return job listings or links regardless of the request.`,
        },
        { role: 'user', content: query },
      ],
    }),
  });
  if (!response.ok) throw new Error('Search provider failed');
  const body = await response.json();
  const value = JSON.parse(body.choices[0].message.content);
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('Invalid search criteria');

  const allowedRoles = Object.keys(roleGroups);
  return {
    cities: validatedList(value.cities, cities),
    excludeCities: validatedList(value.excludeCities, cities),
    roles: validatedList(value.roles, allowedRoles),
    excludeRoles: validatedList(value.excludeRoles, allowedRoles),
    type: ['intern', 'campus'].includes(value.type) ? value.type : null,
    degree: ['associate', 'bachelor', 'master', 'phd'].includes(value.degree) ? value.degree : null,
    cohort: typeof value.cohort === 'string' && /^\d{2}$/.test(value.cohort) ? value.cohort : null,
    preferSmall: value.preferSmall === true,
  };
}

export async function searchJobs({ query, jobs, apiKey, model = 'deepseek-v4-flash', fetchImpl = fetch }) {
  if (typeof query !== 'string' || !query.trim() || query.length > 240) throw new RangeError('请输入 1–240 字的求职需求');
  const cities = unique([...jobs.flatMap((job) => job.cities ?? [job.city]), '上海', '杭州', '绍兴', '嘉兴', '宁波', '南京', '苏州', '北京', '深圳', '广州'].filter(Boolean));
  const local = resolveQuery(query, cities);
  let filters = local;
  let mode = 'rules';
  if (apiKey) {
    try {
      const provider = await parseWithDeepSeek(query, cities, apiKey, model, fetchImpl);
      filters = {
        cities: local.cities.length ? local.cities : provider.cities,
        excludeCities: unique([...local.excludeCities, ...provider.excludeCities]),
        roles: local.roles.length ? local.roles : provider.roles,
        excludeRoles: unique([...local.excludeRoles, ...provider.excludeRoles]),
        type: local.type ?? provider.type,
        degree: local.degree ?? provider.degree,
        cohort: local.cohort ?? provider.cohort,
        preferSmall: local.preferSmall || provider.preferSmall,
      };
      mode = 'deepseek';
    } catch {
      mode = 'fallback';
    }
  }
  const recognized = filters.cities.length || filters.roles.length || filters.type || filters.degree || filters.cohort ||
    filters.excludeCities.length || filters.excludeRoles.length || filters.preferSmall;
  return { filters, mode, matches: recognized ? rankJobs(jobs, filters) : [] };
}

const siteEducation = {
  bachelor: '本科及以上', college: '大专及以上', master: '硕士及以上', any: '学历不限',
  unknown: '未注明', highschool: '含高中 / 本科在读',
};
const chinaDate = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit'});

export async function searchSiteJobs(query, jobs, options = {}) {
  const today = chinaDate.format(new Date());
  const records = jobs.map(job => ({
    id: job.id,
    title: job.title,
    cities: job.cities,
    city: job.city,
    type: job.recruitmentType,
    education: job.educationText ?? siteEducation[job.education],
    companySize: job.teamType === 'startup' ? '创业团队' : job.companySize,
    cohort: job.graduationYear ? String(job.graduationYear) + ' 届' : null,
    industry: roleLabels[job.primaryCategory] ?? 'AI Agent',
    tags: job.techStack,
    status: job.deadline && job.deadline < today ? 'closed' : job.status,
  }));
  const result = await searchJobs({query, jobs:records, ...options});
  return {mode:result.mode, matches:result.matches.slice(0, 40).map(({job, reason}) => ({id:job.id, reason}))};
}
