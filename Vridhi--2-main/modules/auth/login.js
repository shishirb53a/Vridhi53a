(function(){
var f=document.getElementById('lgf');
if(!f||f.querySelector('.lbrand'))return;
var brand=document.createElement('div'),form=document.createElement('div');
brand.className='lbrand';
form.className='lform';
['.lb','.lgb','.lgt','.lgc'].forEach(function(selector){
 var element=f.querySelector(selector);
 if(element)brand.appendChild(element);
});
var legacyArt=brand.querySelector('.lgb');
if(legacyArt)legacyArt.remove();
Array.prototype.slice.call(f.children).forEach(function(element){form.appendChild(element)});
f.appendChild(brand);
f.appendChild(form);
brand.querySelector('.lgt').insertAdjacentHTML('beforebegin',
 '<section class="vr-story" aria-label="Vriddhi introduction">'+
  '<div class="vr-story-visual" id="vr-story-visual">'+
   '<img src="modules/auth/family-story.svg?v='+(window.VR_BUILD_NO||150)+'" alt="A young woman, a child and an older woman sharing a hopeful moment as their savings grow">'+
   '<span class="vr-story-tag">The Vriddhi story</span>'+
   '<span class="vr-story-caption">One plan. Every generation.</span>'+
   '<span class="vr-story-caption" aria-hidden="true">Make room for the goals that matter.</span>'+
   '<span class="vr-story-caption" aria-hidden="true">Grow with confidence, together.</span>'+
  '</div>'+
  '<div class="vr-story-controls">'+
   '<button class="vr-story-toggle" id="vr-story-toggle" type="button" aria-controls="vr-story-visual" aria-pressed="false">'+
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8c0-.6.7-.9 1.2-.6l7.2 5c.5.3.5 1.1 0 1.5l-7.2 5c-.5.3-1.2 0-1.2-.6z"/></svg>'+
    '<span>Play 20-second story</span>'+
   '</button>'+
   '<button class="vr-story-sound" id="vr-story-sound" type="button" aria-label="Story sound, on" aria-pressed="true">'+
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7v6h4l5 4V3L7 7H3Zm11.5-.5a5 5 0 0 1 0 7m2-9a8 8 0 0 1 0 11"/></svg>'+
    '<span>Sound on</span>'+
   '</button>'+
   '<button class="vr-story-voice" id="vr-story-voice" type="button" aria-label="Girl voice narration, on" aria-pressed="true">'+
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8v4h3l4 3V5L6 8H3Zm9-1a4 4 0 0 1 0 6m2-8a7 7 0 0 1 0 10"/></svg>'+
    '<span>Girl voice on</span>'+
   '</button>'+
   '<span class="vr-story-duration">0:20</span>'+
   '<span class="vr-story-progress" aria-hidden="true"><i></i></span>'+
  '</div>'+
  '<p class="vr-story-hint" id="vr-story-status" role="status" aria-live="polite" aria-atomic="true">See how a clearer plan can bring your family’s goals together. Voice and music start when you play the story.</p>'+
 '</section>');
var toggle=document.getElementById('vr-story-toggle');
var soundToggle=document.getElementById('vr-story-sound');
var voiceToggle=document.getElementById('vr-story-voice');
var visual=document.getElementById('vr-story-visual');
var picture=visual.querySelector('img');
var progress=visual.parentNode.querySelector('.vr-story-progress i');
var captions=visual.querySelectorAll('.vr-story-caption');
var label=toggle.querySelector('span');
var soundLabel=soundToggle.querySelector('span');
var voiceLabel=voiceToggle.querySelector('span');
var status=document.getElementById('vr-story-status');
var animations=[];
var progressAnimation=null;
var audioContext=null,soundEnabled=true,soundScheduled=false;
var voiceEnabled=true,voiceElapsed=0,voiceStartedAt=0,voiceTimer=null,activeUtterance=null;
var narration=[
 {at:0,text:"Vriddhi brings your family's financial goals together in one clear plan."},
 {at:6700,text:'Plan ahead for education, important milestones, and the retirement you want.'},
 {at:13400,text:'Track your progress and grow with confidence, together.'}
];
if(!picture.animate||!progress.animate)toggle.parentNode.hidden=true;
if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){
 voiceToggle.hidden=true;
 status.textContent='See how a clearer plan can bring your family’s goals together. Sound starts when you play the story. Voice playback is not supported by this browser.';
}
function soundError(){
 status.textContent='The story will continue without sound. Check your browser audio settings and try again.';
}
function narrationError(){
 status.textContent='The story will continue without narration. Check your browser speech settings and try again.';
}
function storyTime(){
 return progressAnimation&&typeof progressAnimation.currentTime==='number'?progressAnimation.currentTime:0;
}
function voiceNow(){
 return voiceStartedAt?voiceElapsed+performance.now()-voiceStartedAt:voiceElapsed;
}
function preferredVoice(){
 var voices=window.speechSynthesis.getVoices(),female=/female|woman|zira|samantha|jenny|aria|libby|sonia|heera|veena|karen|tessa|serena|ava|sara/i;
 return voices.find(function(voice){return /^en-IN/i.test(voice.lang)&&female.test(voice.name)})||
  voices.find(function(voice){return /^en/i.test(voice.lang)&&female.test(voice.name)})||
  voices.find(function(voice){return /^en-IN/i.test(voice.lang)})||
  voices.find(function(voice){return /^en/i.test(voice.lang)})||null;
}
function stopNarration(preserveTime){
 if(voiceTimer){clearTimeout(voiceTimer);voiceTimer=null}
 if(preserveTime&&voiceStartedAt)voiceElapsed=Math.min(20000,voiceNow());
 voiceStartedAt=0;
 activeUtterance=null;
 if(window.speechSynthesis)window.speechSynthesis.cancel();
}
function scheduleNarration(index){
 if(index>=narration.length||!voiceEnabled||!voiceStartedAt)return;
 var line=narration[index],delay=Math.max(0,line.at-voiceNow());
 voiceTimer=setTimeout(function(){
  voiceTimer=null;
  if(!voiceEnabled||!voiceStartedAt||toggle.getAttribute('aria-pressed')!=='true')return;
  try{
   var utterance=new window.SpeechSynthesisUtterance(line.text),voice=preferredVoice();
   utterance.lang=voice&&voice.lang||'en-IN';
   utterance.rate=.94;
   utterance.pitch=1.12;
   utterance.volume=1;
   if(voice)utterance.voice=voice;
   activeUtterance=utterance;
   utterance.onend=function(){
    if(activeUtterance!==utterance)return;
    activeUtterance=null;
    scheduleNarration(index+1);
   };
   utterance.onerror=function(event){
    if(activeUtterance!==utterance)return;
    activeUtterance=null;
    if(event.error!=='canceled')narrationError();
   };
   window.speechSynthesis.speak(utterance);
  }catch(error){narrationError()}
 },delay);
}
function startNarration(offset){
 if(!voiceEnabled||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
 stopNarration(false);
 voiceElapsed=Math.max(0,Math.min(20000,offset||0));
 voiceStartedAt=window.performance.now();
 var index=narration.findIndex(function(line){return line.at+6500>voiceElapsed});
 if(index>=0)scheduleNarration(index);
}
function playTone(context,frequency,start,duration,volume,type){
 var oscillator=context.createOscillator(),gain=context.createGain();
 oscillator.type=type||'sine';
 oscillator.frequency.setValueAtTime(frequency,start);
 gain.gain.setValueAtTime(.001,start);
 gain.gain.exponentialRampToValueAtTime(volume,start+.08);
 gain.gain.exponentialRampToValueAtTime(.001,start+duration);
 oscillator.connect(gain);
 gain.connect(context.destination);
 oscillator.start(start);
 oscillator.stop(start+duration+.03);
}
function startSound(){
 var AudioContext=window.AudioContext||window.webkitAudioContext;
 if(!AudioContext){soundError();return}
 try{
  if(!audioContext||audioContext.state==='closed')audioContext=new AudioContext();
  if(!soundScheduled){
   var start=audioContext.currentTime+.06;
   var melody=[
    [0,523.25],[1.4,659.25],[2.8,783.99],[4.2,659.25],[5.6,587.33],
    [7,523.25],[8.4,659.25],[9.8,698.46],[11.2,783.99],[12.6,880],
    [14,783.99],[15.4,659.25],[16.8,587.33],[18.2,523.25]
   ];
   melody.forEach(function(note){
    playTone(audioContext,note[1],start+note[0],1.3,.12,'sine');
   });
   [[0,130.81],[5.6,146.83],[11.2,164.81],[16.8,130.81]].forEach(function(note){
    playTone(audioContext,note[1],start+note[0],3.8,.025,'sine');
   });
   soundScheduled=true;
  }
  var resumed=audioContext.resume();
  if(resumed&&resumed.catch)resumed.catch(soundError);
 }catch(error){soundError()}
}
function pauseSound(){
 if(!audioContext||audioContext.state!=='running')return;
 var suspended=audioContext.suspend();
 if(suspended&&suspended.catch)suspended.catch(soundError);
}
soundToggle.addEventListener('click',function(){
 soundEnabled=!soundEnabled;
 soundToggle.setAttribute('aria-pressed',String(soundEnabled));
 soundToggle.setAttribute('aria-label','Story sound, '+(soundEnabled?'on':'off'));
 soundLabel.textContent=soundEnabled?'Sound on':'Sound off';
 if(soundEnabled&&toggle.getAttribute('aria-pressed')==='true')startSound();
 else if(!soundEnabled)pauseSound();
});
voiceToggle.addEventListener('click',function(){
 voiceEnabled=!voiceEnabled;
 voiceToggle.setAttribute('aria-pressed',String(voiceEnabled));
 voiceToggle.setAttribute('aria-label','Girl voice narration, '+(voiceEnabled?'on':'off'));
 voiceLabel.textContent=voiceEnabled?'Voice on':'Voice off';
 if(voiceEnabled&&toggle.getAttribute('aria-pressed')==='true')startNarration(storyTime());
 else if(!voiceEnabled)stopNarration(true);
});
toggle.addEventListener('click',function(){
  var playing=toggle.getAttribute('aria-pressed')!=='true';
  toggle.setAttribute('aria-pressed',String(playing));
  label.textContent=playing?'Pause story':'Resume story';
  if(!picture.animate)return;
  if(!playing){
   animations.forEach(function(animation){animation.pause()});
   pauseSound();
   stopNarration(true);
   return;
  }
  if(animations.length&&animations.every(function(animation){return animation.playState==='finished'})){
   animations.forEach(function(animation){animation.cancel()});
   animations=[];
   soundScheduled=false;
  }
  if(!animations.length){
   animations.push(picture.animate([
    {transform:'scale(1) translateX(0)'},
    {transform:'scale(1.13) translateX(3%)',offset:.33},
    {transform:'scale(1.18) translateX(-6%)',offset:.67},
    {transform:'scale(1) translateX(0)'}
   ],{duration:20000,iterations:1,fill:'forwards'}));
   progressAnimation=progress.animate(
    [{transform:'scaleX(0)'},{transform:'scaleX(1)'}],
    {duration:20000,iterations:1,fill:'forwards'}
   );
   animations.push(progressAnimation);
   Array.prototype.forEach.call(captions,function(caption,index){
    var start=index/3,end=(index+1)/3,fade=.025;
    var frames=[
     {opacity:0,offset:0},
    {opacity:0,offset:Math.max(0,start-fade)},
    {opacity:1,offset:Math.min(1,start+fade)},
     {opacity:1,offset:index===2?1:Math.max(start,end-fade)},
     {opacity:index===2?1:0,offset:end}
    ];
    animations.push(caption.animate(frames,{duration:20000,iterations:1,fill:'forwards'}));
   });
   progressAnimation.onfinish=function(){
    toggle.setAttribute('aria-pressed','false');
    label.textContent='Replay 20-second story';
    pauseSound();
    stopNarration(false);
    voiceElapsed=0;
    soundScheduled=false;
   };
  }
  animations.forEach(function(animation){animation.play()});
  if(soundEnabled)startSound();
  if(voiceEnabled)startNarration(storyTime());
});
})();
