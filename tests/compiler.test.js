import test from 'node:test';
import assert from 'node:assert/strict';
import {compileContentPlan} from '../src/compiler.js';
test('content plan compiles',()=>{const s=compileContentPlan({duration:1,scenes:[{id:'a',start:0,end:1,purpose:'x',semanticRefs:['x'],visualRule:'title-focus',elements:[{type:'text',x:10,y:20,text:'Hi'}]}]});assert.equal(s.duration,1);assert.equal(s.scenes[0].semanticRefs[0],'x')});
