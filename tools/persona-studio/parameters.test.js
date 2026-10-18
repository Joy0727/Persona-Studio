'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const parameters = require('./parameters.js');
const ROOT = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(ROOT,'tools/persona-builder.html'),'utf8');
const embeddedFlow = html.match(/<script type="application\/json" id="flow">([\s\S]*?)<\/script>/)[1];
const flow = JSON.parse(embeddedFlow);

function originalBuilder(overrideFlow) {
  // The production conversion code runs unchanged. Only the page's output DOM is stubbed.
  const nodes = new Map();
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id,{textContent:id==='flow'?(overrideFlow?JSON.stringify(overrideFlow):embeddedFlow):'',value:'',
        addEventListener(){},classList:{add(){},remove(){}}});
      return nodes.get(id);
    }, addEventListener(){}
  };
  const sandbox = {document, window:{}, console, setTimeout};
  vm.runInNewContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],sandbox);
  return sandbox.window.__sueBuilder;
}
const plain = x => JSON.parse(JSON.stringify(x));
function stable(card) { const c=plain(card); delete c.builtAt; return c; }

test('conversion scaffold emits complete v2 cards without private fixtures',()=>{
  const builder=originalBuilder();
  for(const type of ['blank','full']) {
    builder.load(null,type);const card=builder.buildCard();
    assert.equal(card.format,'sue-persona');assert.equal(card.version,2);
    assert.ok(card.items.length);assert.ok(card.screens.length);assert.ok(card.steps.length);
  }
});
test('all 81 behavior combinations preserve directly configured knowledge and original behavior levels',()=>{
  const builder=originalBuilder(), p=parameters.defaults();
  const baseline=plain(parameters.build(p,builder,flow).card);
  for(let risk=0;risk<3;risk++) for(let patience=0;patience<3;patience++)
    for(let detailFind=0;detailFind<3;detailFind++) for(let detailCheck=0;detailCheck<3;detailCheck++) {
      const result=parameters.build({...p,risk,patience,detailFind,detailCheck},builder,flow);
      builder.load(result.answers,'normal');
      const original=builder.buildCard();
      for(const key of ['risk','patience','detailFind','detailCheck']) assert.equal(result.card.tendency[key].level,original.tendency[key].level);
      assert.deepEqual(plain(result.card.items),baseline.items);
      assert.deepEqual(plain(result.card.screens),baseline.screens);
      assert.equal(result.card.persona.calibrated,false);
    }
});
test('each knowledge group directly controls exactly its own items at every level',()=>{
  const builder=originalBuilder(), p=parameters.defaults();
  const baseline=plain(parameters.build(p,builder,flow).card);
  for(const group of parameters.GROUPS) for(let level=0;level<3;level++) {
    const config=parameters.defaults();config.knowledge[group.key]=level;
    const card=plain(parameters.build(config,builder,flow).card);
    const expected=(group.word?['none','everyday','understands']:['none','vague','understands'])[level];
    for(const item of card.items) {
      if(group.ids.includes(item.id)) assert.equal(item.result,expected);
      else assert.deepEqual(item,baseline.items.find(i=>i.id===item.id));
    }
  }
});
test('unknown/familiar settings synchronize items, words, prompt knowledge and step summaries',()=>{
  const builder=originalBuilder(), p=parameters.defaults();
  for(const group of parameters.GROUPS) p.knowledge[group.key]=0;
  const unknown=plain(parameters.build(p,builder,flow).card);
  assert(unknown.items.filter(i=>i.kind!=='habit').every(i=>i.result==='none'));
  assert(unknown.screens.every(s=>s.knowledge.length===0));
  assert(unknown.screens.flatMap(s=>s.words).every(w=>w.shown && w.shown!==w.original && w.level==='none'));
  assert.equal(unknown.steps[0].knowledge,'has unknown items');
  for(const group of parameters.GROUPS) p.knowledge[group.key]=2;
  const known=plain(parameters.build(p,builder,flow).card);
  assert(known.items.filter(i=>i.kind!=='habit').every(i=>i.result==='understands'));
  assert(known.steps.every(s=>s.knowledge==='complete'));
  assert(known.screens.flatMap(s=>s.words).every(w=>w.shown===w.original));
});
test('misunderstandings are explicit, localized and visible in the final word representation',()=>{
  const p=parameters.defaults(), builder=originalBuilder();
  p.overrides.T32={result:'other',gloss:'Alerts go only to project users'};
  const card=plain(parameters.build(p,builder,flow).card);
  assert.equal(card.items.find(i=>i.id==='T32').result,'other');
  const word=card.screens.flatMap(s=>s.words).find(w=>w.id==='T32');
  assert.equal(word.gloss,p.overrides.T32.gloss);assert.equal(word.level,'other');
  assert.equal(word.shown,word.original);
  parameters.setGroup(p,'scope',2);
  assert.equal(p.overrides.T32,undefined);
});
test('estimated vocabulary is not a fabricated word test and does not change technical knowledge',()=>{
  const p=parameters.defaults(), builder=originalBuilder();
  const before=parameters.build(p,builder,flow).card;
  p.vocabSize=7200;p.english='beginner';
  const result=parameters.build(p,builder,flow);
  assert.equal(result.card.persona.lang.vocabSize,7200);
  assert.match(result.card.persona.lang.vocabSource,/not a 50-word test/);
  assert.deepEqual(result.answers.answers.vocab,{});
  assert.deepEqual(plain(before.items),plain(result.card.items));
  assert.deepEqual(plain(before.screens),plain(result.card.screens));
});
test('templates and JSON round-trip; Chinese partial edits preserve unspecified fields',()=>{
  const p=parameters.defaults();
  assert.deepEqual(parameters.fromText(parameters.template(p),p).parameters,p);
  assert.deepEqual(parameters.fromJSON(JSON.stringify(parameters.settings(p))),p);
  const edited=parameters.fromText('风险=低；耐心=高；词汇量=8000；导航入口=熟悉；概念=模糊；完成确认=列表,通知',p).parameters;
  assert.equal(edited.risk,0);assert.equal(edited.patience,2);assert.equal(edited.vocabSize,8000);
  assert.equal(edited.knowledge.navigation,2);assert.equal(edited.knowledge.concepts,1);
  assert.equal(edited.detailCheck,p.detailCheck);assert.deepEqual(edited.confirmBy,['list','external']);
  assert.deepEqual(p,parameters.defaults());
});
test('free-form or invalid input fails atomically rather than guessing',()=>{
  const p=parameters.defaults();
  assert.throws(()=>parameters.fromText('This person has an IT background',p));
  assert.throws(()=>parameters.fromText('Risk=low;bogus=high',p));
  assert.deepEqual(p,parameters.defaults());
  for(const patch of [{risk:3},{name:' '},{vocabSize:0},{vocabSize:NaN},{confirmBy:[]},
    {knowledge:{}},{experiences:{}},{overrides:{T32:{result:'other',gloss:''}}},
    {overrides:{T08:{result:'other',gloss:'wrong concept'}}},{overrides:{T999:{result:'none'}}}])
    assert.throws(()=>parameters.validate({...p,...patch}));
});
test('AI prompt documents the supported contract and does not promise automatic inference',()=>{
  const prompt=parameters.prompt('Careful IT operator with 8000 words',parameters.defaults());
  assert.match(prompt,/Do not infer knowledge from a job title/);
  assert.match(prompt,/version 2/);assert.match(prompt,/T32/);
  assert.match(prompt,/not a measured reconstruction/);
});

test('task situation matches the original builder generation rules at every setting',()=>{
  for(const urgency of ['calm','urgent']) for(const stakes of ['low','high']) {
    const native=originalBuilder({...flow,situation:{urgency,stakes}});
    for(let level=0;level<3;level++){
      const p=parameters.defaults();Object.assign(p,{urgency,stakes,risk:level,patience:level,detailFind:level,detailCheck:level});
      native.load(parameters.toAnswers(p,flow),'normal');
      const expected=native.buildCard();
      const actual=parameters.build(p,originalBuilder(),flow).card;
      for(const key of ['risk','patience','detailFind','detailCheck']) assert.equal(actual.tendency[key].level,expected.tendency[key].level);
      assert.deepEqual(actual.goal.situation,{urgency,stakes});
    }
  }
});

test('human factors migrate legacy settings, validate enums and stay separate from engine decisions',()=>{
  assert.deepEqual(parameters.HUMAN_FACTORS,JSON.parse(fs.readFileSync(path.join(__dirname,'human-factors.json'),'utf8')));
  const p=parameters.defaults();delete p.humanFactors;
  const upgraded=parameters.validate(p);assert.equal(upgraded.humanFactors.vision,'unspecified');
  const original=parameters.build(upgraded,originalBuilder(),flow);
  upgraded.humanFactors.vision='reduced';upgraded.humanFactors.financialRiskJudgment='strong';upgraded.humanFactors.pressureChange='rises_after_setbacks';
  const modified=parameters.build(upgraded,originalBuilder(),flow);
  assert.equal(JSON.stringify(modified.card.tendency),JSON.stringify(original.card.tendency));
  assert.equal(JSON.stringify(modified.card.items),JSON.stringify(original.card.items));
  assert.equal(JSON.stringify(modified.card.screens),JSON.stringify(original.card.screens));
  assert.equal(JSON.stringify(modified.card.goal),JSON.stringify(original.card.goal));
  assert.equal(modified.card.persona.studioFactors.integration,'configuration-only');
  assert.equal(modified.card.persona.studioFactors.values.vision,'reduced');
  assert.deepEqual(parameters.fromJSON(JSON.stringify(parameters.settings(upgraded))),upgraded);
  assert.throws(()=>parameters.validate({...upgraded,humanFactors:{...upgraded.humanFactors,vision:'diagnosis'}}));
});
