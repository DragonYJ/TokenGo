import {hash} from './engine.mjs';
const toolRules = {
 shell:/exec_command|shell|terminal|bash|write_stdin/, read:/read_file|view_file|cat\s|sed\s|head\s/, write:/write_file|create_file/,
 edit:/apply_patch|edit_file|replace_text/,search:/search|\brg\b|\bgrep\b|find_file/,git:/\bgit\s|\bgh\s|github/,
 test:/\btest\b|pytest|vitest|jest|playwright/,build:/\bbuild\b|compile|tsc\b/,install:/\binstall\b|\badd\b.*package/,
 web:/web__|web\.run|web_search|search_service/,browser:/browser|cua|playwright/,image:/imagegen|image_gen|generate_image|view_image/,
 video:/video|motion/,audio:/audio|speech|tts|transcrib/,document:/document|docx/,spreadsheet:/spreadsheet|excel|csv/,
 presentation:/presentation|slides|pptx/,pdf:/\bpdf\b|pdf__/,design:/figma|design/,diagram:/diagram|mermaid/,
 database:/database|sqlite|postgres|sql\b/,network:/\bcurl\b|\bwget\b|http_request/,deploy:/deploy|hosting/,debug:/debug|trace/,
 agent:/spawn_agent|send_message|followup_task|wait_agent|collaboration/,plan:/plan|goal/,memory:/memory|remember/,
 calendar:/calendar|schedule/,tasks:/task|todo|issue/,communication:/slack|teams|email|dingtalk/,
 cloud:/firebase|aws|cloudflare|azure/,security:/security|audit|vulnerability/,monitoring:/monitor|observability|promctl|logctl|armsctl/,
 filesystem:/file|directory|\bls\b|\bmkdir\b/,notebook:/notebook|jupyter|python/,automation:/automation|cron/
};
export function classifyTool(name,args='') {
  const text=`${name} ${typeof args==='string'?args:JSON.stringify(args)}`.slice(0,100000).toLowerCase();
  return Object.entries(toolRules).filter(([,rule])=>rule.test(text)).map(([key])=>key);
}
export function normalize(record,context) {
  const p=record.payload || {},at=record.timestamp || p.timestamp;
  if(record.type==='session_meta'){
    context.session=String(p.id || p.session_id || context.fileId);
    context.forked=Boolean(p.forked_from_id || p.forked_from || p.parent_thread_id);
    context.started=Date.parse(p.timestamp || at);
    if(context.forked)return [];
    return [{id:hash(`session:${context.session}`),session:context.session,at,kind:'session',project:p.cwd?hash(context.salt+p.cwd):undefined}];
  }
  if(!context.session || context.forked)return [];
  // A copied pre-creation prefix in a fork is never new activity.
  if(Date.parse(at)<context.started)return [];
  const common={session:context.session,at};
  const make=(kind,key,extra={})=>[{...common,kind,id:hash(`${context.session}:${kind}:${key}`),...extra}];
  if(record.type==='turn_context')return make('model',p.turn_id || at,{model:hash(String(p.model || 'unknown'))});
  if(record.type==='compacted')return make('compaction',p.window_id || at);
  if(record.type==='event_msg'){
    if(p.type==='task_started')return make('start',p.turn_id || at);
    if(p.type==='task_complete')return make('complete',p.turn_id || at);
    if(['turn_aborted','task_aborted','approval_requested'].includes(p.type))return make('stop',p.turn_id || at);
    if(p.type==='token_count' && p.info?.total_token_usage)return tokenEvent(p.info.total_token_usage,at);
  }
  if(record.type==='token_usage_record' && p.thread_token_usage)return tokenEvent(p.thread_token_usage,p.response_id || at);
  function tokenEvent(u,key){return make('tokens',key,{totals:{total:u.total_tokens,input:u.input_tokens,output:u.output_tokens,cached:u.cached_input_tokens,reasoning:u.reasoning_output_tokens}});}
  if(record.type==='response_item'){
    if(p.type==='message' && p.role==='user')return make('message',p.id || hash(at+JSON.stringify(p.content)));
    if(['function_call','custom_tool_call'].includes(p.type)){
      const name=String(p.name || 'unknown');
      return make('tool',p.call_id || p.id || hash(at+name+String(p.arguments || p.input || '')),{tool:hash(name),mcp:/mcp__/i.test(name),families:classifyTool(name,p.arguments || p.input || '')});
    }
  }
  return [];
}
