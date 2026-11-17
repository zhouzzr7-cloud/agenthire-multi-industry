import { deepEqual, equal, rejects } from 'node:assert/strict';
import { test } from 'node:test';
import { searchJobs, searchSiteJobs } from '../lib/job-search.mjs';
import { handleCareerSearch } from '../worker/career-search.mjs';

// Synthetic fixtures. They do not represent real employers or openings.
const jobs = [
  { id: 'finance-large', title: '财务实习生', city: '绍兴', type: '实习', education: '本科及以上', companySize: '大型' },
  { id: 'finance-small', title: '会计助理实习生', city: '绍兴', type: '日常实习', education: '本科及以上', companySize: '中小企业' },
  { id: 'agent', title: 'AI Agent 开发实习生', city: '上海', type: '实习', education: '本科及以上', cohort: '2027 届' },
  { id: 'agent-other-year', title: 'Agent 开发实习生', city: '上海', type: '实习', education: '本科及以上', cohort: '2026 届' },
  { id: 'operations', title: '新媒体运营实习生', city: '杭州', type: '实习', education: '未注明' },
  { id: 'sales', title: '销售运营实习生', city: '杭州', type: '实习', education: '本科及以上' },
  { id: 'mechanical', title: '机械工艺工程师', city: '嘉兴', type: '校园招聘', education: '本科及以上' },
  { id: 'master-only', title: '机械工艺工程师', city: '嘉兴', type: '校园招聘', education: '硕士及以上' },
  { id: 'closed', title: '会计实习生', city: '绍兴', type: '实习', status: '已关闭' },
  { id: 'demo', title: '会计实习生', city: '绍兴', type: '实习', status: 'DEMO' },
];

const search = (query, options = {}) => searchJobs({ query, jobs, ...options });
const ids = (result) => result.matches.map(({ job }) => job.id);

test('finance search keeps closed and demo records out and ranks smaller companies first', async () => {
  deepEqual(ids(await search('绍兴本科，想找财务实习，优先中小厂')), ['finance-small', 'finance-large']);
});

test('operations excludes sales and preserves unspecified education', async () => {
  const result = await search('杭州，本科，新媒体运营实习，不接受销售岗');
  deepEqual(ids(result), ['operations']);
  equal(result.matches[0].job.education, '未注明');
});

test('manufacturing accepts a list of cities and excludes a higher minimum degree', async () => {
  deepEqual(ids(await search('嘉兴或上海，本科，机械制造校招')), ['mechanical']);
});

test('Agent search respects the requested graduating cohort', async () => {
  deepEqual(ids(await search('2027 届本科，上海，AI Agent 实习')), ['agent']);
});

test('DeepSeek contributes structured criteria and cannot introduce listings or links', async () => {
  const result = await search('想做账务类工作', {
    apiKey: 'test-placeholder',
    fetchImpl: async (url, request) => {
      equal(url, 'https://api.deepseek.com/chat/completions');
      equal(JSON.parse(request.body).response_format.type, 'json_object');
      return Response.json({ choices: [{ message: { content: JSON.stringify({
        roles: ['finance', 'unrecognized'], type: 'intern', jobs: [{ id: 'invented' }],
      }) } }] });
    },
  });
  equal(result.mode, 'deepseek');
  deepEqual(ids(result), ['finance-large', 'finance-small']);
});

test('provider failure falls back to the same deterministic search', async () => {
  const result = await search('绍兴财务实习', {
    apiKey: 'test-placeholder',
    fetchImpl: async () => { throw new Error('Timeout'); },
  });
  equal(result.mode, 'fallback');
  deepEqual(ids(result), ['finance-large', 'finance-small']);
});

test('empty and unrelated queries do not produce arbitrary jobs', async () => {
  await rejects(search('  '), RangeError);
  deepEqual(ids(await search('你好')), []);
});

const careerJob = {
  id:'manufacturing-campus',title:'工艺工程师',primaryCategory:'manufacturing',
  city:'绍兴 / 上海',cities:['绍兴','上海'],recruitmentType:'校园招聘',
  education:'bachelor',graduationYear:2027,techStack:[],status:'unverified',
};

test('site searches use original card IDs and exclude expired jobs', async () => {
  const old = {...careerJob,id:'past',deadline:'2000-01-01'};
  const result = await searchSiteJobs('2027 届本科，上海机械校招',[careerJob,old]);
  deepEqual(result.matches.map(match=>match.id),[careerJob.id]);
});

test('worker validates payloads and searches static jobs when the feed is down', async () => {
  const request = (body) => new Request('https://example.test/api/jobs/search',{method:'POST',body});
  const noFeed = async () => { throw new Error('DB unavailable'); };
  equal((await handleCareerSearch(request('invalid'),{},[],noFeed)).status,400);
  equal((await handleCareerSearch(request('a'.repeat(5000)),{},[],noFeed)).status,400);
  const result = await handleCareerSearch(request(JSON.stringify({query:'绍兴机械校招'})),{},[careerJob],noFeed);
  equal(result.status,200);
  equal(result.data.mode,'rules');
  deepEqual(result.data.matches.map(match=>match.id),[careerJob.id]);
});
