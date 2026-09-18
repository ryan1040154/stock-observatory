import {useEffect,useRef,useState} from 'react';

function reducedMotion(){
 return typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function useCountUp(value:number|null|undefined,duration=800){
 const target=value==null?null:value;
 const [display,setDisplay]=useState<number|null>(target);
 const prev=useRef<number|null>(target);
 const frame=useRef<number|undefined>(undefined);
 useEffect(()=>{
  if(target==null){setDisplay(null);prev.current=null;return;}
  const from=prev.current==null?target:prev.current;
  if(from===target||reducedMotion()){setDisplay(target);prev.current=target;return;}
  const start=performance.now();
  const ease=(t:number)=>1-Math.pow(1-t,3);
  if(frame.current)cancelAnimationFrame(frame.current);
  const tick=(now:number)=>{
   const t=Math.min(1,(now-start)/duration);
   setDisplay(from+(target-from)*ease(t));
   if(t<1)frame.current=requestAnimationFrame(tick);
   else{setDisplay(target);prev.current=target;}
  };
  frame.current=requestAnimationFrame(tick);
  return ()=>{if(frame.current)cancelAnimationFrame(frame.current);};
 },[target,duration]);
 return display;
}

export function AnimatedNumber({value,duration=800,decimals=2,signed:showSign=false,suffix='',prefix=''}:{value:number|null|undefined;duration?:number;decimals?:number;signed?:boolean;suffix?:string;prefix?:string}){
 const display=useCountUp(value,duration);
 if(display==null)return <>—</>;
 const text=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:decimals}).format(display);
 return <>{prefix}{showSign&&display>0?'+':''}{text}{suffix}</>;
}
