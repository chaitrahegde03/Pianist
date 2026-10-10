// Tempo belongs to the selected song/lesson, never to a shared form field.
export const PRACTICE_SPEEDS=[50,75,100,125];
export function createTempoState(){
  const speeds=new Map();let context;
  return {
    activate(kind,id,referenceBpm){
      if(!['song','lesson'].includes(kind)||!id||!Number.isFinite(referenceBpm)||referenceBpm<=0)throw new Error('Invalid tempo context');
      context={key:`${kind}:${id}`,kind,referenceBpm};return this.value;
    },
    setSpeed(percent){
      if(!context||!PRACTICE_SPEEDS.includes(percent))throw new Error('Invalid practice speed');
      speeds.set(context.key,percent);return this.value;
    },
    get value(){
      if(!context)throw new Error('Select a tempo context first');
      const percent=speeds.get(context.key)??100;
      return {...context,percent,bpm:context.referenceBpm*percent/100};
    }
  };
}
export function formatBpm(bpm){return Number(bpm.toFixed(1)).toString();}
// Audio and visual playback share this schedule; note gaps stay inside the beat.
export function playbackSchedule(events){
  const origin=events[0].start;
  return events.map(e=>({note:e.note,offset:e.start-origin,duration:e.duration}));
}
