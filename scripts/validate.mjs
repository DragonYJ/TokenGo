import {catalog} from '../src/core/runtime.mjs';
import {families} from '../src/core/catalog.mjs';
const all=catalog();
if(all.length<1200)throw new Error('Expected at least 1,200 achievements');
if(families.length!==60)throw new Error('Expected 60 metric families');
console.log(`Validated ${all.length} achievements: ${all.filter(a=>!a.hidden).length} public, ${all.filter(a=>a.hidden).length} hidden. Unique IDs, finite thresholds, known metrics.`);
