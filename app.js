(function () {
  'use strict';
  const root=document.getElementById('neelo-demo');
  const data=JSON.parse(document.getElementById('neelo-demo-data').textContent);
  const main=document.getElementById('neelo-demo-main');
  const review=document.getElementById('neelo-review-content');
  const qById=Object.fromEntries(data.questions.map(q=>[q.id,q]));
  const validAnswer=(qid,aid)=>qById[qid]&&qById[qid].answers.some(a=>a.id===aid);
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const storageKey='neelo-recommendations-simple-v2';
  const defaults=()=>({screen:'choose',category:null,step:0,answers:{},draft:{},doneGroups:[],completed:[],showReview:false});
  function sanitize(input){
    const s=defaults();if(!input||typeof input!=='object')return s;
    for(const key of ['answers','draft'])for(const [qid,aid] of Object.entries(input[key]||{}))if(validAnswer(qid,aid))s[key][qid]=aid;
    s.category=data.categories.some(c=>c.id===input.category)?input.category:null;
    s.doneGroups=data.categories.filter(c=>Array.isArray(input.doneGroups)&&input.doneGroups.includes(c.id)&&c.questions.every(id=>validAnswer(id,s.answers[id]))).map(c=>c.id);
    s.completed=data.modules.filter(m=>Array.isArray(input.completed)&&input.completed.includes(m.id)).map(m=>m.id);
    s.screen=['choose','questions','dashboard','recommendations'].includes(input.screen)?input.screen:'choose';
    const cat=data.categories.find(c=>c.id===s.category);
    s.step=cat?Math.min(Math.max(Number.isInteger(input.step)?input.step:0,0),cat.questions.length-1):0;
    if(s.screen==='questions'&&!cat)s.screen='choose';
    if(['dashboard','recommendations'].includes(s.screen)&&!s.doneGroups.length)s.screen='choose';
    s.showReview=input.showReview===true;
    if(s.screen==='choose'){s.category=null;s.draft={};s.step=0;}
    return s;
  }
  function getNeeds(answers,doneGroups){
    const flagged=new Set();
    const allowed=new Set(data.categories.filter(c=>doneGroups.includes(c.id)).flatMap(c=>c.questions));
    for(const [qid,aid] of Object.entries(answers)){
      if(!allowed.has(qid)||!validAnswer(qid,aid))continue;
      const a=qById[qid].answers.find(a=>a.id===aid);
      if(a.signal===1)a.skills.forEach(id=>flagged.add(id));
    }
    return {flagged};
  }
  function rankModules(needs,completed){
    return data.modules.map(m=>{
      const mainMatches=m.main.filter(id=>needs.flagged.has(id));
      const supportMatches=m.support.filter(id=>needs.flagged.has(id));
      const score=mainMatches.length*3+supportMatches.length;
      return {...m,mainMatches,supportMatches,score,eligible:mainMatches.length>0,completed:completed.includes(m.id)};
    }).sort((a,b)=>b.score-a.score||b.mainMatches.length-a.mainMatches.length||a.id.localeCompare(b.id));
  }
  let saved;try{saved=JSON.parse(localStorage.getItem(storageKey));}catch(_){}
  let state=sanitize(saved);
  function persist(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch(_){}}
  const button=(label,action,value,primary)=>'<button type="button" class="nd-button'+(primary?' nd-primary':'')+'" data-action="'+action+'"'+(value?' data-value="'+escape(value)+'"':'')+'>'+escape(label)+'</button>';
  const category=()=>data.categories.find(c=>c.id===state.category);
  const worldFor={M01:1,M02:1,M03:2,M04:2,M05:2,M06:3,M07:3,M08:3,M09:4,M10:4,M11:4,M12:5,M13:5,M14:1};
  const moduleImage=(m,css)=>'<img class="'+css+'" src="images/w'+worldFor[m.id]+'.jpg" alt="">';
  function explanation(m){return 'This helps with '+(m.mainMatches.length?m.mainMatches:m.supportMatches).slice(0,2).map(id=>data.skills[id].label.toLowerCase()).join(' and ')+'.';}
  const progress=(value,total)=>'<div class="nd-progress" role="progressbar" aria-label="Questionnaire progress" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+value+'"><span style="width:'+value/total*100+'%"></span></div>';
  const resultsNav=()=>'<nav class="nd-nav nd-results-nav" aria-label="Results"><button type="button" data-screen="recommendations">Recommendations</button><button type="button" data-screen="dashboard">Dashboard</button></nav>';
  function chooseView(){
    return '<div class="nd-question-layout"><div class="nd-question-meta">'+progress(0,1)+'</div><section><h1>What would you like to help your child with?</h1><fieldset><legend>Choose one area.</legend>'+data.categories.map(c=>'<label class="nd-answer"><input type="radio" name="neelo-category" value="'+escape(c.id)+'"'+(state.category===c.id?' checked':'')+'><span><strong>'+escape(c.id)+'</strong><span class="nd-choice-description">'+escape(c.description)+'</span><span class="nd-choice-count">'+c.questions.length+' questions</span></span></label>').join('')+'</fieldset><div class="nd-actions"><button type="button" class="nd-button nd-primary" id="neelo-start" data-action="start"'+(!state.category?' disabled':'')+'>Continue</button></div></section></div>';
  }
  function questionView(){
    const cat=category(),q=qById[cat.questions[state.step]],chosen=state.draft[q.id];
    return '<div class="nd-question-layout"><aside class="nd-question-meta"><p>'+escape(cat.id)+'</p><p class="nd-small">Step '+(state.step+2)+' of '+(cat.questions.length+1)+'</p>'+progress(state.step+1,cat.questions.length+1)+'</aside><section><h1>'+escape(q.text)+'</h1><fieldset><legend>Choose the answer that fits best.</legend>'+q.answers.map(a=>'<label class="nd-answer"><input type="radio" name="neelo-answer" value="'+a.id+'" data-question="'+q.id+'"'+(chosen===a.id?' checked':'')+'><span>'+escape(a.text)+'</span></label>').join('')+'</fieldset><div class="nd-actions">'+button('Back','back',null,false)+'<button type="button" class="nd-button nd-primary" id="neelo-next" data-action="next"'+(!chosen?' disabled':'')+'>'+(state.step===cat.questions.length-1?'See recommendations':'Next question')+'</button></div></section></div>';
  }
  function moduleRow(m,index){return '<article class="nd-module-row">'+moduleImage(m,'nd-thumb')+'<div class="nd-module-copy">'+(index===0?'<span class="nd-status">Suggested starting point</span>':'')+'<h2>'+escape(m.title)+'</h2><p>'+escape(explanation(m))+'</p></div></article>';}
  function emptyView(finished){return '<div class="nd-empty"><h2>'+(finished.length?'You have completed your current recommendations.':'No modules were matched from these answers.')+'</h2><p>Use Update preferences to find new recommendations.</p></div>';}
  function resultsView(ranked){
    const active=ranked.filter(m=>m.eligible&&!m.completed),finished=ranked.filter(m=>m.eligible&&m.completed);
    return resultsNav()+'<h1>Your recommended modules</h1><p class="nd-secondary">Based on your answers.</p>'+(active.length?active.map((m,i)=>moduleRow(m,i)).join(''):emptyView(finished));
  }
  function dashboardView(ranked){
    const active=ranked.filter(m=>m.eligible&&!m.completed),finished=ranked.filter(m=>m.eligible&&m.completed),next=active[0];
    return resultsNav()+'<h1>A great next step</h1>'+(next?'<article class="nd-next">'+moduleImage(next,'nd-next-image')+'<div class="nd-next-copy"><h2>'+escape(next.title)+'</h2><p>'+escape(explanation(next))+'</p><div class="nd-module-actions">'+button('Open module','placeholder',next.id,true)+'<button type="button" class="nd-inline-link" data-screen="recommendations">More recommendations</button></div></div></article>':emptyView(finished));
  }
  function renderReview(needs,ranked){
    const toggle=document.getElementById('neelo-review-toggle');toggle.textContent=state.showReview?'Hide the calculation':'Show how this was calculated';toggle.setAttribute('aria-expanded',String(state.showReview));review.hidden=!state.showReview;
    if(!state.showReview){review.innerHTML='';return;}
    const skills=[...needs.flagged].sort();
    const rows=ranked.map(m=>{
      const ids=[...new Set([...m.main,...m.support,...skills])].sort();
      const details=ids.map(id=>{const answer=needs.flagged.has(id)?1:0,weight=m.main.includes(id)?3:m.support.includes(id)?1:0;return '<tr><td>'+escape(data.skills[id].label)+'</td><td class="nd-number">'+answer+'</td><td class="nd-number">'+weight+'</td><td class="nd-number">'+answer*weight+'</td></tr>';}).join('');
      return '<tr><td><details><summary>'+escape(m.title)+'</summary><div class="nd-table-wrap"><table><thead><tr><th>Skill</th><th>Answer value</th><th>Module weight</th><th>Points</th></tr></thead><tbody>'+details+'</tbody><tfoot><tr><th colspan="3">Total</th><th class="nd-number">'+m.score+'</th></tr></tfoot></table></div></details></td><td class="nd-number">'+m.score+'</td><td>'+(!m.score?'No match':!m.eligible?'Supporting match only':m.completed?'Completed':'Recommended')+'</td></tr>';
    }).join('');
    review.innerHTML='<h2>How the points work</h2><p>Only answers that identify a skill to practice add points. Each skill counts once. A main match adds 3 points; a supporting match adds 1.</p><h2>Skills to practice</h2>'+(skills.length?'<ul>'+skills.map(id=>'<li>'+escape(data.skills[id].label)+'</li>').join('')+'</ul>':'<p>No skills were identified from completed question groups.</p>')+'<h2>Module scores</h2><div class="nd-table-wrap"><table><thead><tr><th>Module</th><th class="nd-number">Total points</th><th>Result</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }
  function render(focusQuestion){
    const focusId=document.activeElement&&document.activeElement.id;
    const needs=getNeeds(state.answers,state.doneGroups),ranked=rankModules(needs,state.completed);
    main.innerHTML=state.screen==='choose'?chooseView():state.screen==='questions'?questionView():state.screen==='dashboard'?dashboardView(ranked):resultsView(ranked);
    root.querySelectorAll('[data-screen]').forEach(btn=>{if(btn.dataset.screen===state.screen)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');});
    const hasResults=['dashboard','recommendations'].includes(state.screen)&&state.doneGroups.length>0;
    document.getElementById('neelo-preferences').hidden=!hasResults;
    document.getElementById('neelo-review-tools').hidden=!hasResults;
    renderReview(needs,ranked);
    document.getElementById('neelo-demo-status').textContent=state.screen==='questions'?'Step '+(state.step+2)+' of '+(category().questions.length+1):state.screen==='choose'?'Choose an area':state.screen==='dashboard'?'A great next step':'Your recommendations';
    if(focusQuestion){const input=main.querySelector('input:checked')||main.querySelector('input');if(input)input.focus();}
    else if(focusId){const element=document.getElementById(focusId);if(element)element.focus();}
  }
  root.addEventListener('change',event=>{
    const input=event.target;
    if(input.matches('input[name="neelo-category"]')){state.category=input.value;document.getElementById('neelo-start').disabled=false;}
    else if(input.matches('input[name="neelo-answer"]')){state.draft[input.dataset.question]=input.value;document.getElementById('neelo-next').disabled=false;}
    persist();
  });
  root.addEventListener('click',event=>{
    const target=event.target.closest('button');if(!target||target.disabled)return;
    if(target.id==='neelo-review-toggle'){state.showReview=!state.showReview;persist();render();return;}
    if(target.dataset.screen){state.screen=target.dataset.screen;persist();render();return;}
    const action=target.dataset.action,value=target.dataset.value;let focusQuestion=false;
    if(action==='reset'){state=defaults();}
    else if(action==='placeholder')return;
    else if(action==='start'){
      const cat=category();if(!cat)return;state.step=0;state.draft={};state.screen='questions';focusQuestion=true;
    }else if(action==='back'){if(state.step){state.step--;focusQuestion=true;}else{state.screen='choose';state.category=null;state.draft={};}}
    else if(action==='next'){
      const cat=category();if(!validAnswer(cat.questions[state.step],state.draft[cat.questions[state.step]]))return;
      if(state.step<cat.questions.length-1){state.step++;focusQuestion=true;}else{
        if(!cat.questions.every(id=>validAnswer(id,state.draft[id])))return;
        cat.questions.forEach(id=>{state.answers[id]=state.draft[id];});if(!state.doneGroups.includes(cat.id))state.doneGroups.push(cat.id);state.screen='recommendations';
      }
    }else if(['choose','dashboard','recommendations'].includes(action))state.screen=action;
    else return;
    persist();render(focusQuestion);
  });
  render();
  if(typeof module!=='undefined'&&module.exports)module.exports={getNeeds,rankModules,sanitize,data};
})();
