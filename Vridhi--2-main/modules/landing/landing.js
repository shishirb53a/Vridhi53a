
/* Shared landing component for the Retirement Planner and Goal Planner first-run pages.
   Pure markup, no storage, no network. The CTA keeps the hook each planner already listens for. */
(function(){
var IC={
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M16 5.5a3 3 0 0 1 0 5.5M18 14a5 5 0 0 1 3 5v1"/>',
 split:'<path d="M12 3v9l6.4 6.4"/><circle cx="12" cy="12" r="9"/>',
 book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5V21"/><path d="M9 8h7"/>',
 chart:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
 plus:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
 trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
 gauge:'<path d="M4 18a9 9 0 1 1 16 0"/><path d="M12 14l4-5"/>',
 lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'
};
function ic(n){return '<svg class="vw-ic" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+IC[n]+'</svg>'}
function chart(c){
 var W=360,H=150,L=8,R=8,T=14,B=26,v=c.v,mx=Math.max.apply(null,v)*1.1,n=v.length,
 X=function(i){return L+i*(W-L-R)/(n-1)},Y=function(x){return T+(H-T-B)*(1-x/mx)},
 p=v.map(function(x,i){return (i?'L':'M')+X(i).toFixed(1)+' '+Y(x).toFixed(1)}).join(' '),
 a=p+' L'+X(n-1).toFixed(1)+' '+(H-B)+' L'+X(0).toFixed(1)+' '+(H-B)+' Z',g='',m='';
 for(var k=0;k<3;k++){var gy=T+(H-T-B)*k/2;g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+gy.toFixed(1)+'" y2="'+gy.toFixed(1)+'" class="vw-grid"/>'}
 c.marks.forEach(function(q){var x=X(q.i),y=Y(v[q.i]);m+='<line x1="'+x.toFixed(1)+'" x2="'+x.toFixed(1)+'" y1="'+y.toFixed(1)+'" y2="'+(H-B)+'" class="vw-mk"/><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" class="vw-dot"/><text x="'+Math.min(W-R-2,Math.max(L+2,x)).toFixed(1)+'" y="'+(H-8)+'" text-anchor="'+(q.i===0?'start':q.i===n-1?'end':'middle')+'" class="vw-ax">'+q.t+'</text>'});
 return '<svg class="vw-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+c.alt+'">'+g+'<path d="'+a+'" class="vw-area"/><path d="'+p+'" class="vw-line"/>'+m+'</svg>'}
function bars(a){return a.map(function(b){return '<li><div class="vw-bl"><span>'+b.l+'</span><b>'+b.v+'</b></div><div class="vw-bt" role="img" aria-label="'+b.l+' '+b.v+'"><i class="'+(b.w?'vw-part':'')+'" style="width:'+b.p+'%"></i></div></li>'}).join('')}
function table(t){return '<div class="vw-tw" tabindex="0" role="region" aria-label="'+t.cap+' (scrolls sideways on small screens)"><table class="vw-tb"><caption class="sr-only">'+t.cap+'</caption><thead><tr>'+t.h.map(function(h,i){return '<th scope="col"'+(i>=t.ra?' class="vw-r"':'')+'>'+h+'</th>'}).join('')+'</tr></thead><tbody>'+t.rows.map(function(r){return '<tr>'+r.map(function(c,i){return (i===0?'<th scope="row">':'<td'+(i>=t.ra?' class="vw-r"':'')+'>')+c+(i===0?'</th>':'</td>')}).join('')+'</tr>'}).join('')+'</tbody></table></div>'}
window.vrWelcome=function(c){
 var h='<div class="vw">';
 h+='<section class="vw-hero" aria-labelledby="vw-h"><div class="vw-copy"><p class="vw-eye">'+c.eye+'</p><h2 id="vw-h">'+c.title+'</h2><p class="vw-lede">'+c.lede+'</p>';
 h+='<button type="button" class="p vw-cta" '+c.cta.a+'>'+c.cta.t+'</button>';
 h+='<ul class="vw-ben">'+c.ben.map(function(b){return '<li>'+ic(b[0])+'<span>'+b[1]+'</span></li>'}).join('')+'</ul></div>';
 h+='<figure class="vw-card vw-snap"><figcaption><span>'+c.snap.t+'</span><em>Sample data</em></figcaption>'+chart(c.snap.c)+'<dl class="vw-kp">'+c.snap.k.map(function(k){return '<div><dt>'+k[0]+'</dt><dd>'+k[1]+'</dd></div>'}).join('')+'</dl></figure></section>';
 h+='<section class="vw-sec" aria-labelledby="vw-hw"><h3 id="vw-hw">How it works</h3><ol class="vw-steps" aria-label="'+c.stepsLabel+'">'+c.steps.map(function(s,i){return '<li><span class="vw-n" aria-hidden="true">'+(i+1)+'</span><div><b>'+ic(s[0])+'<span>'+s[1]+'</span></b><p>'+s[2]+'</p></div></li>'}).join('')+'</ol></section>';
 h+='<section class="vw-sec" aria-labelledby="vw-pv"><div class="vw-sh"><h3 id="vw-pv">'+c.pv.h+'</h3><span class="vw-tag">Sample data, for illustration only</span></div><p class="vw-sub">'+c.pv.sub+'</p><div class="vw-grid3">';
 h+='<div class="vw-card"><h4>'+c.pv.a.t+'</h4><p class="vw-big"><span class="vw-ok">'+c.pv.a.s+'</span></p><dl class="vw-kp vw-kpv">'+c.pv.a.k.map(function(k){return '<div><dt>'+k[0]+'</dt><dd>'+k[1]+'</dd></div>'}).join('')+'</dl></div>';
 h+='<div class="vw-card"><h4>'+c.pv.b.t+'</h4><ul class="vw-bars">'+bars(c.pv.b.b)+'</ul><p class="vw-note">'+c.pv.b.n+'</p></div>';
 h+='<div class="vw-card vw-wide"><h4>'+c.pv.c.t+'</h4>'+table(c.pv.c.tb)+'</div></div>';
 if(c.pv.x)h+='<p class="vw-ex">'+c.pv.x+'</p>';
 h+='</section>';
 h+='<footer class="vw-ft"><p class="vw-priv">'+ic('lock')+'<span>Plans are saved to your firm’s secure database under the adviser login. A copy is also kept in this browser until you sign out.</span></p><p class="vw-fine">Forecasts are estimates, not financial advice.</p></footer></div>';
 return h};
window.VRW_RET={eye:'Retirement Planner',title:'Plan the retirement you want',
 lede:'Answer six quick steps about your family, spending and goals. We turn them into a year-by-year roadmap, so you can see if your money will last and what to change if it will not.',
 cta:{t:'Start Your Retirement Plan',a:'data-fh-open="status"'},
 ben:[['clock','6 quick steps'],['lock','Private to you'],['edit','Edit anytime']],
 snap:{t:'Retirement timeline: age 48 to 74',k:[['Today','Age 48'],['Retire','Age 55'],['Plan ends','Age 74']],
  c:{v:[1.4,1.7,2.1,2.5,2.9,3.2,3.05,2.85,2.6,2.3,2.0,1.6,1.1,0.7,0.4],alt:'Sample line chart of projected corpus rising until retirement at 55 and drawn down gradually until age 74',marks:[{i:0,t:'48'},{i:5,t:'55 Retire'},{i:14,t:'74'}]}},
 stepsLabel:'How the Retirement Planner works',
 steps:[['users','Tell us about your family','Your age, your children and when you want to retire.'],['split','Split your money','Home costs, emergencies, kids and growth each get their own jar.'],['book','Plan college and weddings','Add the big costs so nothing surprises you later.'],['chart','Get your roadmap','See each milestone year by year and what you can spend after it.']],
 pv:{h:'What you will see',sub:'Whether your plan is On Track, how well each goal is funded, and a timeline of milestones with the money you can spend after each one.',
  a:{t:'Retirement readiness',s:'On Track',k:[['Corpus at retirement','₹3.20 Cr'],['Required','₹2.85 Cr'],['Funded','112%']]},
  b:{t:'Goal-wise funding',b:[{l:'Living expenses',v:'112%',p:100},{l:'College fees',v:'100%',p:100},{l:'Weddings',v:'86%',p:86,w:1}],n:'Weddings are partly funded: raise the budget or move the date to close the gap.'},
  c:{t:'Year-by-year projection',tb:{cap:'Sample year-by-year projection',ra:3,h:['Year','Age','Phase','Spending','Corpus at end'],rows:[['2026','48','Earning','₹9.8 L','₹1.62 Cr'],['2030','52','Earning','₹12.1 L','₹2.35 Cr'],['2033','55','Retired','₹14.6 L','₹3.20 Cr'],['2045','67','Retired','₹21.4 L','₹2.30 Cr'],['2052','74','Retired','₹29.0 L','₹0.40 Cr']]}}}};
window.VRW_GOAL={eye:'Goal Planner',title:'Is your retirement on track?',
 lede:'Discover if you&rsquo;re on track to achieve the retirement lifestyle you want. See how your savings can grow, estimate your future retirement income, and find out what you need to do to reach your goal.',
 cta:{t:'Start Your Goal Plan',a:'id="add"'},
 ben:[['clock','About 5 minutes'],['lock','Your data stays private'],['trend','Free forecast']],
 snap:{t:'Projected portfolio value, next 10 years',k:[['Today','₹8.00 L'],['In 10 years','₹18.93 L'],['Goal','₹20.00 L']],
  c:{v:[8.0,8.9,9.6,10.35,11.0,12.28,13.4,14.8,16.2,17.5,18.93],alt:'Sample line chart of a portfolio growing from 8 lakh rupees today to about 19 lakh rupees in 10 years',marks:[{i:0,t:'Today'},{i:5,t:'5 years'},{i:10,t:'10 years'}]}},
 stepsLabel:'How Goal Planner works',
 steps:[['plus','Add your holding','Tap Add holding. Type a name, today&rsquo;s value and the yearly growth you expect.'],['list','Add the rest','Mutual funds, FD, PPF, gold or cash. More holdings give a truer picture.'],['trend','Watch it grow','See what each holding may be worth on the day you retire.'],['gauge','Check your summary','Green means you are ahead of your goal. Red? Move the retirement age or goal and fix it in seconds.']],
 pv:{h:'What you will see',sub:'How your holdings add up against your goal today and on the day you retire, with each holding projected year by year.',
  a:{t:'Goal tracker',s:'Nearly there',k:[['Value in 10 years','₹18.93 L'],['Goal','₹20.00 L'],['Funded','95%']]},
  b:{t:'Goal-wise funding',b:[{l:'Mutual fund',v:'65% of goal',p:65},{l:'PPF',v:'30% of goal',p:30},{l:'Still to fund',v:'5% of goal',p:5,w:1}],n:'Share of the sample goal of ₹20.00 L that each holding is projected to cover.'},
  c:{t:'Projected value by holding',tb:{cap:'Sample projected value by holding',ra:1,h:['When','Mutual fund','PPF','Total'],rows:[['Today','₹5.00 L','₹3.00 L','₹8.00 L'],['3 years','₹6.66 L','₹3.69 L','₹10.35 L'],['5 years','₹8.05 L','₹4.23 L','₹12.28 L'],['10 years','₹12.97 L','₹5.96 L','₹18.93 L']]}},
  x:'<b>Example</b> ₹5,00,000 in a mutual fund growing 10% a year becomes about <b>₹12.97 lakh</b> in 10 years.'}};
})();
