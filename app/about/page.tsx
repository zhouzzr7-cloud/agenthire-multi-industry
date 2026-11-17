import {ArrowLink} from "@/components/shell";

export const metadata = { title: "数据来源与说明" };

export default function About() {
  return <div className="container about">
    <h1>数据来源与说明</h1>
    <p className="about-lead">了解岗位从哪里来、如何核验，以及筛选条件的含义。</p>
    <div className="about-grid">
      <aside><p>AgentHire 汇总计算机与 AI、财会、运营、制造等方向的实习和校招机会。</p></aside>
      <div>
        <section>
          <h2>招聘来源与核验</h2>
          <p>岗位来自企业招聘官网、高校就业平台和公开招聘信息。站内同步会显示最近成功更新时间。通过联网搜索找到的岗位标为外部招聘，投递前请在招聘原页确认资格与在招状态。</p>
          <div className="status-table">
            <div><span>已核验</span><p>检查时已在官方在招列表中找到岗位，或在招聘原页确认了有效申请入口。实际名额以招聘方为准。</p></div>
            <div><span>待核实</span><p>真实招聘来源可查，当前开放状态仍需在招聘原页确认。</p></div>
            <div><span>已关闭</span><p>来源表明招聘已结束，岗位详情会标明关闭状态。</p></div>
            <div><span>DEMO</span><p>演示岗位默认隐藏，可在数据状态筛选中查看。</p></div>
          </div>
        </section>
        <section>
          <h2>筛选与排序</h2>
          <p>岗位方向按招聘标题、职责和任职要求归类，详情页会列出分类依据。本科可投包含最低学历为本科或大专、学历不限及明确接受本科在读的岗位。学历缺失的岗位标为待核实。</p>
          <p>中小与创业团队包含有公开来源支持的创业公司和公开人数在 500 人以内的团队。月薪排序按明确提供的月薪下限排列，日薪与未知薪资排在其后。最近发布筛选只包含有明确发布日期的岗位。</p>
        </section>
        <section>
          <h2>岗位更新</h2>
          <p>站内岗位来自人工整理和定期同步的公开招聘源。同步失败时会保留最近一次可读取的结果。可以在联网刷新设置中按城市和关键词补充外部招聘结果。</p>
        </section>
        <section>
          <h2>收藏保存位置</h2>
          <p>收藏保存在当前浏览器。清除浏览器站点数据也会清除收藏。</p>
          <ArrowLink primary href="/jobs/">探索岗位</ArrowLink>
        </section>
      </div>
    </div>
  </div>;
}
